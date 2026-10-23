import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * ==============================================================================
 * FlowAgenda — Rota de Contingência e Monitoramento de Saúde WhatsApp
 * Arquivo: app/api/cron/whatsapp-healthcheck/route.ts
 * ==============================================================================
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Timeout máximo da função no runtime

interface LojistaData {
  id?: string;
  nome_negocio?: string | null;
  nome_estabelecimento?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  whatsapp_notificacao?: string | null;
}

interface WhatsAppInstanceRecord {
  id: string;
  instance_name: string;
  lojista_id: string | null;
  status_conexao: string | null;
  lojistas?: LojistaData | LojistaData[] | null;
}

interface HealthCheckSummary {
  success: boolean;
  total_instances: number;
  online: number;
  offline: number;
  alertas_disparados: number;
  duration_ms: number;
}

/**
 * Comparação em tempo constante contra timing attacks
 */
function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufferA = Buffer.from(a, 'utf-8');
    const bufferB = Buffer.from(b, 'utf-8');
    if (bufferA.length !== bufferB.length) return false;
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}

/**
 * Disparo de e-mail emergencial via Resend API
 */
async function sendEmergencyAlertEmail(params: {
  toEmail: string;
  nomeNegocio: string;
  instanceName: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminBcc = process.env.ADMIN_ALERT_EMAIL;

  if (!apiKey) {
    console.warn(
      `[Healthcheck] RESEND_API_KEY não configurada. Alerta simulado com sucesso para ${params.toEmail} (${params.instanceName}).`
    );
    return true;
  }

  const payload: Record<string, unknown> = {
    from: 'FlowAgenda <alertas@flowagenda.online>',
    to: [params.toEmail],
    subject: '[URGENTE FlowAgenda] Conexão do seu WhatsApp foi interrompida',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #0F172A; color: #ECEFF4; padding: 24px; border-radius: 8px;">
        <h2 style="color: #BF616A; margin-top: 0;">⚠️ Conexão do WhatsApp Interrompida</h2>
        <p>Olá, <strong>${params.nomeNegocio}</strong>,</p>
        <p>Nosso sistema de monitoramento detectou que a sua instância de atendimento autônomo (<strong>${params.instanceName}</strong>) desconectou do WhatsApp.</p>
        <p style="background-color: #1E293B; padding: 16px; border-left: 4px solid #BF616A; border-radius: 4px;">
          <strong>Atenção:</strong> Enquanto a conexão estiver inativa, novos agendamentos via robô e confirmações automáticas por PIN não serão entregues no WhatsApp dos seus clientes.
        </p>
        <p>Para restabelecer o atendimento imediatamente, acesse o painel:</p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="https://app.flowagenda.online/dashboard/whatsapp" 
             style="background-color: #88C0D0; color: #2E3440; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Escanear QR Code e Reconectar
          </a>
        </p>
        <p style="font-size: 12px; color: #94A3B8;">FlowAgenda — Monitoramento Automatizado de Contingência 24/7</p>
      </div>
    `,
    text: `Olá ${params.nomeNegocio},\n\nA conexão do seu WhatsApp na instância "${params.instanceName}" foi interrompida.\n\nAcesse imediatamente https://app.flowagenda.online/dashboard/whatsapp para escanear o QR Code e retomar o atendimento autônomo dos seus clientes.\n\nFlowAgenda — Monitoramento de Contingência`,
  };

  if (adminBcc) {
    payload.bcc = [adminBcc];
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Healthcheck] Erro ao enviar e-mail via Resend:', errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Healthcheck] Exceção ao enviar e-mail via Resend:', error);
    return false;
  }
}

/**
 * Consulta de estado na Evolution API com AbortController (timeout 5000ms)
 */
