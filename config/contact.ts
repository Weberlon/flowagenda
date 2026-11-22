export type BillingCycle = 'monthly' | 'semiannual' | 'annual';

export const DEFAULT_FLOWAGENDA_WHATSAPP = '5531984139736';

function normalizeWhatsAppDigits(raw?: string | null): string {
  const digits = (raw || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : DEFAULT_FLOWAGENDA_WHATSAPP;
}

export const CONTACT_CONFIG = {
  // Lê do .env.local; se não existir, usa fallback oficial do FlowAgenda
  whatsappNumber: normalizeWhatsAppDigits(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
      process.env.NEXT_PUBLIC_WHATSAPP_COMERCIAL
  ),

  getConsultantMessage: () => {
    return encodeURIComponent(
      'Olá! Vi a demonstração do FlowAgenda no site e gostaria de falar com um consultor para tirar algumas dúvidas.'
    );
  },

  getActivationMessage: () => {
    return encodeURIComponent(
      'Olá! Gostaria de ativar o FlowAgenda para o meu estabelecimento comercial.'
    );
  },

  getPlanMessage: (planName: string, cycle: BillingCycle) => {
    const cycleLabels: Record<BillingCycle, string> = {
      monthly: 'Mensal',
      semiannual: 'Semestral (com 50% OFF no setup)',
      annual: 'Anual (com Setup 100% Grátis + 2 Meses OFF)',
    };
    return encodeURIComponent(
      `Olá! Tenho interesse em contratar o plano ${planName} no ciclo ${cycleLabels[cycle]}. Como posso prosseguir com a ativação?`
    );
  },

  getUrl: (encodedMessage?: string) => {
    const num = normalizeWhatsAppDigits(
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
        process.env.NEXT_PUBLIC_WHATSAPP_COMERCIAL
    );
    const base = `https://wa.me/${num}`;
    return encodedMessage ? `${base}?text=${encodedMessage}` : base;
  },
};
