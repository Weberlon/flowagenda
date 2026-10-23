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
 * Normaliza e sanitiza valores para evitar que "undefined", "null" ou vazios
 * vazem para a mensagem final enviada ao cliente via WhatsApp.
 */
function resolverValoresSeguros(dados: DadosTemplateAgendamento) {
  return {
    cliente: dados.cliente?.trim() || 'Cliente',
    data: dados.data?.trim() || 'Data agendada',
    horario: dados.horario?.trim() || 'Horário agendado',
    servico: dados.servico?.trim() || 'Serviço',
    profissional: dados.profissional?.trim() || 'Equipe',
    estabelecimento: dados.estabelecimento?.trim() || 'nosso estabelecimento',
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
