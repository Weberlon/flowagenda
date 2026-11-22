import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  fetchInstanceConnectionStatus,
  maskPhoneNumber,
  sendWhatsAppMessage,
} from '@/lib/evolution';
import { getNicheDictionary } from '@/lib/niche-dictionary';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'America/Sao_Paulo';

export interface SendAppointmentReminderResult {
  success: boolean;
  alreadySent?: boolean;
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

/**
 * Envia lembrete/confirmação transacional de agendamento via Evolution API v2
 * com isolamento estrito por lojista_id, adaptação por nicho e proteção idempotente.
 */
export async function sendAppointmentReminder(params: {
  supabase: any;
  lojistaId: string;
  agendamentoId: string;
}): Promise<SendAppointmentReminderResult> {
  const { supabase, lojistaId, agendamentoId } = params;

  if (!lojistaId || !agendamentoId) {
    return { success: false, error: 'Identificadores de estabelecimento ou agendamento ausentes.' };
  }

  // 1. Buscar agendamento garantindo pertencimento estrito ao lojista_id
  const baseFields =
    'id, lojista_id, cliente_id, servico_id, profissional_id, data_hora_inicio, status, cliente_nome, cliente_telefone, lembrete_enviado, lembrete_enviado_at';

  let agendamento: any = null;
  const { data: agData, error: agErr } = await supabase
    .from('agendamentos')
    .select(`${baseFields}, pet_id`)
    .eq('id', agendamentoId)
    .eq('lojista_id', lojistaId)
    .maybeSingle();

  if (agErr && agErr.message?.includes('pet_id')) {
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

  // 2. Validar status elegível
  const statusPermitidos = new Set([
    'confirmado',
    'pendente_pin',
    'locked',
    'awaiting_payment_confirmation',
  ]);
  if (!statusPermitidos.has(agendamento.status)) {
    return {
      success: false,
      error: `Agendamento com status "${agendamento.status}" não está elegível para lembrete.`,
    };
  }

  // 3. Controle anti-duplicidade (Idempotência)
  if (agendamento.lembrete_enviado_at || agendamento.lembrete_enviado === true) {
    return {
      success: false,
      alreadySent: true,
      sentAt: agendamento.lembrete_enviado_at || undefined,
      error: 'O lembrete deste agendamento já foi enviado anteriormente.',
    };
  }

  // 4. Carregar dados do lojista, cliente e serviço
  const [{ data: lojista }, { data: servico }, { data: cliente }] = await Promise.all([
    supabase
      .from('lojistas')
      .select('id, nome_estabelecimento, nome_negocio, slug_subdominio, whatsapp_instance_name, business_niche')
      .eq('id', lojistaId)
      .maybeSingle(),
    agendamento.servico_id
      ? supabase
          .from('servicos')
          .select('nome_servico')
          .eq('id', agendamento.servico_id)
          .eq('lojista_id', lojistaId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
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

  const nomeCliente = (agendamento.cliente_nome || cliente?.nome || 'Cliente').trim();
  const telefoneRaw = (agendamento.cliente_telefone || cliente?.telefone || '').replace(/\D/g, '');

  if (!telefoneRaw || telefoneRaw.length < 10) {
    return {
      success: false,
      error: 'O cliente não possui um número de WhatsApp válido cadastrado.',
    };
  }

  // 5. Verificar instância ativa da Evolution API v2 do próprio lojista
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
      error: 'WhatsApp desconectado. Conecte sua instância via QR Code nas Configurações antes de disparar lembretes.',
    };
  }

  // 6. Montar mensagem em PT-BR adaptada ao nicho
  const nicheDict = getNicheDictionary(lojista.business_niche || 'geral');
  const nomeEstabelecimento =
    lojista.nome_negocio || lojista.nome_estabelecimento || 'Estabelecimento';
  const nomeServico = servico?.nome_servico || nicheDict.agendamentoSingular;
  const dataHoraFormatada = dayjs(agendamento.data_hora_inicio)
    .tz(TIMEZONE)
    .format('DD/MM/YYYY [às] HH:mm');

  let mensagem = '';

  if (nicheDict.features.hasProntuarioPsico) {
    // Psicologia: sigilo absoluto (sem sintomas/demandas clínicas), apenas data, horário e modalidade
    let modalidadeTexto = 'Conforme combinado';
    if (agendamento.cliente_id) {
      const { data: triagem } = await supabase
        .from('fichas_clinicas')
        .select('dados_json')
        .eq('lojista_id', lojistaId)
        .eq('cliente_id', agendamento.cliente_id)
        .eq('tipo_ficha', 'triagem_ia')
        .maybeSingle();

      const mod = (triagem?.dados_json as any)?.triagemIa?.modalidade_preferida;
      if (mod) {
        modalidadeTexto = String(mod).toLowerCase().includes('online') ? 'Online' : 'Presencial';
      }
    }

    mensagem =
      `Olá, *${nomeCliente}*! 🌿\n\n` +
      `Passando com carinho para lembrar da sua sessão no *${nomeEstabelecimento}*:\n` +
      `🗓️ *Data e Horário:* ${dataHoraFormatada}\n` +
      `📍 *Modalidade:* ${modalidadeTexto}\n\n` +
      `Caso precise de qualquer ajuste de horário, responda esta mensagem. Estamos à disposição!`;
  } else if (nicheDict.features.hasPets) {
    // Pet Shop: incluir nome do pet quando disponível
    let nomePet: string | null = null;
    if (agendamento.pet_id) {
      const { data: petRow } = await supabase
        .from('pets')
        .select('nome')
        .eq('id', agendamento.pet_id)
        .eq('lojista_id', lojistaId)
        .maybeSingle();
      nomePet = petRow?.nome || null;
    } else if (agendamento.cliente_id) {
      const { data: firstPet } = await supabase
        .from('pets')
        .select('nome')
        .eq('cliente_id', agendamento.cliente_id)
        .eq('lojista_id', lojistaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      nomePet = firstPet?.nome || null;
    }

    const trechoPet = nomePet ? ` de *${nomePet}*` : '';
    mensagem =
      `Olá, *${nomeCliente}*! 🐾\n\n` +
      `Passando para lembrar do atendimento${trechoPet} no *${nomeEstabelecimento}*:\n` +
      `🗓️ *Data e Horário:* ${dataHoraFormatada}\n` +
      `✨ *Serviço:* ${nomeServico}\n\n` +
      `Estamos esperando vocês! Se precisar reagendar, basta responder esta mensagem.`;
  } else {
    mensagem =
      `Olá, *${nomeCliente}*! 📅\n\n` +
      `Passando para lembrar do seu agendamento no *${nomeEstabelecimento}*:\n` +
      `🗓️ *Data e Horário:* ${dataHoraFormatada}\n` +
      `✨ *Serviço:* ${nomeServico}\n\n` +
      `Já estamos preparando tudo para receber você! Caso precise reagendar, responda esta mensagem. 🤝`;
  }

  // 7. Disparar mensagem pela Evolution API v2
  console.log(
    `[Lembrete Manual] Enviando lembrete do agendamento ${agendamentoId} para ${maskPhoneNumber(
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
      error: sendResult.error || 'Falha ao enviar mensagem pelo WhatsApp.',
    };
  }

  // 8. Registrar flag anti-duplicidade
  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('agendamentos')
    .update({
      lembrete_enviado: true,
      lembrete_enviado_at: nowIso,
      lembrete_24h_status: 'enviado',
    })
    .eq('id', agendamentoId)
    .eq('lojista_id', lojistaId);

  if (updateErr) {
    // Fallback defensivo caso colunas auxiliares opcionais não existam
    await supabase
      .from('agendamentos')
      .update({ lembrete_enviado_at: nowIso })
      .eq('id', agendamentoId)
      .eq('lojista_id', lojistaId);
  }

  return {
    success: true,
    sentAt: nowIso,
  };
}
