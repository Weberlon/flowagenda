import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ASAAS_API_URL = (process.env.ASAAS_API_URL || 'https://api.asaas.com/v3').replace(/\/+$/, '');
const ASAAS_API_KEY = process.env.ASAAS_API_KEY!;

// Tabela de preços alinhada à landing page
const PLANOS_CONFIG: Record<
  string,
  { nome: string; MONTHLY: number; SEMIANNUALLY: number; YEARLY: number }
> = {
  tier_1: {
    nome: 'FlowAgenda Essencial',
    MONTHLY: 59.90,      // Ajuste caso o valor mensal avulso seja diferente
    SEMIANNUALLY: 329.40, // Ajuste conforme sua regra semestral
    YEARLY: 598.80,
  },
  tier_2: {
    nome: 'FlowAgenda Profissional',
    MONTHLY: 99.90,
    SEMIANNUALLY: 549.40,
    YEARLY: 1018.80,
  },
  tier_3: {
    nome: 'FlowAgenda Autoridade',
    MONTHLY: 189.90,
    SEMIANNUALLY: 1049.40,
    YEARLY: 1918.80,
  },
  tier_3_institucional: {
    nome: 'FlowAgenda Autoridade',
    MONTHLY: 189.90,
    SEMIANNUALLY: 1049.40,
    YEARLY: 1918.80,
  },
};

export async function POST(req: Request) {
  try {
    const { lojistaId, cycle = 'YEARLY', cpfCnpj } = await req.json();

    if (!lojistaId) {
      return NextResponse.json({ error: 'ID do lojista é obrigatório.' }, { status: 400 });
    }

    // 1. Buscar dados do lojista no Supabase
    const { data: lojista, error: fetchError } = await supabaseAdmin
      .from('lojistas')
      .select('*')
      .eq('id', lojistaId)
      .single();

    if (fetchError || !lojista) {
      return NextResponse.json({ error: 'Lojista não encontrado.' }, { status: 404 });
    }

    const tierKey = lojista.tier || 'tier_1';
    const plano = PLANOS_CONFIG[tierKey];
    if (!plano) {
      return NextResponse.json({ error: `Tier inválido: ${tierKey}` }, { status: 400 });
    }

    const valorCobranca = plano[cycle as keyof typeof plano] as number;
    let customerId =
      lojista.asaas_customer_id && !String(lojista.asaas_customer_id).startsWith('cus_mock_')
        ? lojista.asaas_customer_id
        : null;

    // 2. Criar cliente no Asaas caso ainda não exista vínculo
    if (!customerId) {
      const documentoLimpo = (cpfCnpj || lojista.cpf_cnpj || '').replace(/\D/g, '');
      if (!documentoLimpo) {
        return NextResponse.json(
          { error: 'CPF/CNPJ obrigatório para cadastrar novo cliente no Asaas.', needsCpfCnpj: true },
          { status: 422 }
        );
      }

      const telefoneLimpo = (lojista.whatsapp_notificacao || lojista.whatsapp || '')
        .replace(/^55/, '')
        .replace(/\D/g, '');

      const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify({
          name: lojista.nome_estabelecimento || lojista.nome_negocio,
          email: lojista.email,
          mobilePhone: telefoneLimpo,
          cpfCnpj: documentoLimpo,
          externalReference: lojista.id,
          notificationDisabled: false,
        }),
      });

      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        return NextResponse.json(
          { error: customerData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas.' },
          { status: 400 }
        );
      }

      customerId = customerData.id;
    }

    // 3. Criar assinatura recorrente no Asaas
    const hoje = new Date().toISOString().split('T')[0]; // Vencimento inicial hoje

    const subRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // Permite Pix, Boleto ou Cartão na invoiceUrl
        value: valorCobranca,
        nextDueDate: hoje,
        cycle: cycle, // 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY'
        description: `Assinatura ${plano.nome} (${cycle}) - ${lojista.nome_estabelecimento}`,
        externalReference: lojista.id,
      }),
    });

    const subData = await subRes.json();
    if (!subRes.ok) {
      return NextResponse.json(
        { error: subData.errors?.[0]?.description || 'Erro ao criar assinatura no Asaas.' },
        { status: 400 }
      );
    }

    // 4. Buscar a primeira cobrança gerada pela assinatura para pegar a invoiceUrl
    const paymentsRes = await fetch(`${ASAAS_API_URL}/subscriptions/${subData.id}/payments`, {
      headers: { access_token: ASAAS_API_KEY },
    });
    const paymentsData = await paymentsRes.json();
    const primeiraCobranca = paymentsData.data?.[0];
    const invoiceUrl = primeiraCobranca?.invoiceUrl || null;

    // 5. Atualizar registro no Supabase
    const { error: updateErr } = await supabaseAdmin
      .from('lojistas')
      .update({
        asaas_customer_id: customerId,
        asaas_subscription_id: subData.id,
        status_pagamento: 'pendente',
      })
      .eq('id', lojista.id);

    if (updateErr && updateErr.message?.includes('column')) {
      await supabaseAdmin
        .from('lojistas')
        .update({
          asaas_customer_id: customerId,
          status_pagamento: 'pendente',
        })
        .eq('id', lojista.id);
    }

    return NextResponse.json({
      success: true,
      customerId,
      subscriptionId: subData.id,
      invoiceUrl,
    });
  } catch (err: any) {
    console.error('[ASAAS_SUBSCRIBE_ERROR]:', err);
    return NextResponse.json({ error: 'Erro interno ao processar assinatura.' }, { status: 500 });
  }
}

