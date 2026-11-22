/**
 * ==============================================================================
 * FlowAgenda — Contato Comercial Oficial & Blindagem Contra Env Zumbi
 * Arquivo: lib/brand-contact.ts
 * ==============================================================================
 */

export const FLOWAGENDA_WHATSAPP_OFFICIAL = '5531984139736';

/**
 * Normaliza o número de WhatsApp comercial do FlowAgenda, rejeitando
 * explicitamente placeholders ou variáveis de ambiente antigas com zeros
 * (ex: 5500000000000) e garantindo fallback obrigatório para 5531984139736.
 */
export function resolveBrandWhatsAppNumber(raw?: string | null): string {
  const digits = (raw || '').replace(/\D/g, '');

  if (
    !digits ||
    digits.length < 12 ||
    digits.includes('00000000') ||
    digits === '5500000000000' ||
    /^(\d)\1{7,}$/.test(digits.slice(2))
  ) {
    return FLOWAGENDA_WHATSAPP_OFFICIAL;
  }

  return digits;
}

export function getFlowAgendaWhatsAppNumber(): string {
  return resolveBrandWhatsAppNumber(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
      process.env.NEXT_PUBLIC_WHATSAPP_COMERCIAL
  );
}

export function getFlowAgendaWhatsAppUrl(mensagem?: string): string {
  const num = getFlowAgendaWhatsAppNumber();
  const base = `https://wa.me/${num}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
