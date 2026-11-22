/**
 * Ponte de compatibilidade que reexporta as configurações de @/config/contact.
 */
import { CONTACT_CONFIG, DEFAULT_FLOWAGENDA_WHATSAPP } from '@/config/contact';

export { CONTACT_CONFIG };
export type { BillingCycle } from '@/config/contact';

export function getWhatsAppComercialNumber(): string {
  return CONTACT_CONFIG.whatsappNumber.replace(/\D/g, '') || DEFAULT_FLOWAGENDA_WHATSAPP;
}

export function getWhatsAppComercialUrl(mensagem?: string): string {
  const encoded = mensagem ? encodeURIComponent(mensagem) : undefined;
  return CONTACT_CONFIG.getUrl(encoded);
}
