import { NextResponse } from 'next/server';
import { verifySuperAdminSession } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  ASAAS_API_URL,
  getAsaasHeaders,
  parseAsaasResponse,
} from '@/lib/asaas-subscription';
import {
  createInstance,
  getConnectionState,
  setEvolutionWebhook,
} from '@/lib/evolution';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type AutoRepairAction =
  | 'sync_asaas'
  | 'set_whatsapp_webhook'
  | 'create_whatsapp_instance'
  | 'rebuild_knowledge_base'
  | 'flush_chat_queue'
  | 'send_access_link';

const OFFICIAL_WEBHOOK_URL = 'https://www.flowagenda.online/api/webhooks/whatsapp';

export async function POST(req: Request) {
  const auth = await verifySuperAdminSession();
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Não autorizado. Acesso restrito a Super Admins.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const action = body?.action as AutoRepairAction | undefined;
    const lojistaId = body?.lojistaId as string | undefined;

    if (!action) {
      return NextResponse.json({ error: 'Parâmetro "action" é obrigatório.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Ação global: destravar fila de IA (chat_queue)
    if (action === 'flush_chat_queue') {
      const cronSecret = process.env.CRON_SECRET?.trim();
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
        'https://www.flowagenda.online';

      const res = await fetch(`${baseUrl}/api/cron/process-chat-queue`, {
        method: 'GET',
        headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
        signal: AbortSignal.timeout(8000),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { error: payload?.error || `Falha ao acionar fila IA (HTTP ${res.status}).` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action,
        message: 'Processamento da fila de IA disparado com sucesso.',
        details: payload,
      });
    }

    if (!lojistaId) {
      return NextResponse.json(
        { error: 'Parâmetro "lojistaId" é obrigatório para esta ação.' },
        { status: 400 }
      );
    }

    const { data: lojista, error: fetchErr } = await adminClient
      .from('lojistas')
      .select('*')
      .eq('id', lojistaId)
      .single();

    if (fetchErr || !lojista) {
      return NextResponse.json({ error: 'Estabelecimento não encontrado.' }, { status: 404 });
    }

    // 1. sync_asaas: sincroniza status_pagamento a partir das cobranças no Asaas (nunca rebaixa fundador)
    if (action === 'sync_asaas') {
      if (lojista.is_founder === true) {
        if (lojista.status_pagamento !== 'ativo') {
          await adminClient
            .from('lojistas')
            .update({ status_pagamento: 'ativo' })
            .eq('id', lojista.id);
        }
        return NextResponse.json({
          success: true,
          action,
          message: `Conta fundadora "${lojista.nome_estabelecimento}" protegida com status "ativo".`,
          newStatus: 'ativo',
        });
      }

      const asaasApiKey = process.env.ASAAS_API_KEY?.trim();
      if (!asaasApiKey) {
        return NextResponse.json(
          { error: 'Variável ASAAS_API_KEY não configurada.' },
          { status: 500 }
        );
      }

      if (!lojista.asaas_customer_id || String(lojista.asaas_customer_id).startsWith('cus_mock_')) {
        return NextResponse.json(
          { error: 'Este lojista ainda não possui asaas_customer_id válido vinculado.' },
          { status: 400 }
        );
      }

      const res = await fetch(
        `${ASAAS_API_URL}/payments?customer=${encodeURIComponent(lojista.asaas_customer_id)}&limit=10`,
        {
          method: 'GET',
          headers: getAsaasHeaders(asaasApiKey),
          signal: AbortSignal.timeout(4000),
          cache: 'no-store',
        }
      );

      const parsed = await parseAsaasResponse(res, 'sincronizar pagamentos Asaas');
      if (!parsed.ok) {
        return NextResponse.json(
          { error: parsed.error || 'Falha ao consultar pagamentos no Asaas.' },
          { status: 400 }
        );
      }

      const payments: any[] = Array.isArray(parsed.data?.data) ? parsed.data.data : [];
      const hasOverdue = payments.some((p) => p.status === 'OVERDUE');
      const hasConfirmedOrReceived = payments.some(
        (p) => p.status === 'CONFIRMED' || p.status === 'RECEIVED'
      );

      let newStatus = lojista.status_pagamento || 'pendente';
      if (hasOverdue) {
        newStatus = 'inadimplente';
      } else if (hasConfirmedOrReceived) {
        newStatus = 'ativo';
      }

      await adminClient
        .from('lojistas')
        .update({ status_pagamento: newStatus })
        .eq('id', lojista.id);

      return NextResponse.json({
        success: true,
        action,
        newStatus,
        message: `Status de "${lojista.nome_estabelecimento}" sincronizado com o Asaas: "${newStatus}".`,
      });
    }

    // 2. set_whatsapp_webhook: reconfigura apenas URL e eventos do webhook da instância existente
    if (action === 'set_whatsapp_webhook') {
      const instanceName =
        lojista.whatsapp_instance_name ||
        `flowagenda_${String(lojista.slug_subdominio || '').replace(/[^a-zA-Z0-9]/g, '_')}`;

      const webhookRes = await setEvolutionWebhook(instanceName, OFFICIAL_WEBHOOK_URL);
      if (!webhookRes.success) {
        return NextResponse.json(
          { error: webhookRes.error || 'Falha ao reconfigurar webhook na Evolution API v2.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        action,
        message: `Webhook da instância "${instanceName}" reconfigurado para ${OFFICIAL_WEBHOOK_URL}.`,
      });
    }

    // 3. create_whatsapp_instance: cria a instância SOMENTE se ela não existir e configura o webhook oficial
    if (action === 'create_whatsapp_instance') {
      const instanceName =
        lojista.whatsapp_instance_name ||
        `flowagenda_${String(lojista.slug_subdominio || '').replace(/[^a-zA-Z0-9]/g, '_')}`;

      const stateCheck = await getConnectionState(instanceName);
      const alreadyExists =
        stateCheck.success &&
        stateCheck.data &&
        stateCheck.data.state !== 'disconnected';

      if (!alreadyExists) {
        const createRes = await createInstance(instanceName);
        if (!createRes.success) {
          return NextResponse.json(
            { error: createRes.error || 'Falha ao criar instância na Evolution API v2.' },
            { status: 400 }
          );
        }
      }

      await setEvolutionWebhook(instanceName, OFFICIAL_WEBHOOK_URL);

      await adminClient
        .from('lojistas')
        .update({ whatsapp_instance_name: instanceName })
        .eq('id', lojista.id);

      await adminClient
        .from('configuracoes_robo')
        .upsert(
          {
            lojista_id: lojista.id,
            instance_name: instanceName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'lojista_id' }
        );

      return NextResponse.json({
        success: true,
        action,
        message: alreadyExists
          ? `Instância "${instanceName}" já existia; vínculo e webhook oficial sincronizados.`
          : `Instância "${instanceName}" criada na Evolution API v2 com webhook oficial configurado.`,
      });
    }

    // 4. rebuild_knowledge_base: reconstrói automaticamente a knowledge_base a partir dos dados e serviços ativos
    if (action === 'rebuild_knowledge_base') {
      const { data: servicosAtivos } = await adminClient
        .from('servicos')
        .select('nome_servico, preco, duracao_minutos')
        .eq('lojista_id', lojista.id)
        .eq('ativo', true)
        .order('nome_servico', { ascending: true });

      const catalogoTexto =
        servicosAtivos && servicosAtivos.length > 0
          ? servicosAtivos
              .map(
                (s: any) =>
                  `- **${s.nome_servico}**: R$ ${Number(s.preco || 0)
                    .toFixed(2)
                    .replace('.', ',')} (${s.duracao_minutos} min)`
              )
              .join('\n')
          : '- Consultar tabela de serviços e valores no link de agendamento.';

      const onboardingCfg = (lojista.configuracoes as any)?.ai_onboarding || {};
      const nomeEstabelecimento = lojista.nome_estabelecimento || 'Nosso Estabelecimento';
      const businessNiche = lojista.business_niche || onboardingCfg.business_niche || 'Atendimento Local';
      const toneOfVoice =
        onboardingCfg.tone_of_voice || 'Amigável, acolhedor e objetivo';
      const horarioFuncionamento =
        onboardingCfg.horario_funcionamento || 'Segunda a Sábado, das 09h às 19h';
      const toleranciaAtraso =
        onboardingCfg.tolerancia_atraso || '15 minutos de tolerância máxima';
      const regrasCancelamento =
        onboardingCfg.regras_cancelamento ||
        'Cancelamentos ou reagendamentos devem ser avisados com no mínimo 2 horas de antecedência.';
      const formasPagamento =
        onboardingCfg.formas_pagamento || 'Pix, Cartão de Crédito, Débito e Dinheiro';

      const compiledKnowledgeBase = [
        `# Base de Conhecimento Oficial — ${nomeEstabelecimento}`,
        ``,
        `## 1. Perfil e Posicionamento`,
        `- **Estabelecimento:** ${nomeEstabelecimento}`,
        `- **Nicho de Atuação:** ${businessNiche}`,
        `- **Tom de Voz do Agente:** ${toneOfVoice}`,
        ``,
        `## 2. Serviços e Preços`,
        catalogoTexto,
        ``,
        `## 3. Regras de Atendimento e Agenda`,
        `- **Horário de Funcionamento:** ${horarioFuncionamento}`,
        `- **Tolerância de Atraso:** ${toleranciaAtraso}`,
        `- **Política de Cancelamento e Reagendamento:** ${regrasCancelamento}`,
        ``,
        `## 4. Pagamentos e Política de Sinal`,
        `- **Formas de Pagamento Aceitas:** ${formasPagamento}`,
        ``,
        `## 5. Diretrizes de Segurança e Conformidade (LGPD)`,
        `- Atuar exclusivamente na orientação de horários, serviços, preços e dúvidas operacionais do estabelecimento.`,
        `- Nunca solicitar, processar ou armazenar prontuários médicos, anamneses ou dados clínicos sensíveis.`,
      ].join('\n');

      const { error: updateErr } = await adminClient
        .from('lojistas')
        .update({ knowledge_base: compiledKnowledgeBase })
        .eq('id', lojista.id);

      if (updateErr) {
        return NextResponse.json(
          { error: `Erro ao gravar knowledge_base: ${updateErr.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action,
        message: `Base de conhecimento de "${nomeEstabelecimento}" reconstruída com ${servicosAtivos?.length || 0} serviço(s) ativo(s).`,
      });
    }

    // 5. send_access_link: gera link de acesso / redefinição de senha via Supabase Auth admin.generateLink
    if (action === 'send_access_link') {
      let targetEmail: string | null =
        lojista.email || lojista.configuracoes?.responsavel_email || null;

      if (!targetEmail && lojista.user_id) {
        const { data: userData } = await adminClient.auth.admin.getUserById(lojista.user_id);
        targetEmail = userData?.user?.email || null;
      }

      if (!targetEmail) {
        return NextResponse.json(
          { error: 'Nenhum e-mail cadastrado encontrado para este estabelecimento.' },
          { status: 400 }
        );
      }

      const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: targetEmail,
        options: {
          redirectTo: 'https://www.flowagenda.online/dashboard',
        },
      });

      if (linkErr || !linkData?.properties?.action_link) {
        return NextResponse.json(
          { error: linkErr?.message || 'Não foi possível gerar o link de acesso no Supabase Auth.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action,
        email: targetEmail,
        accessLink: linkData.properties.action_link,
        message: `Link de acesso gerado para ${targetEmail}.`,
      });
    }

    return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[AUTO_REPAIR_ERROR]:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno ao executar auto-reparação.' },
      { status: 500 }
    );
  }
}
