import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  AsaasCycle,
  PLANOS_CONFIG,
  processAsaasTenantSubscription,
} from '@/lib/asaas-subscription';
import { createEvolutionInstance } from '@/lib/evolution';

function slugifyName(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function normalizeTierKey(rawTier?: string): 'tier_1' | 'tier_2' | 'tier_3_institucional' {
  const t = (rawTier || 'tier_1').toLowerCase().trim();
  if (t === 'tier-2' || t === 'tier_2') return 'tier_2';
  if (t === 'tier-3' || t === 'tier_3' || t === 'tier_3_institucional') {
    return 'tier_3_institucional';
  }
  return 'tier_1';
}

function normalizeCycleKey(rawCycle?: string): AsaasCycle {
  const c = (rawCycle || 'YEARLY').toUpperCase().trim();
  if (c === 'MONTHLY') return 'MONTHLY';
  if (c === 'SEMIANNUAL' || c === 'SEMIANNUALLY') return 'SEMIANNUALLY';
  return 'YEARLY';
}

const VALID_NICHES = [
  'barbearia',
  'salao_beleza',
  'clinica_estetica',
  'dentista',
  'podologia',
  'psicologia',
  'pet_shop',
  'tatuagem',
];

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRole) {
      return NextResponse.json(
        { error: 'Configuração de banco de dados ausente no servidor.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Dados enviados são inválidos.' }, { status: 400 });
    }

    const nomeEstabelecimento = String(body.nomeEstabelecimento || '').trim();
    const nomeResponsavel = String(body.nomeResponsavel || '').trim();
    const whatsappLimpo = String(body.whatsapp || '').replace(/\D/g, '');
    const emailLimpo = String(body.email || '').trim().toLowerCase();
    const cpfCnpjLimpo = String(body.cpfCnpj || '').replace(/\D/g, '');
    const rawSlug = String(body.slug || body.slugSubdominio || '').trim();
    const businessNiche = VALID_NICHES.includes(body.businessNiche)
      ? body.businessNiche
      : 'barbearia';

    const dbTier = normalizeTierKey(body.tier);
    const selectedCycle = normalizeCycleKey(body.cycle);
    const profissionaisExtras = Math.max(
      0,
      Math.min(20, Math.floor(Number(body.profissionaisExtras) || 0))
    );
    const incluirModuloGmn =
      Boolean(body.incluirModuloGmn) && dbTier !== 'tier_3_institucional';

    if (!nomeEstabelecimento || nomeEstabelecimento.length < 2) {
      return NextResponse.json(
        { error: 'Informe o nome do seu estabelecimento.' },
        { status: 400 }
      );
    }

    if (!nomeResponsavel || nomeResponsavel.length < 2) {
      return NextResponse.json(
        { error: 'Informe o seu nome completo.' },
        { status: 400 }
      );
    }

    if (whatsappLimpo.length < 10) {
      return NextResponse.json(
        { error: 'Informe um número de WhatsApp válido com DDD.' },
        { status: 400 }
      );
    }

    if (!emailLimpo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      return NextResponse.json(
        { error: 'Informe um endereço de e-mail válido.' },
        { status: 400 }
      );
    }

    if (cpfCnpjLimpo.length !== 11 && cpfCnpjLimpo.length !== 14) {
      return NextResponse.json(
        { error: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.' },
        { status: 400 }
      );
    }

    const slugSubdominio = slugifyName(rawSlug || nomeEstabelecimento);
    if (!slugSubdominio || slugSubdominio.length < 3) {
      return NextResponse.json(
        { error: 'Não foi possível gerar um subdomínio válido. Ajuste o nome do estabelecimento.' },
        { status: 400 }
      );
    }

    const reservedSlugs = [
      'app',
      'admin',
      'api',
      'www',
      'auth',
      'login',
      'register',
      'suporte',
      'support',
      'ajuda',
      'help',
      'mail',
      'webmail',
      'blog',
      'status',
      'dashboard',
      'superadmin',
      'checkout',
      'pagamento',
      'webhook',
      'webhooks',
      'dev',
      'staging',
      'teste',
      'flowagenda',
      'demo',
      'p',
      'loja',
      'tenant',
      'home',
    ];
    if (reservedSlugs.includes(slugSubdominio)) {
      return NextResponse.json(
        { error: `O subdomínio "${slugSubdominio}" é reservado pelo sistema. Escolha outro.` },
        { status: 409 }
      );
    }

    // 1. Verificar se o slug já está em uso
    const { data: existingBySlug } = await supabaseAdmin
      .from('lojistas')
      .select('id, slug_subdominio')
      .eq('slug_subdominio', slugSubdominio)
      .maybeSingle();

    if (existingBySlug) {
      return NextResponse.json(
        {
          error: `O subdomínio "${slugSubdominio}.flowagenda.online" já está em uso. Altere o subdomínio desejado.`,
          field: 'slug',
        },
        { status: 409 }
      );
    }

    // 1.b Verificar se o e-mail já está em uso (caso a coluna email ou configuracoes->responsavel_email exista)
    try {
      const { data: existingByEmail } = await supabaseAdmin
        .from('lojistas')
        .select('id')
        .eq('configuracoes->>responsavel_email', emailLimpo)
        .maybeSingle();

      if (existingByEmail) {
        return NextResponse.json(
          {
            error: 'Já existe um estabelecimento cadastrado com este e-mail. Entre no painel ou fale com o suporte.',
            field: 'email',
          },
          { status: 409 }
        );
      }
    } catch {
      // Ignora caso a query JSONB não seja suportada na versão atual do schema
    }

    // 2. Provisionar nome da instância Evolution API v2 (não bloqueante)
    const evolutionInstanceName = `flowagenda_${slugSubdominio.replace(/[^a-zA-Z0-9]/g, '_')}`;
    let evolutionToken = 'mock_evolution_token';
    try {
      const evolutionData = await createEvolutionInstance(evolutionInstanceName);
      if (evolutionData?.token) {
        evolutionToken = evolutionData.token;
      }
    } catch (evoErr: any) {
      console.warn('[Self-Checkout] Aviso ao pré-criar instância Evolution:', evoErr?.message);
    }

    // 3. Criar o lojista no Supabase com status_pagamento: 'pendente' e is_founder: false
    const whatsappComDdi =
      whatsappLimpo.startsWith('55') && whatsappLimpo.length >= 12
        ? whatsappLimpo
        : `55${whatsappLimpo}`;

    const insertData: Record<string, any> = {
      nome_estabelecimento: nomeEstabelecimento,
      slug_subdominio: slugSubdominio,
      tier: dbTier,
      tipo_site: dbTier === 'tier_1' ? 'landing_page' : 'institucional_completo',
      whatsapp_notificacao: whatsappComDdi,
      whatsapp_instance_name: evolutionInstanceName,
      status_pagamento: 'pendente',
      is_founder: false,
      business_niche: businessNiche,
      ticket_medio_padrao: 65,
      use_ai_agent: true,
      ai_credits: 200,
      configuracoes: {
        mostrar_badge_plataforma: dbTier === 'tier_1',
        cor_primaria: '#0F172A',
        cor_secundaria: '#38BDF8',
        favicon_url: null,
        responsavel_nome: nomeResponsavel,
        responsavel_email: emailLimpo,
        cpf_cnpj: cpfCnpjLimpo,
        ciclo_escolhido: selectedCycle,
        upsells: {
          profissionais_extras: profissionaisExtras,
          valor_profissional_extra_mes: 20,
          modulo_gmn_avulso: incluirModuloGmn,
          valor_modulo_gmn: incluirModuloGmn ? 247 : 0,
        },
      },
    };

    let { data: lojista, error: lojistaError } = await supabaseAdmin
      .from('lojistas')
      .insert(insertData)
      .select()
      .single();

    if (lojistaError && lojistaError.message?.includes('ticket_medio_padrao')) {
      delete insertData.ticket_medio_padrao;
      const retry = await supabaseAdmin.from('lojistas').insert(insertData).select().single();
      lojista = retry.data;
      lojistaError = retry.error;
    }

    if (lojistaError && lojistaError.message?.includes('configuracoes')) {
      delete insertData.configuracoes;
      const retry = await supabaseAdmin.from('lojistas').insert(insertData).select().single();
      lojista = retry.data;
      lojistaError = retry.error;
    }

    if (lojistaError || !lojista) {
      console.error('[Self-Checkout] Erro ao inserir lojista no Supabase:', lojistaError);
      return NextResponse.json(
        { error: `Não foi possível criar o cadastro: ${lojistaError?.message || 'Erro interno'}` },
        { status: 500 }
      );
    }

    // Garante status_pagamento = 'pendente' e is_founder = false pós-insert
    await supabaseAdmin
      .from('lojistas')
      .update({
        status_pagamento: 'pendente',
        is_founder: false,
      })
      .eq('id', lojista.id);

    // Provisionar linha em configuracoes_robo
    await supabaseAdmin
      .from('configuracoes_robo')
      .insert({
        lojista_id: lojista.id,
        instance_name: evolutionInstanceName,
        instance_token: evolutionToken,
      })
      .then(({ error }) => {
        if (error) console.warn('[Self-Checkout] Aviso ao criar configuracoes_robo:', error.message);
      });

    // 4. Gerar Cliente + Assinatura Recorrente (+ Taxa de Setup caso Mensal ou Semestral) no Asaas
    const incluirSetup = selectedCycle !== 'YEARLY';
    const subResult = await processAsaasTenantSubscription({
      lojistaId: lojista.id,
      cycle: selectedCycle,
      cpfCnpj: cpfCnpjLimpo,
      email: emailLimpo,
      incluirSetup,
      profissionaisExtras,
      incluirModuloGmn,
    });

    if (!subResult.ok) {
      // Remove o registro órfão caso o Asaas rejeite o CPF/CNPJ para permitir que o visitante corrija e tente de novo com o mesmo slug
      await supabaseAdmin.from('lojistas').delete().eq('id', lojista.id);
      return NextResponse.json(
        {
          error:
            subResult.error ||
            'Não foi possível gerar a fatura no Asaas. Verifique se o CPF/CNPJ informado é válido.',
        },
        { status: subResult.status || 400 }
      );
    }

    const planoInfo = PLANOS_CONFIG[dbTier] || PLANOS_CONFIG.tier_1;
    const targetInvoiceUrl = subResult.invoiceUrl || subResult.setupInvoiceUrl || null;

    return NextResponse.json({
      success: true,
      lojistaId: lojista.id,
      slug: lojista.slug_subdominio,
      planoNome: planoInfo.nome,
      cycle: selectedCycle,
      customerId: subResult.customerId,
      subscriptionId: subResult.subscriptionId,
      invoiceUrl: targetInvoiceUrl,
      setupInvoiceUrl: subResult.setupInvoiceUrl || null,
    });
  } catch (err: any) {
    console.error('[SELF_CHECKOUT_ERROR]:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno ao processar sua assinatura.' },
      { status: 500 }
    );
  }
}
