/**
 * ==============================================================================
 * FlowAgenda — Motor de Interpolação de Templates de WhatsApp
 * Arquivo: lib/whatsapp/template-engine.ts
 * ==============================================================================
 *
 * Responsável pela compilação dinâmica, segura e resiliente das mensagens
 * transacionais do WhatsApp (confirmações e lembretes).
 */

export interface DadosTemplateAgendamento {
  cliente?: string | null;
  data?: string | null;
  horario?: string | null;
  servico?: string | null;
  profissional?: string | null;
  estabelecimento?: string | null;
}

export type TipoMensagemWhatsApp = 'confirmacao' | 'lembrete';

// Templates padrão oficiais no padrão pt-BR com quebras de linha nativas (\n)
export const TEMPLATE_PADRAO_CONFIRMACAO =
  `🎉 *Agendamento Confirmado!*\n\nOlá, {cliente}!\nSeu horário no *{estabelecimento}* está garantido.\n\n📅 *Data:* {data}\n⏰ *Horário:* {horario}\n✂️ *Serviço:* {servico}\n👤 *Profissional:* {profissional}\n\nEsperamos você! Caso precise reagendar ou cancelar, entre em contato com antecedência.`;

export const TEMPLATE_PADRAO_LEMBRETE =
  `Olá, {cliente}! ⏰\n\nPassando para lembrar do seu agendamento no *{estabelecimento}*:\n\n📅 *Data:* {data}\n⏰ *Horário:* às {horario}\n✂️ *Serviço:* {servico}\n👤 *Profissional:* {profissional}\n\nJá estamos preparando tudo para receber você! Caso tenha algum imprevisto ou precise reagendar, avise com antecedência. 🤝`;

export const TEMPLATES_PADRAO: Record<TipoMensagemWhatsApp, string> = {
  confirmacao: TEMPLATE_PADRAO_CONFIRMACAO,
  lembrete: TEMPLATE_PADRAO_LEMBRETE,
};

/**
 * Sanitiza campos de texto de linha única fornecidos por usuários / clientes,
 * removendo quebras de linha acidentais ou maliciosas, caracteres de controle
 * e limitando o tamanho para evitar injeção de texto ou sobrecarga no WhatsApp.
 */
function sanitizarCampoLinhaUnica(valor: string | null | undefined, maxLen = 80): string {
  if (!valor) return '';
  return valor
    .replace(/[\r\n\t]/g, ' ')                      // Impede injeção de novas linhas / parágrafos falsos
    .replace(/[\u0000-\u001F\u202A-\u202E]/g, '')   // Remove caracteres não-imprimíveis e RTL override
    .replace(/\s+/g, ' ')                           // Colapsa espaços redundantes
    .trim()
    .slice(0, maxLen);
}

/**
 * Normaliza e sanitiza valores para evitar que "undefined", "null" ou vazios
 * vazem para a mensagem final enviada ao cliente via WhatsApp.
 */
function resolverValoresSeguros(dados: DadosTemplateAgendamento) {
  return {
    cliente: sanitizarCampoLinhaUnica(dados.cliente, 60) || 'Cliente',
    data: sanitizarCampoLinhaUnica(dados.data, 30) || 'Data agendada',
    horario: sanitizarCampoLinhaUnica(dados.horario, 20) || 'Horário agendado',
    servico: sanitizarCampoLinhaUnica(dados.servico, 60) || 'Serviço',
    profissional: sanitizarCampoLinhaUnica(dados.profissional, 60) || 'Equipe',
    estabelecimento: sanitizarCampoLinhaUnica(dados.estabelecimento, 80) || 'nosso estabelecimento',
  };
}

/**
 * Converte acidentais tags HTML (<br>, <br/>, <p>) em quebras de linha \n
 * e remove quaisquer outras tags HTML residuais.
 */
function sanitizarQuebrasDeLinha(texto: string): string {
  return texto
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
}

/**
 * Compila e interpola com segurança as variáveis dinâmicas em uma mensagem do WhatsApp.
 *
 * @param templateCustomizado Template salvo pelo lojista (se nulo/vazio, usa o padrão do tipo).
 * @param tipo 'confirmacao' ou 'lembrete'
 * @param dados Objeto contendo os dados do agendamento
 * @returns Mensagem formatada e pronta para envio via WhatsApp (Evolution API)
 */
export function compilarMensagemWhatsApp(
  templateCustomizado: string | null | undefined,
  tipo: TipoMensagemWhatsApp,
  dados: DadosTemplateAgendamento
): string {
  // 1. Obter o template base ou recorrer ao fallback padrão
  const templateBase =
    templateCustomizado && templateCustomizado.trim().length > 0
      ? templateCustomizado.trim()
      : TEMPLATES_PADRAO[tipo] || TEMPLATE_PADRAO_CONFIRMACAO;

  // 2. Higienizar possíveis quebras de linha em formato HTML
  let mensagem = sanitizarQuebrasDeLinha(templateBase);

  // 3. Resolver fallbacks estritos para nunca exibir "undefined" ou "null"
  const valores = resolverValoresSeguros(dados);

  // 4. Mapeamento de variáveis permitidas (suportando {variavel} e variações de alias)
  const mapaVariaveis: Record<string, string> = {
    '{cliente}': valores.cliente,
    '{nome}': valores.cliente,
    '{data}': valores.data,
    '{horario}': valores.horario,
    '{hora}': valores.horario,
    '{servico}': valores.servico,
    '{procedimento}': valores.servico,
    '{profissional}': valores.profissional,
    '{estabelecimento}': valores.estabelecimento,
    '{loja}': valores.estabelecimento,
  };

  // 5. Substituição segura e global das chaves
  for (const [tag, valor] of Object.entries(mapaVariaveis)) {
    const escapedTag = tag.replace(/[{}]/g, '\\$&');
    const regex = new RegExp(escapedTag, 'gi');
    mensagem = mensagem.replace(regex, valor);
  }

  // 6. Normalização final de quebras de linha consecutivas excessivas e espaços
  return mensagem
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
