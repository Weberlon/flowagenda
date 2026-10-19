/**
 * ==============================================================================
 * FlowAgenda — Utilitário Centralizado de Envio WhatsApp (Anti-Banimento)
 * Arquivo: lib/whatsapp-sender.ts
 * ==============================================================================
 */

export interface SendWhatsAppParams {
  instanceName: string;
  number: string; // Apenas dígitos (ex: 55319XXXXXXXX)
  text: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Função utilitária para pausar a execução assíncrona por um tempo determinado
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normaliza e higieniza número para padrão internacional (DDI 55 + DDD + Número)
 */
function sanitizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('55') && (cleaned.length === 10 || cleaned.length === 11)) {
    cleaned = `55${cleaned}`;
  }
  return cleaned;
}

/**
 * Envio blindado com simulação de presença humana e jitter randômico
 * para prevenção ativa de banimento na Evolution API v2.
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<SendWhatsAppResult> {
  try {
    const apiUrl = (process.env.EVOLUTION_API_URL || 'http://179.236.70.181:8080').replace(/\/+$/, '');
    const apiKey = process.env.EVOLUTION_API_KEY || '';

    if (!apiKey) {
      console.warn('[WhatsApp Sender] EVOLUTION_API_KEY não configurada.');
      return {
        success: false,
        error: 'Chave de API da Evolution não configurada no servidor.',
      };
    }

    const cleanNumber = sanitizePhoneNumber(params.number);
    if (!cleanNumber || cleanNumber.length < 10) {
      return {
        success: false,
        error: `Número de WhatsApp inválido: ${params.number}`,
      };
    }

    const instance = encodeURIComponent(params.instanceName);

    // 1. Simular presença "digitando..." (Composing)
    try {
      await fetch(`${apiUrl}/chat/sendPresence/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: cleanNumber,
          presence: 'composing',
          delay: 1200,
        }),
      });
    } catch (presenceErr) {
      console.warn('[WhatsApp Sender] Falha ao enviar presença composing (não impeditivo):', presenceErr);
    }

    // 2. Atraso fixo base de 2 segundos
    await sleep(2000);

    // 3. Jitter aleatório entre 1000ms e 5000ms (Total seguro entre 3s e 7s)
    const jitter = Math.floor(Math.random() * 4001) + 1000;
    await sleep(jitter);

    // 4. Disparo da mensagem final
    const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: cleanNumber,
        text: params.text,
      }),
    });

    const resText = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(resText) as Record<string, unknown>;
    } catch {
      data = { raw: resText };
    }

    if (!response.ok) {
      const errorMsg =
        typeof data.message === 'string'
          ? data.message
          : `Falha no envio da mensagem WhatsApp (HTTP ${response.status})`;
      console.error('[WhatsApp Sender] Erro retornado pela Evolution API:', errorMsg, resText);
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Extrair ID da mensagem se retornado pela Evolution API
    const key = data.key as { id?: string } | undefined;
    const messageId = key?.id || (typeof data.id === 'string' ? data.id : undefined);

    return {
      success: true,
      messageId,
    };
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : 'Erro inesperado ao enviar mensagem WhatsApp';
    console.error('[WhatsApp Sender] Exceção crítica:', error);
    return {
      success: false,
      error: err,
    };
  }
}
