// ==============================================================================
// Evolution API v2 Service (WhatsApp Baileys Integration)
// Arquivo: lib/evolution.ts
// ==============================================================================

/**
 * Estados padronizados de conexão do gateway Evolution API / Baileys
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'open' | 'close';

export interface EvolutionApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId?: string;
    status: string;
  };
  hash?: {
    apikey?: string;
  };
  qrcode?: {
    base64?: string;
    code?: string;
  };
}

export interface QrCodeResult {
  base64: string | null;
  code?: string | null;
  pairingCode?: string | null;
}

export interface ConnectionStateResult {
  instanceName: string;
  state: ConnectionState;
}

export interface SendTextMessageParams {
  instanceName: string;
  number: string;
  text: string;
}

export interface SendTextMessageResponse {
  key?: {
    remoteJid?: string;
    fromMe?: boolean;
    id?: string;
  };
  message?: any;
  messageTimestamp?: string | number;
  status?: string;
}

/**
 * Utilitário interno para carregar e validar as credenciais server-side
 */
function getEvolutionConfig(): { apiUrl: string; apiKey: string } {
  const apiUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '') || '';
  const apiKey = process.env.EVOLUTION_API_KEY || '';

  if (!apiUrl || !apiKey) {
    throw new Error(
      'Configuração da Evolution API ausente: certifique-se de que EVOLUTION_API_URL e EVOLUTION_API_KEY estão definidos no ambiente.'
    );
  }

  return { apiUrl, apiKey };
}

/**
 * Formata um número de telefone para o padrão internacional (DDI + DDD + Número)
 * Removendo quaisquer caracteres não-numéricos (espaços, traços, parênteses).
 */
export function formatToInternationalPhone(rawPhone: string): string {
  const clean = rawPhone.replace(/\D/g, '');
  if (!clean) return '';

  // Se já possui DDI 55 (Brasil) com 12 ou 13 dígitos
  if (clean.startsWith('55') && clean.length >= 12) {
    return clean;
  }

  // Se possui DDD brasileiro (10 ou 11 dígitos), prefixa com 55
  if (clean.length === 10 || clean.length === 11) {
    return `55${clean}`;
  }

  return clean;
}

/**
 * Mascara número de telefone para privacidade LGPD
 */
export function maskPhoneNumber(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 10) {
    const ddd = clean.slice(-11, -9);
    const start = clean.slice(-9, -8);
    const end = clean.slice(-4);
    return `+55 (${ddd}) ${start}****-${end}`;
  }
  return 'Telefone Mascarado';
}

/**
 * 1. Cria uma nova instância Baileys no Evolution API v2 para a organização
 * POST /instance/create
 */
export async function createInstance(
  organizationId: string
): Promise<EvolutionApiResult<{ instanceName: string; instanceId?: string; token?: string; qrcode?: string | null }>> {
  try {
    const { apiUrl, apiKey } = getEvolutionConfig();
    const instanceName =
      organizationId.startsWith('flow_') || organizationId.startsWith('flowagenda_')
        ? organizationId
        : `flow_${organizationId}`;

    const response = await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        instanceName,
        token: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        rejectCall: false,
        msgCall: '',
        groupsIgnore: true,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
      }),
    });

    const resText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(resText);
    } catch {
      data = { raw: resText };
    }

    if (!response.ok) {
      // Se a instância já existe, trata com tolerância e recupera o status atual
      if (
        response.status === 403 ||
        data?.response?.message?.includes('already exists') ||
        resText.includes('already exists')
      ) {
        return {
          success: true,
          data: {
            instanceName,
            instanceId: data?.instance?.instanceId || undefined,
            token: instanceName,
            qrcode: null,
          },
        };
      }

      return {
        success: false,
        error: data?.response?.message || data?.message || `Falha ao criar instância (HTTP ${response.status}): ${resText}`,
      };
    }

    const qrcodeBase64 = data?.qrcode?.base64 || data?.base64 || null;
    const instanceId = data?.instance?.instanceId || data?.instance?.id || undefined;
    const token = data?.hash?.apikey || data?.instance?.token || instanceName;

    return {
      success: true,
      data: {
        instanceName,
        instanceId,
        token,
        qrcode: qrcodeBase64,
      },
    };
  } catch (error: any) {
    console.error('[Evolution API] createInstance Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro inesperado ao conectar à Evolution API.',
    };
  }
}

/**
 * 2. Obtém o QR Code em Base64 para leitura no WhatsApp
 * GET /instance/connect/{instanceName}
 */
