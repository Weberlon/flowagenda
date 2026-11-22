/**
 * Ponte de compatibilidade que reexporta as configurações de @/config/contact e @/lib/brand-contact.
 */
import { CONTACT_CONFIG, DEFAULT_FLOWAGENDA_WHATSAPP } from '@/config/contact';
import { getFlowAgendaWhatsAppNumber } from '@/lib/brand-contact';

export { CONTACT_CONFIG, DEFAULT_FLOWAGENDA_WHATSAPP };
export type { BillingCycle } from '@/config/contact';

export function getWhatsAppComercialNumber(): string {
  return getFlowAgendaWhatsAppNumber() || DEFAULT_FLOWAGENDA_WHATSAPP;
}

export function getWhatsAppComercialUrl(mensagem?: string): string {
  const encoded = mensagem ? encodeURIComponent(mensagem) : undefined;
  return CONTACT_CONFIG.getUrl(encoded);
}
