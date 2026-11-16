import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ASAAS_API_URL = 'https://api.asaas.com/v3';

export type AsaasCycle = 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY';

export interface PlanoConfigItem {
  nome: string;
  MONTHLY: number;
  SEMIANNUALLY: number;
  YEARLY: number;
  taxaSetup: {
    MONTHLY: number;
    SEMIANNUALLY: number;
    YEARLY: number;
  };
}

// Tabela de preços 100% sincronizada com components/landing/PricingTiers.tsx
export const PLANOS_CONFIG: Record<string, PlanoConfigItem> = {
  tier_1: {
    nome: 'FlowAgenda Essencial',
    MONTHLY: 59.90,
    SEMIANNUALLY: 329.40, // 6x R$ 54,90
    YEARLY: 598.80,       // 12x R$ 49,90
    taxaSetup: {
      MONTHLY: 99.90,
      SEMIANNUALLY: 49.90, // 50% OFF
      YEARLY: 0,           // Setup 100% Grátis no Anual
    },
  },
  tier_2: {
    nome: 'FlowAgenda Profissional',
    MONTHLY: 99.90,
    SEMIANNUALLY: 539.40, // 6x R$ 89,90
    YEARLY: 1018.80,      // 12x R$ 84,90
    taxaSetup: {
      MONTHLY: 149.90,
      SEMIANNUALLY: 74.90, // 50% OFF
      YEARLY: 0,           // Setup 100% Grátis no Anual
    },
  },
  tier_3: {
    nome: 'FlowAgenda Autoridade',
    MONTHLY: 189.90,
    SEMIANNUALLY: 1019.40, // 6x R$ 169,90
    YEARLY: 1918.80,       // 12x R$ 159,90
    taxaSetup: {
      MONTHLY: 349.90,
      SEMIANNUALLY: 174.90, // 50% OFF
      YEARLY: 0,            // Setup 100% Grátis no Anual
    },
  },
  tier_3_institucional: {
    nome: 'FlowAgenda Autoridade',
    MONTHLY: 189.90,
    SEMIANNUALLY: 1019.40, // 6x R$ 169,90
    YEARLY: 1918.80,       // 12x R$ 159,90
    taxaSetup: {
      MONTHLY: 349.90,
      SEMIANNUALLY: 174.90, // 50% OFF
      YEARLY: 0,            // Setup 100% Grátis no Anual
    },
  },
};

async function parseAsaasResponse(
  res: Response,
  stepLabel: string
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const rawText = await res.text();
  try {
    const parsed = rawText ? JSON.parse(rawText) : {};
    if (!res.ok) {
      const apiErrMsg =
        parsed?.errors?.[0]?.description ||
        parsed?.message ||
        `Erro Asaas (${stepLabel} - HTTP ${res.status})`;
      return { ok: false, status: res.status, data: parsed, error: apiErrMsg };
    }
    return { ok: true, status: res.status, data: parsed };
  } catch {
    const snippet = rawText.replace(/\s+/g, ' ').slice(0, 180);
    console.error(`[ASAAS_NON_JSON_RESPONSE] (${stepLabel} - HTTP ${res.status}):`, snippet);
    return {
      ok: false,
      status: res.status || 502,
      error: `Resposta inesperada do Asaas em ${stepLabel} (HTTP ${res.status}): ${snippet}`,
    };
  }
}

