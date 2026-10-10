export async function createEvolutionInstance(instanceName: string) {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const globalApiKey = process.env.EVOLUTION_API_KEY;

  if (!evolutionUrl || !globalApiKey) {
    console.warn("Evolution API credentials not found. Skipping instance creation (Mock mode).");
    return { token: "mock_evolution_token_123" };
  }

  try {
    const response = await fetch(`${evolutionUrl}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": globalApiKey,
      },
      body: JSON.stringify({
        instanceName,
        token: instanceName,
        qrcode: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Evolution instance: ${await response.text()}`);
    }

    const data = await response.json();
    return {
      token: data.hash?.apikey || data.instance?.token || "token_not_returned",
    };
  } catch (error) {
    console.error("Evolution API Error:", error);
    throw error;
  }
}

export async function fetchInstanceConnectionStatus(instanceName: string) {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const globalApiKey = process.env.EVOLUTION_API_KEY;

  if (!evolutionUrl || !globalApiKey) {
    // Mock Response
    return {
      instanceName,
      state: "close", // 'open', 'close', 'connecting'
      statusReason: 401,
      qrcode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==", // 1x1 transparent base64 for mock
    };
  }

  try {
    const response = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": globalApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch instance state`);
    }

    const data = await response.json();
    
    // Get QR Code if disconnected
    let qrcode = null;
    if (data.instance?.state !== 'open') {
      const qrResponse = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: "GET",
        headers: { "apikey": globalApiKey },
      });
      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        qrcode = qrData.base64;
      }
    }

    return {
      instanceName,
      state: data.instance?.state || 'close',
      qrcode,
    };
  } catch (error) {
    console.error("Evolution API Error:", error);
    // Return mock on network failure for dev environments
    return {
      instanceName,
      state: "close",
      qrcode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
    };
  }
}

export async function restartEvolutionInstance(instanceName: string) {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const globalApiKey = process.env.EVOLUTION_API_KEY;

  if (!evolutionUrl || !globalApiKey) {
    return { success: true, message: "Mock: instância reiniciada com sucesso." };
  }

  try {
    const response = await fetch(`${evolutionUrl}/instance/restart/${instanceName}`, {
      method: "POST",
      headers: {
        "apikey": globalApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao reiniciar instância: ${await response.text()}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Evolution Restart Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function logoutEvolutionInstance(instanceName: string) {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const globalApiKey = process.env.EVOLUTION_API_KEY;

  if (!evolutionUrl || !globalApiKey) {
    return { success: true, message: "Mock: instância desconectada com sucesso." };
  }

  try {
    const response = await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: {
        "apikey": globalApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao desconectar instância: ${await response.text()}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Evolution Logout Error:", error);
    return { success: false, error: (error as Error).message };
  }
}

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

export async function sendEvolutionTextMessage(
  instanceName: string,
  toPhone: string,
  message: string
) {
  const cleanPhone = toPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const masked = maskPhoneNumber(formattedPhone);

  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const globalApiKey = process.env.EVOLUTION_API_KEY;

  if (!evolutionUrl || !globalApiKey) {
    console.log(`[EVOLUTION API MOCK] Disparo transacional para ${masked}:`);
    console.log(`[CONTEÚDO]:\n${message}\n`);
    return { success: true, mock: true };
  }

  try {
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": globalApiKey,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[EVOLUTION API] Falha no disparo para ${masked}:`, errText);
      return { success: false, error: errText };
    }

    console.log(`[EVOLUTION API] Mensagem transacional entregue com sucesso para ${masked}.`);
    return { success: true };
  } catch (error) {
    console.error(`[EVOLUTION API] Erro ao enviar mensagem para ${masked}:`, error);
    return { success: false, error: (error as Error).message };
  }
}