async function checkEvolutionInstance(instanceName: string): Promise<boolean> {
  const apiUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY || '';

  if (!apiUrl || !apiKey) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `${apiUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: apiKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const json = (await response.json()) as Record<string, any>;
    const state = json?.instance?.state || json?.state;

    return state === 'open';
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

export async function GET(req: Request) {
  const startTime = Date.now();

  try {
    // 1. Autenticação e Segurança via Bearer Token
    const authHeader = req.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET || process.env.HOOK_TOKEN || '';

    if (!cronSecret) {
      console.error('[WhatsApp Healthcheck] CRON_SECRET ou HOOK_TOKEN não configurado.');
      return NextResponse.json(
        { error: 'Configuração de autenticação ausente no servidor.' },
        { status: 500 }
      );
    }

    const expectedHeader = `Bearer ${cronSecret}`;
    if (!timingSafeCompare(authHeader, expectedHeader)) {
      console.warn('[WhatsApp Healthcheck] Acesso negado. Token de autorização inválido.');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Varredura Multi-Instância no Supabase com Service Role
    const adminSupabase = createAdminClient();

    const { data: rawInstances, error: fetchErr } = await adminSupabase
      .from('whatsapp_instances')
      .select(`
        id,
        instance_name,
        lojista_id,
        status_conexao,
        lojistas:lojistas!whatsapp_instances_lojista_id_fkey (
          id,
          nome_negocio,
          nome_estabelecimento,
          email,
          whatsapp,
          whatsapp_notificacao
        )
      `);

    if (fetchErr) {
      console.error('[WhatsApp Healthcheck] Erro ao consultar whatsapp_instances:', fetchErr);
      return NextResponse.json(
        { error: 'Falha ao consultar instâncias de WhatsApp no banco.' },
        { status: 500 }
      );
    }

    const instances: WhatsAppInstanceRecord[] = (rawInstances as WhatsAppInstanceRecord[]) || [];
    const nowIso = new Date().toISOString();

    let onlineCount = 0;
    let offlineCount = 0;
    let alertsSentCount = 0;

    // 3. Inspeção Resiliente em Paralelo utilizando Promise.allSettled
    const inspectionPromises = instances.map(async (inst) => {
      const instanceName = inst.instance_name;
      const prevStatus = (inst.status_conexao || '').toLowerCase();

      const lojistaRaw = Array.isArray(inst.lojistas) ? inst.lojistas[0] : inst.lojistas;
      const nomeNegocio =
        lojistaRaw?.nome_negocio || lojistaRaw?.nome_estabelecimento || 'Lojista FlowAgenda';
      const email = lojistaRaw?.email || '';

      const isLive = await checkEvolutionInstance(instanceName);

      if (isLive) {
        onlineCount++;
        // Atualiza para 'online' se estiver diferente
        if (prevStatus !== 'online') {
          await adminSupabase
            .from('whatsapp_instances')
            .update({
              status_conexao: 'online',
              status: 'open',
              ultima_verificacao: nowIso,
              updated_at: nowIso,
            })
            .eq('id', inst.id);

          // Sincronizar configuracoes_robo se lojista_id estiver presente
          if (inst.lojista_id) {
            await adminSupabase
              .from('configuracoes_robo')
              .update({ status_conexao: 'open', updated_at: nowIso })
              .eq('lojista_id', inst.lojista_id);
          }
        } else {
          // Apenas atualiza a última verificação
          await adminSupabase
            .from('whatsapp_instances')
            .update({ ultima_verificacao: nowIso })
            .eq('id', inst.id);
        }
      } else {
        offlineCount++;
        // Atualiza para 'offline'
        await adminSupabase
          .from('whatsapp_instances')
          .update({
            status_conexao: 'offline',
            status: 'close',
            ultima_verificacao: nowIso,
            updated_at: nowIso,
          })
          .eq('id', inst.id);

        if (inst.lojista_id) {
          await adminSupabase
            .from('configuracoes_robo')
            .update({ status_conexao: 'close', updated_at: nowIso })
            .eq('lojista_id', inst.lojista_id);
        }

        // DETECÇÃO DE QUEDA: Se estava 'online' anteriormente e caiu agora, dispara alerta
        if (prevStatus === 'online') {
          console.warn(`[WhatsApp Healthcheck] Queda detectada na instância "${instanceName}". Disparando alerta.`);
          if (email) {
            const sent = await sendEmergencyAlertEmail({
              toEmail: email,
              nomeNegocio,
              instanceName,
            });
            if (sent) alertsSentCount++;
          }
        }
      }
    });

    await Promise.allSettled(inspectionPromises);

    const durationMs = Date.now() - startTime;

    const summary: HealthCheckSummary = {
      success: true,
      total_instances: instances.length,
      online: onlineCount,
      offline: offlineCount,
      alertas_disparados: alertsSentCount,
      duration_ms: durationMs,
    };

    console.log('[WhatsApp Healthcheck] Varredura finalizada:', summary);

    return NextResponse.json(summary, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno durante healthcheck';
    console.error('[WhatsApp Healthcheck] Exceção crítica:', error);
    return NextResponse.json(
      {
        success: false,
        error: msg,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
