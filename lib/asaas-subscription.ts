import { createClient } from '@supabase/supabase-js';

export const ASAAS_API_URL = 'https://api.asaas.com/v3';

export type AsaasCycle = 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY';

export interface PlanoConfigItem {
  nome: string;
  MONTHLY: number;
  SEMIANNUALLY: number;
  YEARLY: number;
  mensalEquivalente: {
    MONTHLY: number;
    SEMIANNUALLY: number;
    YEARLY: number;
  };
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
    mensalEquivalente: {
      MONTHLY: 59.90,
      SEMIANNUALLY: 54.90,
      YEARLY: 49.90,
    },
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
    mensalEquivalente: {
      MONTHLY: 99.90,
      SEMIANNUALLY: 89.90,
      YEARLY: 84.90,
    },
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
    mensalEquivalente: {
      MONTHLY: 189.90,
      SEMIANNUALLY: 169.90,
      YEARLY: 159.90,
    },
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
    mensalEquivalente: {
      MONTHLY: 189.90,
      SEMIANNUALLY: 169.90,
      YEARLY: 159.90,
    },
    taxaSetup: {
      MONTHLY: 349.90,
      SEMIANNUALLY: 174.90, // 50% OFF
      YEARLY: 0,            // Setup 100% Grátis no Anual
    },
  },
};

export async function parseAsaasResponse(
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

export function getAsaasHeaders(asaasApiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'FlowAgenda/1.0',
    'access_token': asaasApiKey,
  };
}

/**
 * Cria apenas o cliente no Asaas (POST https://api.asaas.com/v3/customers)
 * e atualiza asaas_customer_id na tabela lojistas.
 */
export async function registerAsaasCustomerForTenant(params: {
  lojistaId: string;
  name: string;
  email?: string | null;
  mobilePhone?: string | null;
  cpfCnpj: string;
}): Promise<{ ok: boolean; customerId?: string; error?: string }> {
  const asaasApiKey = process.env.ASAAS_API_KEY?.trim();
  if (!asaasApiKey) {
    return { ok: false, error: 'Variável de ambiente ASAAS_API_KEY não configurada no servidor.' };
  }

  const documentoLimpo = (params.cpfCnpj || '').replace(/\D/g, '');
  if (!documentoLimpo) {
    return { ok: false, error: 'CPF/CNPJ obrigatório para criar cliente no Asaas.' };
  }

  const telefoneLimpo = (params.mobilePhone || '').replace(/^55/, '').replace(/\D/g, '');

  const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
    method: 'POST',
    headers: getAsaasHeaders(asaasApiKey),
    body: JSON.stringify({
      name: params.name,
      email: params.email || undefined,
      mobilePhone: telefoneLimpo || undefined,
      cpfCnpj: documentoLimpo,
      externalReference: params.lojistaId,
      notificationDisabled: false,
    }),
  });

  const parsed = await parseAsaasResponse(customerRes, 'criar cliente');
  if (!parsed.ok) {
    return { ok: false, error: parsed.error || 'Erro ao criar cliente no Asaas.' };
  }

  const customerId = parsed.data?.id as string;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceRole && customerId) {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);
    await supabaseAdmin
      .from('lojistas')
      .update({ asaas_customer_id: customerId })
      .eq('id', params.lojistaId);
  }

  return { ok: true, customerId };
}

/**
 * Serviço completo de geração de Assinatura + Taxa de Setup opcional no Asaas
 * Reutilizado tanto por POST /api/admin/asaas/subscribe quanto por createTenantAction no Onboarding.
 */
