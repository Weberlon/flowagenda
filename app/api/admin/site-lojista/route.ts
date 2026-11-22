import { NextResponse } from 'next/server';
import { verifySuperAdminSession } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  normalizarSlugSite,
  validarSiteBlueprint,
  verificarElegibilidadeSiteLojista,
  type StatusSiteLojista,
} from '@/lib/site-lojista';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await verifySuperAdminSession();
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Não autorizado. Acesso restrito a Super Admins.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const lojistaId = searchParams.get('lojistaId')?.trim();

  const adminClient = createAdminClient();
  let query = adminClient
    .from('sites_lojistas')
    .select('id, lojista_id, slug, status, liberacao_manual, dominio_proprio, blueprint, updated_at');

  if (lojistaId) {
    query = query.eq('lojista_id', lojistaId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        error:
          'Não foi possível consultar a tabela sites_lojistas. Verifique se a migração SQL foi aplicada no Supabase.',
        detalhe: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ sites: data || [] });
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

  const lojistaId = typeof body.lojistaId === 'string' ? body.lojistaId.trim() : '';
  const slugBruto = typeof body.slug === 'string' ? body.slug : '';
  const slug = normalizarSlugSite(slugBruto);
  const status: StatusSiteLojista = body.status === 'publicado' ? 'publicado' : 'rascunho';
  const liberacaoManual = Boolean(body.liberacaoManual);
  const dominioProprio =
    typeof body.dominioProprio === 'string' && body.dominioProprio.trim()
      ? body.dominioProprio.trim().toLowerCase()
      : null;

  if (!lojistaId) {
    return NextResponse.json(
      { error: 'Selecione um lojista válido antes de salvar.' },
      { status: 400 }
    );
  }

  if (!slug || slug.length < 3) {
    return NextResponse.json(
      {
        error:
          'Informe um slug válido com pelo menos 3 caracteres (apenas letras minúsculas, números e hífen).',
      },
      { status: 400 }
    );
  }

  const validacaoBlueprint = validarSiteBlueprint(body.blueprint);
  if (!validacaoBlueprint.valido) {
    return NextResponse.json({ error: validacaoBlueprint.erro }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verifica existência e elegibilidade do lojista sem alterar regras de faturamento
  const { data: lojista, error: lojistaErr } = await adminClient
    .from('lojistas')
    .select('id, nome_estabelecimento, tier, is_founder, status_pagamento')
    .eq('id', lojistaId)
    .maybeSingle();

  if (lojistaErr || !lojista) {
    return NextResponse.json(
      { error: 'Lojista não encontrado no banco de dados.' },
      { status: 404 }
    );
  }

  const elegibilidade = verificarElegibilidadeSiteLojista({
    tier: lojista.tier,
    is_founder: lojista.is_founder,
    status_pagamento: lojista.status_pagamento,
    liberacaoManual,
  });

  if (status === 'publicado' && !elegibilidade.podePublicar) {
    return NextResponse.json(
      {
        error: `Não é possível publicar agora: ${elegibilidade.motivo}`,
      },
      { status: 400 }
    );
  }

  // Garante unicidade do slug entre lojistas diferentes
  const { data: conflitoSlug } = await adminClient
    .from('sites_lojistas')
    .select('id, lojista_id')
    .eq('slug', slug)
    .neq('lojista_id', lojistaId)
    .maybeSingle();

  if (conflitoSlug) {
    return NextResponse.json(
      {
        error: `O slug "${slug}" já está em uso por outro estabelecimento. Escolha outro endereço.`,
      },
      { status: 409 }
    );
  }

  const blueprintFinal = {
    ...validacaoBlueprint.blueprint,
    dominioProprio,
  };

  const { data: salvo, error: saveErr } = await adminClient
    .from('sites_lojistas')
    .upsert(
      {
        lojista_id: lojistaId,
        slug,
        status,
        liberacao_manual: liberacaoManual,
        dominio_proprio: dominioProprio,
        blueprint: blueprintFinal,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'lojista_id' }
    )
    .select('id, lojista_id, slug, status, liberacao_manual, dominio_proprio, blueprint, updated_at')
    .single();

  if (saveErr) {
    return NextResponse.json(
      {
        error: 'Erro ao salvar configuração do site no Supabase.',
        detalhe: saveErr.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    mensagem:
      status === 'publicado'
        ? `Site publicado com sucesso em /p/${slug}.`
        : `Rascunho salvo com sucesso para ${lojista.nome_estabelecimento}.`,
    site: salvo,
  });
}
