export async function addDomainToVercel(domain: string) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_API_TOKEN;

  if (!projectId || !token) {
    console.warn("Vercel API credentials not found. Skipping domain provisioning (Mock mode).");
    return { mock: true, domain };
  }

  const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: domain })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to add domain to Vercel.");
  }

  return data;
}
