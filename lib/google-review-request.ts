import {
  fetchInstanceConnectionStatus,
  maskPhoneNumber,
  sendWhatsAppMessage,
} from '@/lib/evolution';
import { getNicheDictionary } from '@/lib/niche-dictionary';

export interface SendGoogleReviewResult {
  success: boolean;
  alreadySent?: boolean;
  blockedByEthics?: boolean;
  missingReviewUrl?: boolean;
  sentAt?: string;
  error?: string;
}

async function resolveLojistaInstanceName(
  supabase: any,
  lojistaId: string,
  lojista: { whatsapp_instance_name?: string | null; slug_subdominio?: string | null }
): Promise<string | null> {
  if (lojista.whatsapp_instance_name?.trim()) {
    return lojista.whatsapp_instance_name.trim();
  }

  const { data: configRobo } = await supabase
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojistaId)
    .maybeSingle();

  if (configRobo?.instance_name?.trim()) {
    return configRobo.instance_name.trim();
  }

  if (lojista.slug_subdominio?.trim()) {
    const cleanSlug = lojista.slug_subdominio.trim().replace(/[^a-zA-Z0-9]/g, '_');
    return `flowagenda_${cleanSlug}`;
  }

  return null;
}

function buildReviewMessageByNiche(params: {
  nicheKey: string;
  nomeCliente: string;
  nomeEstabelecimento: string;
  reviewUrl: string;
}): string {
  const { nicheKey, nomeCliente, nomeEstabelecimento, reviewUrl } = params;

  switch (nicheKey) {
    case 'barbearia':
      return (
        `Fala, *${nomeCliente}*! 💈\n\n` +
        `Muito obrigado pela presença hoje na *${nomeEstabelecimento}*! Esperamos que tenha curtido o visual.\n\n` +
        `Se puder deixar sua avaliação de 5 estrelas no Google, ajuda muito nosso trabalho (leva menos de 30 segundinhos):\n👉 ${reviewUrl}`
      );
    case 'salao_beleza':
      return (
        `Olá, *${nomeCliente}*! 💇‍♀️✨\n\n` +
        `Foi um prazer receber você hoje no *${nomeEstabelecimento}*! Esperamos que tenha amado o resultado.\n\n` +
        `Sua opinião é muito importante para nós! Poderia nos avaliar com 5 estrelas no Google?\n👉 ${reviewUrl}`
      );
    case 'estetica_beleza':
      return (
        `Olá, *${nomeCliente}*! ✨\n\n` +
        `Agradecemos muito pela sua visita hoje na *${nomeEstabelecimento}*.\n\n` +
        `Se ficou satisfeito(a) com o atendimento, ficaremos muito felizes com sua avaliação no Google:\n👉 ${reviewUrl}`
      );
    case 'clinica_odonto':
      return (
        `Olá, *${nomeCliente}*! 🦷✨\n\n` +
        `Agradecemos pela confiança na equipe da *${nomeEstabelecimento}*! Cuidar do seu sorriso é nossa prioridade.\n\n` +
        `Se puder compartilhar sua experiência deixando uma avaliação no Google, ajuda outros pacientes a nos encontrarem:\n👉 ${reviewUrl}`
      );
    case 'pet_shop':
      return (
        `Olá, *${nomeCliente}*! 🐾💛\n\n` +
        `Muito obrigado por confiar o cuidado do seu pet à *${nomeEstabelecimento}* hoje!\n\n` +
        `Se gostou do nosso carinho e atendimento, poderia nos avaliar no Google? Leva só um minutinho:\n👉 ${reviewUrl}`
      );
    case 'tatuagem':
      return (
        `E aí, *${nomeCliente}*! 🖤✨\n\n` +
        `Obrigado por escolher o *${nomeEstabelecimento}* para sua sessão de hoje!\n\n` +
        `Se curtiu a experiência e o trabalho, deixa uma avaliação pra gente no Google:\n👉 ${reviewUrl}`
      );
    default:
      return (
        `Olá, *${nomeCliente}*! ⭐\n\n` +
        `Muito obrigado pelo seu atendimento hoje no *${nomeEstabelecimento}*!\n\n` +
        `Sua avaliação é muito importante para nós. Poderia nos deixar 5 estrelas no Google? Leva menos de 30 segundos:\n👉 ${reviewUrl}`
      );
  }
}

/**
 * Envia solicitação idempotente de avaliação no Google Meu Negócio via Evolution API v2,
 * bloqueando o nicho psicologia (LGPD/CRP) e impedindo reenvios para o mesmo agendamento.
 */