export async function fetchQrCode(
  instanceName: string
): Promise<EvolutionApiResult<QrCodeResult>> {
  try {
    const { apiUrl, apiKey } = getEvolutionConfig();

    const response = await fetch(`${apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      headers: {
        apikey: apiKey,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: `Falha ao obter QR Code (HTTP ${response.status}): ${errText}`,
      };
    }

    const data = await response.json();

    // A Evolution API v2 pode retornar o base64 diretamente ou aninhado
    const base64 = data?.base64 || data?.qrcode?.base64 || null;
    const code = data?.code || data?.qrcode?.code || null;
    const pairingCode = data?.pairingCode || null;

    return {
      success: true,
      data: {
        base64,
        code,
        pairingCode,
      },
    };
  } catch (error: any) {
    console.error('[Evolution API] fetchQrCode Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao obter QR Code do gateway WhatsApp.',
    };
  }
}

/**
 * 3. Consulta o status de conexão da instância
 * GET /instance/connectionState/{instanceName}
 */
export async function getConnectionState(
  instanceName: string
): Promise<EvolutionApiResult<ConnectionStateResult>> {
  try {
    const { apiUrl, apiKey } = getEvolutionConfig();

    const response = await fetch(
      `${apiUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`,
      {
        method: 'GET',
        headers: {
          apikey: apiKey,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: true,
          data: {
            instanceName,
            state: 'disconnected',
          },
        };
      }
      const errText = await response.text();
      return {
        success: false,
        error: `Falha ao checar status (HTTP ${response.status}): ${errText}`,
      };
    }

    const data = await response.json();
    const rawState = (data?.instance?.state || data?.state || 'disconnected').toLowerCase();

    let state: ConnectionState = 'disconnected';
    if (rawState === 'open') state = 'open';
    else if (rawState === 'connecting') state = 'connecting';
    else if (rawState === 'close') state = 'close';
    else state = 'disconnected';

    return {
      success: true,
      data: {
        instanceName,
        state,
      },
    };
  } catch (error: any) {
    console.error('[Evolution API] getConnectionState Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao consultar status da conexão WhatsApp.',
    };
  }
}

/**
 * 4. Envia mensagem de texto formatando o número para o padrão internacional DDI+DDD+Número
 * POST /message/sendText/{instanceName}
 */
export async function sendTextMessage(
  params: SendTextMessageParams
): Promise<EvolutionApiResult<SendTextMessageResponse>> {
  try {
    const { apiUrl, apiKey } = getEvolutionConfig();
    const formattedPhone = formatToInternationalPhone(params.number);

    if (!formattedPhone || formattedPhone.length < 10) {
      return {
        success: false,
        error: `Número de telefone inválido para envio: ${params.number}`,
      };
    }

    const response = await fetch(
      `${apiUrl}/message/sendText/${encodeURIComponent(params.instanceName)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: params.text,
        }),
      }
    );

    const resText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(resText);
    } catch {
      data = { raw: resText };
    }

    if (!response.ok) {
      const masked = maskPhoneNumber(formattedPhone);
      console.warn(`[Evolution API] Falha no disparo para ${masked}:`, resText);
      return {
        success: false,
        error: data?.response?.message || data?.message || `Falha no envio da mensagem (HTTP ${response.status})`,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('[Evolution API] sendTextMessage Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro inesperado ao enviar mensagem WhatsApp.',
    };
  }
}

/**
 * 5. Remove e desvincula a instância do gateway Evolution API
 * DELETE /instance/delete/{instanceName}
 */
