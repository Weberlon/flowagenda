// ==============================================================================
// FlowAgenda — Parser de Mensagens e Classificador de Intenção do WhatsApp
// Arquivo: lib/whatsapp-parser.ts
// ==============================================================================

export type IntencaoResposta = 'CONFIRMAR' | 'REMARCAR_CANCELAR' | 'TEXTO_LIVRE';

export interface MensagemProcessada {
  messageId: string;
  telefoneLimpo: string;
  ultimosOitoDigitos: string;
  texto: string;
  tipoMidia?: string | null;
  isFromMe: boolean;
  isGroupOrBroadcast: boolean;
  pushName?: string;
}

/**
 * Normaliza um texto removendo acentuação, espaços extras e convertendo para minúsculas
 */
function normalizarTexto(texto: string): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim();
}

/**
 * Extrai dados consolidados e normalizados de uma mensagem recebida via Evolution API v2
 */
export function extrairDadosMensagem(body: any): MensagemProcessada | null {
  if (!body) return null;

  // Compatibilidade com diferentes variações de payload da Evolution API
  const dataItem = Array.isArray(body.data) ? body.data[0] : (body.data || body);
  const messageContainer = dataItem?.message || dataItem;
  const key = dataItem?.key || messageContainer?.key;

  const remoteJid: string | undefined = key?.remoteJid || dataItem?.remoteJid;
  if (!remoteJid || typeof remoteJid !== 'string') {
    return null;
  }

  const messageId: string = key?.id || dataItem?.id || `msg_${Date.now()}`;
  const isFromMe: boolean = Boolean(key?.fromMe ?? dataItem?.fromMe);

  // Identificação de grupos (@g.us) e canais / transmissões (@broadcast ou status@broadcast)
  const isGroupOrBroadcast: boolean =
    remoteJid.includes('@g.us') ||
    remoteJid.includes('@broadcast') ||
    remoteJid.toLowerCase().includes('status@broadcast');

  // Sanitização de telefone (apenas números)
  const cleanPhone = remoteJid.replace(/@.*$/, '').replace(/\D/g, '');
  const ultimosOitoDigitos = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;

  // Extração do conteúdo da mensagem (Baileys message content)
  const innerMsg = messageContainer?.message || messageContainer;
  let texto = '';
  let tipoMidia: string | null = null;

  if (typeof innerMsg?.conversation === 'string' && innerMsg.conversation.trim()) {
    texto = innerMsg.conversation;
  } else if (typeof innerMsg?.extendedTextMessage?.text === 'string' && innerMsg.extendedTextMessage.text.trim()) {
    texto = innerMsg.extendedTextMessage.text;
  } else if (typeof innerMsg?.imageMessage?.caption === 'string' && innerMsg.imageMessage.caption.trim()) {
    texto = innerMsg.imageMessage.caption;
    tipoMidia = 'image';
  } else if (typeof innerMsg?.videoMessage?.caption === 'string' && innerMsg.videoMessage.caption.trim()) {
    texto = innerMsg.videoMessage.caption;
    tipoMidia = 'video';
  } else if (typeof innerMsg?.documentMessage?.caption === 'string' && innerMsg.documentMessage.caption.trim()) {
    texto = innerMsg.documentMessage.caption;
    tipoMidia = 'document';
  } else if (innerMsg?.audioMessage) {
    tipoMidia = 'audio';
    texto = '[Áudio recebido]';
  } else if (innerMsg?.imageMessage) {
    tipoMidia = 'image';
  } else if (innerMsg?.videoMessage) {
    tipoMidia = 'video';
  } else if (innerMsg?.documentMessage) {
    tipoMidia = 'document';
  } else if (innerMsg?.stickerMessage) {
    tipoMidia = 'sticker';
  } else if (typeof dataItem?.text === 'string' && dataItem.text.trim()) {
    texto = dataItem.text;
  }

  const pushName: string | undefined =
    dataItem?.pushName || body?.pushName || undefined;

  return {
    messageId,
    telefoneLimpo: cleanPhone,
    ultimosOitoDigitos,
    texto: texto.trim(),
    tipoMidia,
    isFromMe,
    isGroupOrBroadcast,
    pushName,
  };
}

/**
 * Classifica a intenção da resposta do cliente no WhatsApp:
 * - CONFIRMAR: '1', 'sim', 'confirmo', 'confirmado', 'ok', 'vou sim'
 * - REMARCAR_CANCELAR: '2', 'nao', 'remarcar', 'cancelar', 'reagendar', 'desmarcar'
 * - TEXTO_LIVRE: Qualquer outro input (áudio, dúvida, atraso, texto aleatório)
 */
export function classificarIntencao(texto: string): IntencaoResposta {
  const normalizado = normalizarTexto(texto);
  if (!normalizado) return 'TEXTO_LIVRE';

  // Remove pontuações de fechamento comuns como ponto, exclamação ou aspas
  const limpo = normalizado.replace(/[.,!?;:\"\'\-]/g, ' ').replace(/\s+/g, ' ').trim();

  // Regex para Confirmação:
  // Match exato ou inicial claro para: 1, sim, confirmo, confirmado, ok, vou sim
  const REGEX_CONFIRMAR = /^(1|sim|confirmo|confirmado|ok|vou sim)(\b|\s.*)?$/i;
  // Expressões exatas ou correspondências diretas
  const isConfirmacaoExata = /^(1|sim|confirmo|confirmado|ok|vou sim)$/i.test(limpo);
  if (isConfirmacaoExata || REGEX_CONFIRMAR.test(limpo)) {
    // Evita falsos positivos como "sim, mas vou atrasar" ou "sim quero cancelar"
    const temNegacaoOuRemarcacao = /\b(nao|cancelar|remarcar|reagendar|desmarcar|atrasar|duvida)\b/i.test(limpo);
    if (!temNegacaoOuRemarcacao) {
      return 'CONFIRMAR';
    }
  }

  // Regex para Cancelamento / Remarcação:
  // Match para: 2, nao, remarcar, cancelar, reagendar, desmarcar
  const REGEX_CANCELAR = /^(2|nao|remarcar|cancelar|reagendar|desmarcar)(\b|\s.*)?$/i;
  const isCancelamentoExato = /^(2|nao|remarcar|cancelar|reagendar|desmarcar)$/i.test(limpo);
  const temPalavraCancelamento = /\b(remarcar|cancelar|reagendar|desmarcar|nao vou|nao poderei|nao consigo|nao posso)\b/i.test(limpo);

  if (isCancelamentoExato || REGEX_CANCELAR.test(limpo) || temPalavraCancelamento) {
    return 'REMARCAR_CANCELAR';
  }

  return 'TEXTO_LIVRE';
}