export async function POST(req: Request) {
  try {
    const asaasApiKey = process.env.ASAAS_API_KEY?.trim();
    if (!asaasApiKey) {
      return NextResponse.json(
        { error: 'Variável de ambiente ASAAS_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRole) {
      return NextResponse.json(
        { error: 'Credenciais Supabase Admin ausentes no servidor.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

    const body = await req.json();
    const {
      lojistaId,
      cycle = 'YEARLY',
      cpfCnpj,
      incluirSetup = false,
    }: {
      lojistaId?: string;
      cycle?: AsaasCycle;
      cpfCnpj?: string;
      incluirSetup?: boolean;
    } = body;

    if (!lojistaId) {
      return NextResponse.json({ error: 'ID do lojista é obrigatório.' }, { status: 400 });
    }

    const validCycles: AsaasCycle[] = ['MONTHLY', 'SEMIANNUALLY', 'YEARLY'];
    const selectedCycle: AsaasCycle = validCycles.includes(cycle) ? cycle : 'YEARLY';

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

    const valorCobranca = plano[selectedCycle];
    const valorSetup =
      incluirSetup && selectedCycle !== 'YEARLY' ? plano.taxaSetup[selectedCycle] : 0;

    let customerId =
      lojista.asaas_customer_id && !String(lojista.asaas_customer_id).startsWith('cus_mock_')
        ? lojista.asaas_customer_id
        : null;

    const asaasHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'FlowAgenda/1.0',
      'access_token': asaasApiKey,
    };

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
        headers: asaasHeaders,
        body: JSON.stringify({
          name: lojista.nome_estabelecimento || lojista.nome_negocio,
          email: lojista.email || undefined,
          mobilePhone: telefoneLimpo || undefined,
          cpfCnpj: documentoLimpo,
          externalReference: lojista.id,
          notificationDisabled: false,
        }),
      });

      const customerParsed = await parseAsaasResponse(customerRes, 'criar cliente');
      if (!customerParsed.ok) {
        return NextResponse.json(
          { error: customerParsed.error || 'Erro ao criar cliente no Asaas.' },
          { status: 400 }
        );
      }

      customerId = customerParsed.data.id;
    }

    const hoje = new Date().toISOString().split('T')[0]; // Vencimento inicial hoje

    // 3. Se incluirSetup === true e valorSetup > 0, cria cobrança avulsa de Taxa de Implantação (Setup)
    let setupPaymentId: string | null = null;
    let setupInvoiceUrl: string | null = null;

    if (incluirSetup && valorSetup > 0) {
      const setupRes = await fetch(`${ASAAS_API_URL}/payments`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          customer: customerId,
          billingType: 'UNDEFINED',
          value: valorSetup,
          dueDate: hoje,
          description: `Taxa de Implantação (Setup) - ${plano.nome} - ${lojista.nome_estabelecimento}`,
          externalReference: `setup_${lojista.id}`,
        }),
      });

      const setupParsed = await parseAsaasResponse(setupRes, 'criar cobrança de setup');
      if (!setupParsed.ok) {
        return NextResponse.json(
          { error: setupParsed.error || 'Erro ao criar cobrança de Taxa de Implantação no Asaas.' },
          { status: 400 }
        );
      }

      setupPaymentId = setupParsed.data?.id || null;
      setupInvoiceUrl = setupParsed.data?.invoiceUrl || null;
    }

    // 4. Criar assinatura recorrente no Asaas
    const subRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // Permite Pix, Boleto ou Cartão na invoiceUrl
        value: valorCobranca,
        nextDueDate: hoje,
        cycle: selectedCycle, // 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY'
        description: `Assinatura ${plano.nome} (${selectedCycle}) - ${lojista.nome_estabelecimento}`,
        externalReference: lojista.id,
      }),
    });

    const subParsed = await parseAsaasResponse(subRes, 'criar assinatura');
    if (!subParsed.ok) {
      return NextResponse.json(
        { error: subParsed.error || 'Erro ao criar assinatura no Asaas.' },
        { status: 400 }
      );
    }

    const subData = subParsed.data;

    // 5. Buscar a primeira cobrança gerada pela assinatura para pegar a invoiceUrl
    const paymentsRes = await fetch(`${ASAAS_API_URL}/subscriptions/${subData.id}/payments`, {
      method: 'GET',
      headers: asaasHeaders,
    });

    const paymentsParsed = await parseAsaasResponse(paymentsRes, 'listar cobranças da assinatura');
    const primeiraCobranca = paymentsParsed.ok ? paymentsParsed.data?.data?.[0] : null;
    const invoiceUrl = primeiraCobranca?.invoiceUrl || null;

    // 6. Atualizar registro no Supabase
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
      setupPaymentId,
      setupInvoiceUrl,
      valorAssinatura: valorCobranca,
      valorSetup,
    });
  } catch (err: any) {
    console.error('[ASAAS_SUBSCRIBE_ERROR]:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno ao processar assinatura.' },
      { status: 500 }
    );
  }
}