export async function deleteInstance(
  instanceName: string
): Promise<EvolutionApiResult<{ message?: string }>> {
  try {
    const { apiUrl, apiKey } = getEvolutionConfig();

    const response = await fetch(
      `${apiUrl}/instance/delete/${encodeURIComponent(instanceName)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: apiKey,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errText = await response.text();
      return {
        success: false,
        error: `Falha ao remover instância (HTTP ${response.status}): ${errText}`,
      };
    }

    return {
      success: true,
      data: { message: 'Instância removida com sucesso.' },
    };
  } catch (error: any) {
    console.error('[Evolution API] deleteInstance Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao remover instância na Evolution API.',
    };
  }
}

// ==============================================================================
// Métodos de Compatibilidade com Código Legado do Projeto FlowAgenda
// ==============================================================================

/**
 * Wrapper de compatibilidade para criação de instância com nome arbitrário
 */
export async function createEvolutionInstance(instanceName: string) {
  try {
    const result = await createInstance(instanceName);
    if (!result.success) {
      throw new Error(result.error);
    }
    // Garante configuração imediata do webhook para a nova instância
    setEvolutionWebhook(instanceName).catch((err) =>
      console.warn('[Evolution API] Falha ao configurar webhook na criação:', err)
    );
    return { token: result.data?.token || instanceName };
  } catch (error: any) {
    console.error('createEvolutionInstance error:', error);
    throw error;
  }
}

/**
 * Wrapper de compatibilidade para consultar status e QR Code em um único método
 */
export async function fetchInstanceConnectionStatus(instanceName: string) {
  try {
    const stateResult = await getConnectionState(instanceName);
    const state = stateResult.success && stateResult.data ? stateResult.data.state : 'close';

    let qrcode: string | null = null;
    if (state !== 'open') {
      let qrResult = await fetchQrCode(instanceName);
      // Se a instância não existe na Evolution API, provisiona automaticamente
      if (!qrResult.success && qrResult.error && (qrResult.error.includes('404') || qrResult.error.toLowerCase().includes('not found'))) {
        try {
          await createInstance(instanceName);
          await setEvolutionWebhook(instanceName);
          qrResult = await fetchQrCode(instanceName);
        } catch (e) {
          console.warn('[Evolution API] Falha ao auto-provisionar instância:', e);
        }
      }
      if (qrResult.success && qrResult.data?.base64) {
        qrcode = qrResult.data.base64;
      }
    }

    return {
      instanceName,
      state,
      qrcode,
    };
  } catch (err: any) {
    console.error(`[Evolution API] fetchInstanceConnectionStatus falhou para ${instanceName}:`, err);
    return {
      instanceName,
      state: 'close' as ConnectionState,
      qrcode: null,
    };
  }
}

/**
 * Reinicia a instância na Evolution API
 * POST /instance/restart/{instanceName}
 */
export async function restartEvolutionInstance(instanceName: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { apiUrl, apiKey } = getEvolutionConfig();

    const response = await fetch(
      `${apiUrl}/instance/restart/${encodeURIComponent(instanceName)}`,
      {
        method: 'POST',
        headers: {
          apikey: apiKey,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      // Auto-provisionamento: se a instância não existe na VPS (404), provisiona criando-a
      if (response.status === 404 || errText.toLowerCase().includes('not found') || errText.toLowerCase().includes('does not exist')) {
        const createRes = await createInstance(instanceName);
        if (createRes.success) {
          await setEvolutionWebhook(instanceName);
          return { success: true, message: 'Instância provisionada com sucesso na Evolution API.' };
        }
      }
      return { success: false, error: `Falha ao reiniciar instância: ${errText}` };
    }

    // Ao reiniciar com sucesso, sincroniza também o webhook na VPS
    setEvolutionWebhook(instanceName).catch((err) =>
      console.warn('[Evolution API] Falha ao sincronizar webhook após reinicialização:', err)
    );

    return { success: true };
  } catch (error: any) {
    console.error('[Evolution API] restartEvolutionInstance Error:', error);
    return { success: false, error: error?.message || 'Erro ao reiniciar instância.' };
  }
}

/**
 * Desconecta a sessão Baileys na Evolution API
 * DELETE /instance/logout/{instanceName}
 */
export async function logoutEvolutionInstance(instanceName: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { apiUrl, apiKey } = getEvolutionConfig();

    const response = await fetch(
      `${apiUrl}/instance/logout/${encodeURIComponent(instanceName)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: apiKey,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errText = await response.text();
      return { success: false, error: `Falha ao desconectar instância: ${errText}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Evolution API] logoutEvolutionInstance Error:', error);
    return { success: false, error: error?.message || 'Erro ao desconectar instância.' };
  }
}

/**
 * Wrapper de envio de texto transacional mantendo compatibilidade com rotas e cron jobs existentes
 */
export async function sendEvolutionTextMessage(
  instanceName: string,
  toPhone: string,
  message: string
): Promise<{ success: boolean; error?: string; mock?: boolean }> {
  const result = await sendTextMessage({
    instanceName,
    number: toPhone,
    text: message,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}

/**
 * Configura ou atualiza o webhook para uma instância na Evolution API v2
 * POST /webhook/set/{instanceName}
 */
export async function setEvolutionWebhook(
  instanceName: string,
  webhookUrl?: string,
  hookToken?: string
): Promise<EvolutionApiResult<{ id?: string; url: string; enabled: boolean }>> {
  try {
    const { apiUrl, apiKey } = getEvolutionConfig();

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'flowagenda.online';
    const defaultWebhookUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')}/api/webhooks/evolution`
      : `https://${rootDomain}/api/webhooks/evolution`;

    const targetUrl = webhookUrl || defaultWebhookUrl;
    const targetToken = hookToken || process.env.EVOLUTION_WEBHOOK_SECRET || process.env.HOOK_TOKEN || process.env.EVOLUTION_API_KEY || '';

    const payload = {
      webhook: {
        enabled: true,
        url: targetUrl,
        byEvents: false,
        base64: false,
        headers: {
          'apikey': targetToken,
          'x-hook-token': targetToken,
        },
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      },
    };

    const response = await fetch(`${apiUrl}/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: `Falha ao configurar webhook (HTTP ${response.status}): ${errText}`,
      };
    }

    const data = await response.json();
    console.log(`[Evolution API] Webhook configurado com sucesso para ${instanceName} -> ${targetUrl}`);
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('[Evolution API] setEvolutionWebhook Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao registrar webhook na Evolution API.',
    };
  }
}

