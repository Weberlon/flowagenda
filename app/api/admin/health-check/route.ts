import { NextResponse } from 'next/server';
import { verifySuperAdminSession } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { ASAAS_API_URL, getAsaasHeaders } from '@/lib/asaas-subscription';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export interface TenantAlertItem {
  lojistaId: string;
  nomeEstabelecimento: string;
  slugSubdominio: string;
  severity: 'error' | 'warning';
  code:
    | 'MISSING_ASAAS_LINK'
    | 'ASAAS_STATUS_DIVERGENCE'
    | 'WHATSAPP_MISSING_OR_OFFLINE'
    | 'EMPTY_KNOWLEDGE_BASE';
  message: string;
  suggestedAction:
    | 'sync_asaas'
    | 'set_whatsapp_webhook'
    | 'create_whatsapp_instance'
    | 'rebuild_knowledge_base'
    | 'send_access_link'
    | null;
  actionLabel?: string;
  instanceName?: string | null;
}

export async function GET() {
  const auth = await verifySuperAdminSession();
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Não autorizado. Acesso restrito a Super Admins.' },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Variáveis do Supabase Admin não configuradas.' },
      { status: 500 }
    );
  }

  const adminClient = createAdminClient();

  // 1. Checagem de Variáveis de Ambiente
  const envChecks = {
    ASAAS_API_KEY: Boolean(process.env.ASAAS_API_KEY?.trim()),
    ASAAS_WEBHOOK_SECRET: Boolean(
      (process.env.ASAAS_WEBHOOK_SECRET || process.env.ASAAS_WEBHOOK_TOKEN)?.trim()
    ),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    CRON_SECRET: Boolean(process.env.CRON_SECRET?.trim()),
    EVOLUTION_API_URL: Boolean(process.env.EVOLUTION_API_URL?.trim()),
    EVOLUTION_API_KEY: Boolean(process.env.EVOLUTION_API_KEY?.trim()),
  };

  const missingEnvs = Object.entries(envChecks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);

  const asaasApiKey = process.env.ASAAS_API_KEY?.trim() || '';
  const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/+$/, '') || '';
  const evolutionKey = process.env.EVOLUTION_API_KEY?.trim() || '';

  const fiveMinutesAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // 2. Verificações de Infraestrutura em Paralelo com AbortSignal.timeout(4000)
  const [asaasPingSettled, evolutionListSettled, queueSettled, lojistasSettled] =
    await Promise.allSettled([
      // 2.1 Ping Asaas Produção
      (async () => {
        if (!asaasApiKey) {
          return { ok: false, latencyMs: 0, error: 'ASAAS_API_KEY ausente' };
        }
        const t0 = Date.now();
        const res = await fetch(`${ASAAS_API_URL}/customers?limit=1`, {
          method: 'GET',
          headers: getAsaasHeaders(asaasApiKey),
          signal: AbortSignal.timeout(4000),
          cache: 'no-store',
        });
        const latencyMs = Date.now() - t0;
        const raw = await res.text();
        if (!res.ok) {
          return {
            ok: false,
            latencyMs,
            status: res.status,
            error: `HTTP ${res.status}: ${raw.slice(0, 120)}`,
          };
        }
        return { ok: true, latencyMs, status: res.status };
      })(),

      // 2.2 Lista de instâncias em lote na Evolution API v2
      (async () => {
        if (!evolutionUrl || !evolutionKey) {
          return { ok: false, latencyMs: 0, instances: [] as any[], error: 'Credenciais Evolution ausentes' };
        }
        const t0 = Date.now();
        const res = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: {
            apikey: evolutionKey,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(4000),
          cache: 'no-store',
        });
        const latencyMs = Date.now() - t0;
        if (!res.ok) {
          const errText = await res.text();
          return {
            ok: false,
            latencyMs,
            instances: [] as any[],
            error: `HTTP ${res.status}: ${errText.slice(0, 120)}`,
          };
        }
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        return { ok: true, latencyMs, instances: list };
      })(),

      // 2.3 Fila Assíncrona (chat_queue) parada há mais de 5 minutos
      (async () => {
        const { data: stuckRows, error: stuckErr } = await adminClient
          .from('chat_queue')
          .select('id, lojista_id, status, created_at')
          .in('status', ['pending', 'processing'])
          .lt('created_at', fiveMinutesAgoIso)
          .limit(50);

        const { count: pendingTotal } = await adminClient
          .from('chat_queue')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'processing']);

        return {
          ok: !stuckErr,
          stuckCount: stuckRows?.length || 0,
          pendingTotal: pendingTotal || 0,
          error: stuckErr?.message,
        };
      })(),

      // 2.4 Buscar lojistas para auditoria
      (async () => {
        const { data, error } = await adminClient
          .from('lojistas')
          .select(
            'id, nome_estabelecimento, slug_subdominio, status_pagamento, is_founder, asaas_customer_id, asaas_subscription_id, whatsapp_instance_name, use_ai_agent, knowledge_base'
          )
          .order('created_at', { ascending: false });

        return { ok: !error, lojistas: data || [], error: error?.message };
      })(),
    ]);

  const asaasStatus =
    asaasPingSettled.status === 'fulfilled'
      ? asaasPingSettled.value
      : { ok: false, latencyMs: 4000, error: 'Timeout ou falha de conexão com Asaas' };

  const evolutionStatus =
    evolutionListSettled.status === 'fulfilled'
      ? evolutionListSettled.value
      : { ok: false, latencyMs: 4000, instances: [] as any[], error: 'Timeout na Evolution API v2' };

  const queueStatus =
    queueSettled.status === 'fulfilled'
      ? queueSettled.value
      : { ok: false, stuckCount: 0, pendingTotal: 0, error: 'Erro ao consultar chat_queue' };

  const lojistasResult =
    lojistasSettled.status === 'fulfilled'
      ? lojistasSettled.value
      : { ok: false, lojistas: [] as any[], error: 'Erro ao listar lojistas' };

  // Mapear instâncias da Evolution API v2 por nome
  const evolutionInstanceMap = new Map<string, { state: string }>();
  for (const inst of evolutionStatus.instances || []) {
    const name = inst?.name || inst?.instanceName || inst?.instance?.instanceName;
    const state = (
      inst?.connectionStatus ||
      inst?.state ||
      inst?.instance?.status ||
      inst?.instance?.state ||
      'close'
    )
      .toString()
      .toLowerCase();
    if (name) {
      evolutionInstanceMap.set(name, { state });
    }
  }

  const alerts: TenantAlertItem[] = [];
  const lojistas = lojistasResult.lojistas || [];

  // 3. Auditoria de Lojistas (itens 1, 2 e 3)
  const tenantsForAsaasCheck: any[] = [];

  for (const tenant of lojistas) {
    const isFounder = tenant.is_founder === true;
    const hasValidCustomer =
      Boolean(tenant.asaas_customer_id) &&
      !String(tenant.asaas_customer_id).startsWith('cus_mock_');
    const hasSub = Boolean(tenant.asaas_subscription_id);

    // Regra 1: Não-fundador com status_pagamento = 'pendente' sem cliente ou assinatura no Asaas
    if (!isFounder && tenant.status_pagamento === 'pendente' && (!hasValidCustomer || !hasSub)) {
      alerts.push({
        lojistaId: tenant.id,
        nomeEstabelecimento: tenant.nome_estabelecimento,
        slugSubdominio: tenant.slug_subdominio,
        severity: 'warning',
        code: 'MISSING_ASAAS_LINK',
        message: !hasValidCustomer
          ? 'Lojista pendente sem cliente vinculado no Asaas (asaas_customer_id ausente).'
          : 'Lojista pendente com cliente no Asaas, mas sem assinatura recorrente vinculada.',
        suggestedAction: null,
      });
    }

    // Regra 2: Sem whatsapp_instance_name ou instância ausente/desconectada na Evolution API v2
    const instanceName = tenant.whatsapp_instance_name as string | null;
    if (!instanceName) {
      const expectedName = `flowagenda_${String(tenant.slug_subdominio || '').replace(/[^a-zA-Z0-9]/g, '_')}`;
      alerts.push({
        lojistaId: tenant.id,
        nomeEstabelecimento: tenant.nome_estabelecimento,
        slugSubdominio: tenant.slug_subdominio,
        severity: 'error',
        code: 'WHATSAPP_MISSING_OR_OFFLINE',
        message: 'Coluna whatsapp_instance_name vazia no Supabase.',
        suggestedAction: 'create_whatsapp_instance',
        actionLabel: 'Criar Instância WhatsApp',
        instanceName: expectedName,
      });
    } else if (evolutionStatus.ok) {
      const evoMatch = evolutionInstanceMap.get(instanceName);
      if (!evoMatch) {
        alerts.push({
          lojistaId: tenant.id,
          nomeEstabelecimento: tenant.nome_estabelecimento,
          slugSubdominio: tenant.slug_subdominio,
          severity: 'error',
          code: 'WHATSAPP_MISSING_OR_OFFLINE',
          message: `Instância "${instanceName}" não encontrada na Evolution API v2.`,
          suggestedAction: 'create_whatsapp_instance',
          actionLabel: 'Criar Instância WhatsApp',
          instanceName,
        });
      } else if (evoMatch.state !== 'open') {
        alerts.push({
          lojistaId: tenant.id,
          nomeEstabelecimento: tenant.nome_estabelecimento,
          slugSubdominio: tenant.slug_subdominio,
          severity: 'warning',
          code: 'WHATSAPP_MISSING_OR_OFFLINE',
          message: `Instância "${instanceName}" desconectada (estado: ${evoMatch.state}).`,
          suggestedAction: 'set_whatsapp_webhook',
          actionLabel: 'Reconfigurar Webhook',
          instanceName,
        });
      }
    }

    // Regra 3: use_ai_agent = true mas knowledge_base vazia
    if (tenant.use_ai_agent === true && (!tenant.knowledge_base || !String(tenant.knowledge_base).trim())) {
      alerts.push({
        lojistaId: tenant.id,
        nomeEstabelecimento: tenant.nome_estabelecimento,
        slugSubdominio: tenant.slug_subdominio,
        severity: 'warning',
        code: 'EMPTY_KNOWLEDGE_BASE',
        message: 'Secretária IA ativada (use_ai_agent = true), mas knowledge_base está vazia.',
        suggestedAction: 'rebuild_knowledge_base',
        actionLabel: 'Reconstruir IA',
      });
    }

    if (!isFounder && hasValidCustomer && asaasStatus.ok) {
      tenantsForAsaasCheck.push(tenant);
    }
  }

  // Regra 4: Divergência entre status_pagamento no Supabase e status real no Asaas (em paralelo com timeout 4s)
  if (tenantsForAsaasCheck.length > 0 && asaasApiKey) {
    const asaasCheckResults = await Promise.allSettled(
      tenantsForAsaasCheck.slice(0, 20).map(async (tenant) => {
        const res = await fetch(
          `${ASAAS_API_URL}/payments?customer=${encodeURIComponent(tenant.asaas_customer_id)}&limit=10`,
          {
            method: 'GET',
            headers: getAsaasHeaders(asaasApiKey),
            signal: AbortSignal.timeout(4000),
            cache: 'no-store',
          }
        );
        if (!res.ok) return null;
        const data = await res.json().catch(() => null);
        const payments: any[] = Array.isArray(data?.data) ? data.data : [];
        if (payments.length === 0) return null;

        const hasOverdue = payments.some((p) => p.status === 'OVERDUE');
        const hasConfirmedOrReceived = payments.some(
          (p) => p.status === 'CONFIRMED' || p.status === 'RECEIVED'
        );

        let expectedStatus: 'ativo' | 'inadimplente' | null = null;
        if (hasOverdue) {
          expectedStatus = 'inadimplente';
        } else if (hasConfirmedOrReceived) {
          expectedStatus = 'ativo';
        }

        // Nunca rebaixar quem está 'ativo' apenas por ter fatura futura PENDING dentro do prazo
        if (expectedStatus && expectedStatus !== tenant.status_pagamento) {
          return {
            lojistaId: tenant.id,
            nomeEstabelecimento: tenant.nome_estabelecimento,
            slugSubdominio: tenant.slug_subdominio,
            severity: expectedStatus === 'inadimplente' ? ('error' as const) : ('warning' as const),
            code: 'ASAAS_STATUS_DIVERGENCE' as const,
            message: `Divergência Asaas: Supabase está "${tenant.status_pagamento}", mas cobranças no Asaas indicam "${expectedStatus}".`,
            suggestedAction: 'sync_asaas' as const,
            actionLabel: 'Sincronizar Asaas',
          };
        }

        return null;
      })
    );

    for (const item of asaasCheckResults) {
      if (item.status === 'fulfilled' && item.value) {
        alerts.push(item.value);
      }
    }
  }

  return NextResponse.json({
    success: true,
    checkedAt: new Date().toISOString(),
    env: {
      ok: missingEnvs.length === 0,
      checks: envChecks,
      missing: missingEnvs,
    },
    infrastructure: {
      asaas: asaasStatus,
      evolution: {
        ok: evolutionStatus.ok,
        latencyMs: evolutionStatus.latencyMs,
        totalInstances: evolutionStatus.instances?.length || 0,
        error: evolutionStatus.error,
      },
      chatQueue: queueStatus,
    },
    summary: {
      totalLojistas: lojistas.length,
      totalAlerts: alerts.length,
    },
    alerts,
  });
}
