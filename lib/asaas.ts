export async function createAsaasCustomer(data: { name: string; externalReference: string }) {
  const asaasUrl = "https://sandbox.asaas.com/api/v3"; // Mudar para produção conforme a necessidade
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    console.warn("Asaas API Key not found. Skipping customer creation.");
    return { id: "cus_mock_asaas_123" };
  }

  try {
    const response = await fetch(`${asaasUrl}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
      },
      body: JSON.stringify({
        name: data.name,
        externalReference: data.externalReference,
        // E-mail e CPF seriam ideais, mas para simplificar vamos criar com os dados mínimos aceitos.
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Asaas customer: ${await response.text()}`);
    }

    const json = await response.json();
    return {
      id: json.id,
    };
  } catch (error) {
    console.error("Asaas API Error:", error);
    throw error;
  }
}
