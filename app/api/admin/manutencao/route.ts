import { NextResponse } from 'next/server';
import { verifySuperAdminSession } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { ASAAS_API_URL, getAsaasHeaders } from '@/lib/asaas-subscription';

export const dynamic = 'force-dynamic';

type AcaoManutencao = 'excluir_lojista' | 'zerar_filas' | 'conceder_cortesia';

async function cancelarAssinaturaAsaasSeExistir(
  subscriptionId?: string | null
): Promise<{ executada: boolean; mensagem: string }> {
  if (!subscriptionId) {
    return { executada: false, mensagem: 'Sem assinatura Asaas vinculada.' };
  }

  const apiKey = process.env.ASAAS_API_KEY?.trim();
  if (!apiKey) {
    return {
      executada: false,
      mensagem: 'ASAAS_API_KEY não configurada; cancele manualmente no painel do Asaas se necessário.',
    };
  }

  try {
    const resp = await fetch(`${ASAAS_API_URL}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: getAsaasHeaders(apiKey),
      signal: AbortSignal.timeout(8000),
    });

    if (resp.ok || resp.status === 404) {
      return {
        executada: true,
        mensagem:
          resp.status === 404
            ? 'Assinatura já estava removida no Asaas.'
            : 'Assinatura cancelada no Asaas com sucesso.',
      };
    }

    const texto = await resp.text();
    return {
      executada: false,
      mensagem: `Asaas retornou status ${resp.status} ao cancelar assinatura: ${texto.slice(0, 120)}`,
    };
  } catch (err: any) {
    return {
      executada: false,
      mensagem: `Falha ao contatar Asaas: ${err?.message || 'erro de rede'}.`,
    };
  }
}

export async function POST(request: Request) {
  const auth = await verifySuperAdminSession();
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Não autorizado. Acesso restrito a Super Admins.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisição inválido. Envie um JSON válido.' },
      { status: 400 }
    );
  }

  const acao = body.acao as AcaoManutencao;
  const adminClient = createAdminClient();

  if (acao === 'zerar_filas') {
    const [chatRes, webhookRes] = await Promise.all([
      adminClient.from('chat_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      adminClient
        .from('webhook_eventos_processados')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);

    if (chatRes.error || webhookRes.error) {
      return NextResponse.json(
        {
          error: 'Erro ao limpar filas/logs no Supabase.',
          detalhe: chatRes.error?.message || webhookRes.error?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensagem: 'Filas de mensagens (chat_queue) e eventos de webhook limpos com sucesso.',
    });
  }

  if (acao === 'conceder_cortesia') {
    const lojistaId = typeof body.lojistaId === 'string' ? body.lojistaId.trim() : '';
    const conceder = Boolean(body.conceder);

    if (!lojistaId) {
      return NextResponse.json({ error: 'Selecione um lojista.' }, { status: 400 });
    }

    const { data: lojista, error: fetchErr } = await adminClient
      .from('lojistas')
      .select('id, nome_estabelecimento, slug_subdominio, asaas_subscription_id, is_founder')
      .eq('id', lojistaId)
      .maybeSingle();

    if (fetchErr || !lojista) {
      return NextResponse.json({ error: 'Lojista não encontrado.' }, { status: 404 });
    }

    let notaAsaas = '';
    if (conceder && lojista.asaas_subscription_id) {
      const cancelamento = await cancelarAssinaturaAsaasSeExistir(lojista.asaas_subscription_id);
      notaAsaas = ` (${cancelamento.mensagem})`;
    }

    const updatePayload = conceder
      ? {
          is_founder: true,
          status_pagamento: 'ativo',
          asaas_subscription_id: null,
        }
      : {
          is_founder: false,
          status_pagamento: 'pendente',
        };

    const { error: updErr } = await adminClient
      .from('lojistas')
      .update(updatePayload)
      .eq('id', lojistaId);

    if (updErr) {
      return NextResponse.json(
        { error: 'Não foi possível atualizar o status de cortesia.', detalhe: updErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensagem: conceder
        ? `Cortesia vitalícia (Fundador) ativada para "${lojista.nome_estabelecimento}". Sem cobranças e protegido contra rebaixamento.${notaAsaas}`
        : `Cortesia revogada para "${lojista.nome_estabelecimento}". O status voltou para "pendente" e passará a exigir assinatura ativa.`,
    });
  }

  if (acao === 'excluir_lojista') {
    const idsEntrada = Array.isArray(body.lojistaIds)
      ? body.lojistaIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : typeof body.lojistaId === 'string' && body.lojistaId.trim()
      ? [body.lojistaId.trim()]
      : [];

    if (idsEntrada.length === 0) {
      return NextResponse.json(
        { error: 'Selecione pelo menos um lojista para excluir.' },
        { status: 400 }
      );
    }

    if (body.confirmado !== true) {
      return NextResponse.json(
        { error: 'Marque a confirmação antes de excluir os lojistas selecionados.' },
        { status: 400 }
      );
    }

    const { data: lojistasAlvo, error: fetchErr } = await adminClient
      .from('lojistas')
      .select('id, nome_estabelecimento, slug_subdominio, user_id, asaas_subscription_id')
      .in('id', idsEntrada);

    if (fetchErr) {
      return NextResponse.json(
        { error: `Erro ao consultar lojistas: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    if (!lojistasAlvo || lojistasAlvo.length === 0) {
      return NextResponse.json({ error: 'Nenhum lojista válido encontrado.' }, { status: 404 });
    }

    const excluidos: string[] = [];
    const ignorados: string[] = [];

    for (const lojista of lojistasAlvo) {
      await cancelarAssinaturaAsaasSeExistir(lojista.asaas_subscription_id);

      const { error: delErr } = await adminClient.from('lojistas').delete().eq('id', lojista.id);
      if (delErr) {
        ignorados.push(`${lojista.nome_estabelecimento} (${delErr.message})`);
        continue;
      }

      // Remove o usuário de Auth somente se não for super_admin nem o próprio usuário logado
      const authUserId = lojista.user_id;
      if (authUserId && authUserId !== auth.userId) {
        const { data: profile } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', authUserId)
          .maybeSingle();

        if (
          profile?.role !== 'super_admin' &&
          profile?.role !== 'superadmin' &&
          profile?.role !== 'admin'
        ) {
          await adminClient.auth.admin.deleteUser(authUserId);
        }
      }

      excluidos.push(lojista.nome_estabelecimento);
    }

    if (excluidos.length === 0) {
      return NextResponse.json(
        {
          error:
            ignorados.length > 0
              ? `Nenhum lojista excluído: ${ignorados.join(', ')}.`
              : 'Nenhum lojista pôde ser excluído.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensagem: `Excluído(s) com sucesso: ${excluidos.join(', ')}.${
        ignorados.length > 0 ? ` Ignorados: ${ignorados.join(', ')}.` : ''
      }`,
    });
  }

  return NextResponse.json(
    { error: 'Ação de manutenção desconhecida.' },
    { status: 400 }
  );
}
