/**
 * ==============================================================================
 * FlowAgenda — Integração Asaas API v3 (Clientes, Pix & Estornos)
 * Arquivo: lib/asaas.ts
 * ==============================================================================
 */

export interface CreateAsaasCustomerInput {
  name: string;
  phone?: string;
  externalReference: string;
}

export interface CreateAsaasPixInput {
  customerId: string;
  value: number;
  description: string;
  externalReference?: string;
}

export interface AsaasPixResult {
  id: string;
  value: number;
  encodedImage: string;
  payload: string;
  expirationDate?: string;
}

function getAsaasConfig() {
  const asaasUrl = (process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3').replace(/\/+$/, '');
  const apiKey = process.env.ASAAS_API_KEY || '';
  return { asaasUrl, apiKey };
}

/**
 * Cria ou recupera cliente no Asaas
 */
export async function createAsaasCustomer(data: CreateAsaasCustomerInput): Promise<{ id: string }> {
  const { asaasUrl, apiKey } = getAsaasConfig();

  if (!apiKey) {
    console.warn('[Asaas] ASAAS_API_KEY não encontrada. Simulando customerId.');
    return { id: 'cus_mock_asaas_123' };
  }

  try {
    const response = await fetch(`${asaasUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify({
        name: data.name,
        phone: data.phone,
        externalReference: data.externalReference,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha ao criar cliente no Asaas (HTTP ${response.status}): ${errText}`);
    }

    const json = (await response.json()) as { id: string };
    return { id: json.id };
  } catch (error) {
    console.error('[Asaas] createAsaasCustomer Erro:', error);
    throw error;
  }
}

/**
 * Cria cobrança PIX imediata no Asaas e busca o QRCode (base64) e o código Copia e Cola
 */
export async function createAsaasPixPayment(data: CreateAsaasPixInput): Promise<AsaasPixResult> {
  const { asaasUrl, apiKey } = getAsaasConfig();

  if (!apiKey) {
    console.warn('[Asaas] ASAAS_API_KEY ausente. Retornando mock PIX para desenvolvimento.');
    return {
      id: `pay_mock_${Date.now()}`,
      value: data.value,
      encodedImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      payload: '00020101021226840014br.gov.bcb.pix0136flowagenda-mock-pix-payload5204000053039865802BR5925FlowAgenda6009SaoPaulo62070503***6304ABCD',
    };
  }

  try {
    // 1. Criar a cobrança Pix
    const today = new Date().toISOString().split('T')[0];
    const paymentResponse = await fetch(`${asaasUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify({
        customer: data.customerId,
        billingType: 'PIX',
        value: data.value,
        dueDate: today,
        description: data.description,
        externalReference: data.externalReference,
      }),
    });

    if (!paymentResponse.ok) {
      const errText = await paymentResponse.text();
      throw new Error(`Falha ao criar cobrança Pix no Asaas (HTTP ${paymentResponse.status}): ${errText}`);
    }

    const paymentJson = (await paymentResponse.json()) as { id: string; value: number };

    // 2. Buscar o QR Code e o Copia e Cola Pix
    const qrResponse = await fetch(`${asaasUrl}/payments/${paymentJson.id}/pixQrCode`, {
      method: 'GET',
      headers: {
        access_token: apiKey,
      },
    });

    if (!qrResponse.ok) {
      const errText = await qrResponse.text();
      throw new Error(`Falha ao obter QR Code Pix no Asaas (HTTP ${qrResponse.status}): ${errText}`);
    }

    const qrJson = (await qrResponse.json()) as {
      encodedImage: string;
      payload: string;
      expirationDate?: string;
    };

    return {
      id: paymentJson.id,
      value: paymentJson.value || data.value,
      encodedImage: qrJson.encodedImage,
      payload: qrJson.payload,
      expirationDate: qrJson.expirationDate,
    };
  } catch (error) {
    console.error('[Asaas] createAsaasPixPayment Erro:', error);
    throw error;
  }
}

/**
 * Realiza estorno total ou parcial de uma cobrança no Asaas
 */
export async function refundAsaasPayment(
  paymentId: string,
  value?: number,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const { asaasUrl, apiKey } = getAsaasConfig();

  if (!apiKey || paymentId.startsWith('pay_mock_')) {
    console.warn(`[Asaas] Simulando estorno do pagamento ${paymentId}.`);
    return { success: true };
  }

  try {
    const bodyPayload: Record<string, unknown> = {};
    if (value !== undefined) bodyPayload.value = value;
    if (description) bodyPayload.description = description;

    const response = await fetch(`${asaasUrl}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Asaas] Falha no estorno do pagamento ${paymentId}:`, errText);
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao processar estorno Asaas';
    console.error('[Asaas] refundAsaasPayment Exceção:', error);
    return { success: false, error: msg };
  }
}