export async function processAsaasTenantSubscription(params: {
  lojistaId: string;
  cycle?: AsaasCycle;
  cpfCnpj?: string;
  incluirSetup?: boolean;
}): Promise<{
  ok: boolean;
  status: number;
  error?: string;
  needsCpfCnpj?: boolean;
  customerId?: string;
  subscriptionId?: string;
  invoiceUrl?: string | null;
  setupPaymentId?: string | null;
  setupInvoiceUrl?: string | null;
  valorAssinatura?: number;
  valorSetup?: number;
}> {
  const asaasApiKey = process.env.ASAAS_API_KEY?.trim();
  if (!asaasApiKey) {
    return {
      ok: false,
      status: 500,
      error: 'Variável de ambiente ASAAS_API_KEY não configurada no servidor.',
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRole) {
    return {
      ok: false,
      status: 500,
      error: 'Credenciais Supabase Admin ausentes no servidor.',
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

  const validCycles: AsaasCycle[] = ['MONTHLY', 'SEMIANNUALLY', 'YEARLY'];
  const selectedCycle: AsaasCycle =
    params.cycle && validCycles.includes(params.cycle) ? params.cycle : 'YEARLY';
  const incluirSetup = Boolean(params.incluirSetup);

  // 1. Buscar dados do lojista no Supabase
  const { data: lojista, error: fetchError } = await supabaseAdmin
    .from('lojistas')
    .select('*')
    .eq('id', params.lojistaId)
    .single();

  if (fetchError || !lojista) {
    return { ok: false, status: 404, error: 'Lojista não encontrado.' };
  }

  const tierKey = lojista.tier || 'tier_1';
  const plano = PLANOS_CONFIG[tierKey];
  if (!plano) {
    return { ok: false, status: 400, error: `Tier inválido: ${tierKey}` };
  }

  const valorCobranca = plano[selectedCycle];
  const valorSetup =
    incluirSetup && selectedCycle !== 'YEARLY' ? plano.taxaSetup[selectedCycle] : 0;

  let customerId =
    lojista.asaas_customer_id && !String(lojista.asaas_customer_id).startsWith('cus_mock_')
      ? lojista.asaas_customer_id
      : null;

  const asaasHeaders = getAsaasHeaders(asaasApiKey);

  // 2. Criar cliente no Asaas caso ainda não exista vínculo
  if (!customerId) {
    const documentoLimpo = (params.cpfCnpj || lojista.cpf_cnpj || '').replace(/\D/g, '');
    if (!documentoLimpo) {
      return {
        ok: false,
        status: 422,
        error: 'CPF/CNPJ obrigatório para cadastrar novo cliente no Asaas.',
        needsCpfCnpj: true,
      };
    }

    const customerResult = await registerAsaasCustomerForTenant({
      lojistaId: lojista.id,
      name: lojista.nome_estabelecimento || lojista.nome_negocio,
      email: lojista.email,
      mobilePhone: lojista.whatsapp_notificacao || lojista.whatsapp,
      cpfCnpj: documentoLimpo,
    });

    if (!customerResult.ok || !customerResult.customerId) {
      return {
        ok: false,
        status: 400,
        error: customerResult.error || 'Erro ao criar cliente no Asaas.',
      };
    }

    customerId = customerResult.customerId;
  }

  const hoje = new Date().toISOString().split('T')[0];

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
      return {
        ok: false,
        status: 400,
        error: setupParsed.error || 'Erro ao criar cobrança de Taxa de Implantação no Asaas.',
      };
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
      billingType: 'UNDEFINED',
      value: valorCobranca,
      nextDueDate: hoje,
      cycle: selectedCycle,
      description: `Assinatura ${plano.nome} (${selectedCycle}) - ${lojista.nome_estabelecimento}`,
      externalReference: lojista.id,
    }),
  });

  const subParsed = await parseAsaasResponse(subRes, 'criar assinatura');
  if (!subParsed.ok) {
    return {
      ok: false,
      status: 400,
      error: subParsed.error || 'Erro ao criar assinatura no Asaas.',
    };
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

  return {
    ok: true,
    status: 200,
    customerId,
    subscriptionId: subData.id,
    invoiceUrl,
    setupPaymentId,
    setupInvoiceUrl,
    valorAssinatura: valorCobranca,
    valorSetup,
  };
}

/**
 * Busca a invoiceUrl da cobrança pendente ou vencida mais recente de uma assinatura (ou cliente) no Asaas
 * Usado pela trava de status_pagamento em app/dashboard/layout.tsx
 */
export async function fetchPendingAsaasInvoiceUrl(
  subscriptionId?: string | null,
  customerId?: string | null
): Promise<string | null> {
  const asaasApiKey = process.env.ASAAS_API_KEY?.trim();
  if (!asaasApiKey) return null;

  const headers = getAsaasHeaders(asaasApiKey);

  try {
    if (subscriptionId) {
      const res = await fetch(
        `${ASAAS_API_URL}/subscriptions/${encodeURIComponent(subscriptionId)}/payments`,
        {
          method: 'GET',
          headers,
          cache: 'no-store',
        }
      );
      const parsed = await parseAsaasResponse(res, 'buscar fatura da assinatura');
      if (parsed.ok && Array.isArray(parsed.data?.data)) {
        const payments = parsed.data.data as any[];
        const pendingOrOverdue =
          payments.find((p) => p.status === 'OVERDUE' || p.status === 'PENDING') ||
          payments[0];
        if (pendingOrOverdue?.invoiceUrl) {
          return pendingOrOverdue.invoiceUrl as string;
        }
      }
    }

    if (customerId && !String(customerId).startsWith('cus_mock_')) {
      const res = await fetch(
        `${ASAAS_API_URL}/payments?customer=${encodeURIComponent(customerId)}&limit=5`,
        {
          method: 'GET',
          headers,
          cache: 'no-store',
        }
      );
      const parsed = await parseAsaasResponse(res, 'buscar fatura do cliente');
      if (parsed.ok && Array.isArray(parsed.data?.data)) {
        const payments = parsed.data.data as any[];
        const pendingOrOverdue =
          payments.find((p) => p.status === 'OVERDUE' || p.status === 'PENDING') ||
          payments[0];
        if (pendingOrOverdue?.invoiceUrl) {
          return pendingOrOverdue.invoiceUrl as string;
        }
      }
    }
  } catch (err) {
    console.warn('[fetchPendingAsaasInvoiceUrl] Aviso ao consultar fatura no Asaas:', err);
  }

  return null;
}

