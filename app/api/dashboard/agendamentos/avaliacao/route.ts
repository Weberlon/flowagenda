import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendGoogleReviewRequest } from '@/lib/google-review-request';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const agendamentoId = typeof body?.agendamentoId === 'string' ? body.agendamentoId.trim() : '';

    if (!agendamentoId) {
      return NextResponse.json(
        { success: false, error: 'ID do agendamento é obrigatório.' },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isSuperAdmin =
      profile?.role === 'super_admin' ||
      profile?.role === 'superadmin' ||
      profile?.role === 'admin';

    const dbClient =
      isSuperAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    let lojistaId: string | null = null;
    if (isSuperAdmin) {
      const cookieStore = await cookies();
      const impersonateId = cookieStore.get('flow_impersonate_tenant_id')?.value;
      if (impersonateId) {
        lojistaId = impersonateId;
      }
    }

    if (!lojistaId) {
      const { data: lojista } = await dbClient
        .from('lojistas')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      lojistaId = lojista?.id || null;
    }

    if (!lojistaId) {
      return NextResponse.json(
        { success: false, error: 'Estabelecimento não encontrado.' },
        { status: 404 }
      );
    }

    const result = await sendGoogleReviewRequest({
      supabase: dbClient,
      lojistaId,
      agendamentoId,
    });

    if (!result.success) {
      const status = result.alreadySent ? 409 : result.blockedByEthics ? 403 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[API Avaliação Google] Erro inesperado:', err?.message || err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao solicitar avaliação no Google.' },
      { status: 500 }
    );
  }
}
