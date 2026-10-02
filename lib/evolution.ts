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
