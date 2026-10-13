/**
 * Configuração centralizada do WhatsApp Comercial do FlowAgenda.
 * Permite alternar o número comercial através de variáveis de ambiente sem alterar código.
 */

export function getWhatsAppComercialNumber(): string {
  const envNumber = process.env.NEXT_PUBLIC_WHATSAPP_COMERCIAL;
  if (envNumber) {
    const limpo = envNumber.replace(/\D/g, '');
    if (limpo.length >= 10) return limpo;
  }
  // Fallback padrão enquanto o chip oficial não estiver configurado
  return '5500000000000';
}

export function getWhatsAppComercialUrl(mensagem?: string): string {
  const numero = getWhatsAppComercialNumber();
  const baseUrl = `https://wa.me/${numero}`;
  if (!mensagem) return baseUrl;
  return `${baseUrl}?text=${encodeURIComponent(mensagem)}`;
}
