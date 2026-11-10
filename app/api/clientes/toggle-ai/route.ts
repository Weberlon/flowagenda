import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { extractLastEightDigits } from '@/lib/ai-handoff';

/**
 * ==============================================================================
 * Route Handler REST: POST /api/clientes/toggle-ai
 * Desacoplado de Server Actions para evitar revalidação forçada da árvore RSC
 * quando o Supabase SSR renova cookies de sessão.
 * ==============================================================================
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const clienteId: string | undefined = body?.clienteId;
    const telefoneInput: string | undefined = body?.telefone;

    if (!clienteId && !telefoneInput) {
      return NextResponse.json(
        { success: false, error: 'clienteId é obrigatório.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado.' },
        { status: 401 }
      );
    }

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : (supabase as any);

    // 1. Verificar papel do usuário autenticado
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isSuperAdmin =
      profile?.role === 'super_admin' ||
      profile?.role === 'superadmin' ||
      profile?.role === 'admin';

    // 2. Buscar o cliente no banco
    let cliente: any = null;

    if (clienteId) {
      const { data, error: clienteErr } = await adminClient
        .from('clientes')
        .select('id, nome, telefone, lojista_id, custom_metadata')
        .eq('id', clienteId)
        .maybeSingle();

      if (clienteErr) {
        return NextResponse.json(
          { success: false, error: clienteErr.message },
          { status: 500 }
        );
      }
      cliente = data;
    } else if (telefoneInput) {
      const last8 = extractLastEightDigits(telefoneInput);
      if (last8) {
        const { data: list } = await adminClient
          .from('clientes')
          .select('id, nome, telefone, lojista_id, custom_metadata')
          .like('telefone', `%${last8}`)
          .limit(1);
        cliente = list && list.length > 0 ? list[0] : null;
      }
    }

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado.' },
        { status: 404 }
      );
    }

    // 3. Validar permissão (superadmin OU lojista_id do usuário bate com o do cliente)
    if (!isSuperAdmin) {
      const { data: userLojista } = await adminClient
        .from('lojistas')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const userLojistaId = userLojista?.id || (profile as any)?.lojista_id;
      if (!userLojistaId || userLojistaId !== cliente.lojista_id) {
        return NextResponse.json(
          { success: false, error: 'Sem permissão para alterar este cliente.' },
          { status: 403 }
        );
      }
    }

    // 4. Calcular o novo valor de ai_paused_until
    const currentMetadata =
      cliente.custom_metadata && typeof cliente.custom_metadata === 'object'
        ? (cliente.custom_metadata as Record<string, any>)
        : {};

    const rawPausedUntil =
      currentMetadata.ai_paused_until || (cliente as any).ai_paused_until || null;

    const isCurrentlyPaused =
      Boolean(rawPausedUntil) &&
      !isNaN(new Date(rawPausedUntil).getTime()) &&
      new Date(rawPausedUntil).getTime() > Date.now();

    const novoValor = isCurrentlyPaused
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const novoMetadata = {
      ...currentMetadata,
      ai_paused_until: novoValor,
      ai_handoff_updated_at: new Date().toISOString(),
    };

    // 5. Atualizar o registro no Supabase
    const { error: updateErr } = await adminClient
      .from('clientes')
      .update({
        custom_metadata: novoMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cliente.id);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    // 6. Se pausou a IA, cancela eventuais mensagens pendentes na chat_queue para este contato
    if (novoValor && cliente.telefone) {
      const last8 = extractLastEightDigits(cliente.telefone);
      if (last8) {
        await adminClient
          .from('chat_queue')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('lojista_id', cliente.lojista_id)
          .eq('status', 'pending')
          .like('remote_jid', `%${last8}%`);
      }
    }

    return NextResponse.json({
      success: true,
      pausedUntil: novoValor,
      ai_paused_until: novoValor,
      custom_metadata: novoMetadata,
      isPaused: Boolean(novoValor),
      message: novoValor
        ? 'Atendimento assumido! A IA foi pausada por 24h para este contato.'
        : 'Agente de IA reativado para este contato.',
    });
  } catch (error: any) {
    console.error('[POST /api/clientes/toggle-ai] Erro:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erro inesperado ao alternar pausa da IA.',
      },
      { status: 500 }
    );
  }
}