export async function sendGoogleReviewRequest(params: {
  supabase: any;
  lojistaId: string;
  agendamentoId: string;
}): Promise<SendGoogleReviewResult> {
  const { supabase, lojistaId, agendamentoId } = params;

  if (!lojistaId || !agendamentoId) {
    return {
      success: false,
      error: 'Identificadores do estabelecimento ou agendamento ausentes.',
    };
  }

  // 1. Buscar agendamento isolado por lojista_id
  const baseFields =
    'id, lojista_id, cliente_id, status, cliente_nome, cliente_telefone, avaliacao_enviada_at';

  let agendamento: any = null;
  const { data: agData, error: agErr } = await supabase
    .from('agendamentos')
    .select(`${baseFields}, avaliacao_enviada`)
    .eq('id', agendamentoId)
    .eq('lojista_id', lojistaId)
    .maybeSingle();

  if (agErr && agErr.message?.includes('avaliacao_enviada')) {
    const { data: fallbackAg } = await supabase
      .from('agendamentos')
      .select(baseFields)
      .eq('id', agendamentoId)
      .eq('lojista_id', lojistaId)
      .maybeSingle();
    agendamento = fallbackAg;
  } else {
    agendamento = agData;
  }

  if (!agendamento) {
    return { success: false, error: 'Agendamento não encontrado para este estabelecimento.' };
  }

  // 2. Validar status elegível (confirmado ou concluido)
  if (!['confirmado', 'concluido'].includes(agendamento.status)) {
    return {
      success: false,
      error: 'Apenas agendamentos confirmados ou concluídos podem receber pedido de avaliação.',
    };
  }

  // 3. Idempotência real via avaliacao_enviada e avaliacao_enviada_at
  if (agendamento.avaliacao_enviada === true || Boolean(agendamento.avaliacao_enviada_at)) {
    return {
      success: false,
      alreadySent: true,
      sentAt: agendamento.avaliacao_enviada_at || undefined,
      error: 'Solicitação de avaliação já enviada anteriormente para este agendamento.',
    };
  }

  // 4. Carregar dados do lojista e cliente
  const [{ data: lojista }, { data: cliente }] = await Promise.all([
    supabase
      .from('lojistas')
      .select(
        'id, nome_estabelecimento, nome_negocio, slug_subdominio, whatsapp_instance_name, business_niche, google_review_url'
      )
      .eq('id', lojistaId)
      .maybeSingle(),
    agendamento.cliente_id
      ? supabase
          .from('clientes')
          .select('nome, telefone')
          .eq('id', agendamento.cliente_id)
          .eq('lojista_id', lojistaId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!lojista) {
    return { success: false, error: 'Dados do estabelecimento não encontrados.' };
  }

  // 5. Bloqueio ético para Psicologia
  const nicheDict = getNicheDictionary(lojista.business_niche || 'geral');
  if (nicheDict.features.hasProntuarioPsico) {
    return {
      success: false,
      blockedByEthics: true,
      error:
        'Pedidos públicos de avaliação no Google são desabilitados para o nicho de Psicologia conforme diretrizes éticas (CRP) e LGPD.',
    };
  }

  // 6. Validar link configurado do Google Meu Negócio
  const reviewUrl = (lojista.google_review_url || '').trim();
  if (!reviewUrl || !/^https?:\/\//i.test(reviewUrl)) {
    return {
      success: false,
      missingReviewUrl: true,
      error:
        'Configure o Link de Avaliação no Google Meu Negócio na aba Configurações antes de enviar.',
    };
  }

  const nomeCliente = (agendamento.cliente_nome || cliente?.nome || 'Cliente').trim();
  const telefoneRaw = (agendamento.cliente_telefone || cliente?.telefone || '').replace(/\D/g, '');

  if (!telefoneRaw || telefoneRaw.length < 10) {
    return {
      success: false,
      error: 'O cliente não possui um número de WhatsApp válido cadastrado.',
    };
  }

  // 7. Verificar instância Evolution API v2 ativa do lojista
  const instanceName = await resolveLojistaInstanceName(supabase, lojistaId, lojista);
  if (!instanceName) {
    return {
      success: false,
      error: 'Instância do WhatsApp não configurada para este estabelecimento.',
    };
  }

  const connStatus = await fetchInstanceConnectionStatus(instanceName);
  if (connStatus.state !== 'open') {
    return {
      success: false,
      error:
        'WhatsApp desconectado. Conecte sua instância via QR Code nas Configurações antes de enviar.',
    };
  }

  // 8. Montar mensagem personalizada por nicho e enviar
  const nomeEstabelecimento =
    lojista.nome_negocio || lojista.nome_estabelecimento || 'Nosso Estabelecimento';

  const mensagem = buildReviewMessageByNiche({
    nicheKey: nicheDict.nicheKey,
    nomeCliente,
    nomeEstabelecimento,
    reviewUrl,
  });

  console.log(
    `[Avaliação Google] Enviando pedido de avaliação do agendamento ${agendamentoId} para ${maskPhoneNumber(
      telefoneRaw
    )} via instância "${instanceName}".`
  );

  const sendResult = await sendWhatsAppMessage({
    instanceName,
    number: telefoneRaw,
    text: mensagem,
  });

  if (!sendResult.success) {
    return {
      success: false,
      error: sendResult.error || 'Falha ao enviar solicitação de avaliação pelo WhatsApp.',
    };
  }

  // 9. Gravar flags de idempotência
  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('agendamentos')
    .update({
      avaliacao_enviada: true,
      avaliacao_enviada_at: nowIso,
      avaliacao_solicitada: true,
    })
    .eq('id', agendamentoId)
    .eq('lojista_id', lojistaId);

  if (updateErr) {
    await supabase
      .from('agendamentos')
      .update({ avaliacao_enviada_at: nowIso })
      .eq('id', agendamentoId)
      .eq('lojista_id', lojistaId);
  }

  return {
    success: true,
    sentAt: nowIso,
  };
}
