'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEvolutionTextMessage, maskPhoneNumber } from '@/lib/evolution';

// Validação estrita de duração de acordo com a regra de engenharia do AGENTS.md
const DURACOES_PERMITIDAS = [15, 30, 45, 60] as const;

// Constrói objeto Date no fuso horário oficial de Brasília (America/Sao_Paulo = UTC-3)
function createSaoPauloDate(dataIsoYmd: string, hour: number, minute: number = 0): Date {
  const [year, month, day] = dataIsoYmd.split('-').map(Number);
  // Horário de Brasília (UTC-3): somar 3 horas para obter o instante em UTC
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0));
}

export async function buscarHorariosDisponiveisAction(
  lojistaId: string, 
  servicoId: string, 
  dataIso: string
) {
  const supabase = await createClient();

  // 1. Obter duração do serviço com validação estrita
  const { data: servico } = await supabase
    .from('servicos')
    .select('duracao_minutos, ativo')
    .eq('id', servicoId)
    .single();

  if (!servico || !servico.ativo) {
    throw new Error('Serviço não encontrado ou inativo.');
  }

  const duracao = servico.duracao_minutos;
  if (!DURACOES_PERMITIDAS.includes(duracao as any)) {
    throw new Error('Duração de serviço fora do padrão estrito [15, 30, 45, 60] minutos.');
  }

  const agoraIso = new Date().toISOString();

  // 2. Limpeza proativa de locks expirados no banco
  try {
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('lojista_id', lojistaId)
      .eq('status', 'pendente_pin')
      .lt('expira_em', agoraIso);
  } catch {
    // Continua mesmo se admin client não estiver disponível no escopo
  }

  // 3. Delimitar o dia no Fuso Horário de Brasília (00:00 às 23:59:59 BRT)
  const dataYmd = dataIso.split('T')[0];
  const startOfDay = createSaoPauloDate(dataYmd, 0, 0);
  const endOfDay = createSaoPauloDate(dataYmd, 23, 59);

  const { data: ocupados } = await supabase
    .from('agendamentos')
    .select('data_hora_inicio, data_hora_fim, status, expira_em')
    .eq('lojista_id', lojistaId)
    .gte('data_hora_inicio', startOfDay.toISOString())
    .lte('data_hora_inicio', endOfDay.toISOString())
    .or(`status.eq.confirmado,and(status.eq.pendente_pin,expira_em.gt.${agoraIso})`);

  // 4. Grade comercial no horário de Brasília: 08:00 às 19:00 BRT
  const slots = [];
  const currentTime = createSaoPauloDate(dataYmd, 8, 0);
  const fechamento = createSaoPauloDate(dataYmd, 19, 0);

  const agora = new Date();

  while (currentTime < fechamento) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(currentTime.getTime() + duracao * 60000);

    if (slotEnd > fechamento) break;

    // Não exibe horários do passado
    const isPassado = slotStart <= agora;

    // Verificar colisão de intervalo [slotStart, slotEnd] com agendamentos ocupados
    const isColisao = ocupados?.some((ag: any) => {
      const agStart = new Date(ag.data_hora_inicio);
      const agEnd = new Date(ag.data_hora_fim);
      return slotStart < agEnd && slotEnd > agStart;
    });

    if (!isPassado && !isColisao) {
      // Exibe formato HH:mm no fuso de Brasília
      const horaFormatada = slotStart.toLocaleTimeString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit', 
        minute: '2-digit' 
      });

      slots.push({
        inicio: slotStart.toISOString(),
        fim: slotEnd.toISOString(),
        horaFormatada,
      });
    }

    // Avança pela duração estrita
    currentTime.setTime(currentTime.getTime() + duracao * 60000);
  }

  return slots;
}

export async function reservarHorarioComLockAction(
  lojistaId: string,
  servicoId: string,
  horarioInicioIso: string,
  horarioFimIso: string,
  nome: string,
  telefone: string
) {
  const cleanNome = nome.trim();
  const cleanPhone = telefone.replace(/\D/g, '');

  if (!cleanNome || cleanNome.length < 2) {
    throw new Error('Informe seu nome completo para prosseguir.');
  }

  if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 13) {
    throw new Error('Informe um número de WhatsApp válido com DDD.');
  }

  let dbClient: any;
  try {
    dbClient = createAdminClient();
  } catch {
    dbClient = await createClient();
  }

  const agoraIso = new Date().toISOString();

  // 1. Checagem atômica de colisão para evitar concorrência dupla
  const { data: conflitos } = await dbClient
    .from('agendamentos')
    .select('id')
    .eq('lojista_id', lojistaId)
    .lt('data_hora_inicio', horarioFimIso)
    .gt('data_hora_fim', horarioInicioIso)
    .or(`status.eq.confirmado,and(status.eq.pendente_pin,expira_em.gt.${agoraIso})`);

  if (conflitos && conflitos.length > 0) {
    throw new Error('Este horário acabou de ser selecionado por outro cliente. Por favor, escolha outro horário.');
  }

  // 2. Gerar PIN de 6 dígitos numérico
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Configurar Lock de exatos 10 minutos
  const expiraEm = new Date();
  expiraEm.setMinutes(expiraEm.getMinutes() + 10);

  // 4. Inserir agendamento com status 'pendente_pin' e dados temporários de contato
  // OBS: NÃO cria cliente ainda para evitar contatos fantasmas em reservas abandonadas
  const { data: agendamento, error: insertError } = await dbClient
    .from('agendamentos')
    .insert({
      lojista_id: lojistaId,
      servico_id: servicoId,
      cliente_id: null,
      nome_contato: cleanNome,
      telefone_contato: cleanPhone,
      tentativas_pin: 0,
      data_hora_inicio: horarioInicioIso,
      data_hora_fim: horarioFimIso,
      status: 'pendente_pin',
      pin_validacao: pin,
      expira_em: expiraEm.toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !agendamento) {
    // Se colidir no índice único de banco, rejeita com clareza
    if (insertError?.code === '23505') {
      throw new Error('Este horário foi reservado simultaneamente por outro cliente. Por favor, escolha outro horário.');
    }
    throw new Error(`Falha ao reservar horário: ${insertError?.message || 'Erro desconhecido'}`);
  }

  // 5. Disparar PIN transacional via Evolution API
  const { data: configRobo } = await dbClient
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojistaId)
    .single();

  const { data: lojista } = await dbClient
    .from('lojistas')
    .select('nome_estabelecimento')
    .eq('id', lojistaId)
    .single();

  const nomeLoja = lojista?.nome_estabelecimento || 'FlowAgenda';
  const instanceName = configRobo?.instance_name || `flowagenda_${lojistaId.slice(0, 8)}`;

  const mensagemPin = `Olá, ${cleanNome}! 🤖\n\nSeu código de validação do agendamento no *${nomeLoja}* é:\n\n🔑 *${pin}*\n\nDigite este código na tela em até 10 minutos para confirmar sua reserva.`;

  await sendEvolutionTextMessage(instanceName, cleanPhone, mensagemPin);

  // 6. Segurança: pinSimulado NUNCA é exposto em produção ou se a Evolution API estiver ativa
  const isMockDev = process.env.NODE_ENV !== 'production' && !process.env.EVOLUTION_API_KEY;

  return {
    reservaId: agendamento.id,
    expiracaoIso: expiraEm.toISOString(),
    telefoneMascarado: maskPhoneNumber(cleanPhone),
    pinSimulado: isMockDev ? pin : null,
  };
}

export async function validarPinEConfirmarAction(
  reservaId: string, 
  pin: string, 
  lojistaId: string
) {
  let dbClient: any;
  try {
    dbClient = createAdminClient();
  } catch {
    dbClient = await createClient();
  }

  // 1. Buscar a reserva com lock ativo
  const { data: reserva, error: reservaError } = await dbClient
    .from('agendamentos')
    .select(`
      id, pin_validacao, expira_em, status, data_hora_inicio,
      nome_contato, telefone_contato, tentativas_pin,
      servico_id,
      servico:servicos(nome_servico),
      lojista:lojistas(nome_estabelecimento, whatsapp_notificacao)
    `)
    .eq('id', reservaId)
    .eq('lojista_id', lojistaId)
    .single();

  if (reservaError || !reserva) {
    throw new Error('Reserva não encontrada.');
  }

  if (reserva.status === 'confirmado') {
    throw new Error('Este agendamento já foi confirmado.');
  }

  if (reserva.status === 'cancelado') {
    throw new Error('Esta reserva foi cancelada. Por favor, selecione outro horário.');
  }

  // 2. Checagem de expiração do lock (10 minutos)
  const agora = new Date();
  if (agora > new Date(reserva.expira_em)) {
    await dbClient
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', reservaId);

    throw new Error('O tempo limite de 10 minutos expirou. O horário foi liberado.');
  }

  // 3. Blindagem contra Brute Force (Máximo 3 tentativas)
  const tentativasAtuais = reserva.tentativas_pin || 0;
  if (tentativasAtuais >= 3) {
    await dbClient
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', reservaId);

    throw new Error('Limite de tentativas excedido (3 tentativas incorretas). O horário foi cancelado por segurança.');
  }

  if (reserva.pin_validacao !== pin.trim()) {
    const novasTentativas = tentativasAtuais + 1;
    const restantes = 3 - novasTentativas;

    await dbClient
      .from('agendamentos')
      .update({ 
        tentativas_pin: novasTentativas,
        status: restantes <= 0 ? 'cancelado' : 'pendente_pin'
      })
      .eq('id', reservaId);

    if (restantes <= 0) {
      throw new Error('Código PIN incorreto. Limite de tentativas excedido. O horário foi cancelado.');
    }

    throw new Error(`Código PIN incorreto. Você tem mais ${restantes} tentativa(s).`);
  }

  // 4. Criação/Atualização do Cliente APENAS após confirmação real
  const nomeCliente = reserva.nome_contato || 'Cliente';
  const telefoneCliente = reserva.telefone_contato || '';

  let clienteId: string | null = null;
  if (telefoneCliente) {
    const { data: clienteExistente } = await dbClient
      .from('clientes')
      .select('id, total_agendamentos')
      .eq('lojista_id', lojistaId)
      .eq('telefone', telefoneCliente)
      .single();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      await dbClient
        .from('clientes')
        .update({
          nome: nomeCliente,
          total_agendamentos: (clienteExistente.total_agendamentos || 0) + 1,
          ultimo_agendamento: new Date().toISOString(),
        })
        .eq('id', clienteId);
    } else {
      const { data: novoCliente } = await dbClient
        .from('clientes')
        .insert({
          lojista_id: lojistaId,
          nome: nomeCliente,
          telefone: telefoneCliente,
          total_agendamentos: 1,
          ultimo_agendamento: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (novoCliente) clienteId = novoCliente.id;
    }
  }

  // 5. Confirmar o agendamento
  const { error: confirmError } = await dbClient
    .from('agendamentos')
    .update({
      status: 'confirmado',
      cliente_id: clienteId,
    })
    .eq('id', reservaId);

  if (confirmError) {
    throw new Error(`Erro ao confirmar: ${confirmError.message}`);
  }

  // 6. Mensagens transacionais pós-confirmação
  const dataFormatada = new Date(reserva.data_hora_inicio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const horaFormatada = new Date(reserva.data_hora_inicio).toLocaleTimeString('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const { data: configRobo } = await dbClient
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojistaId)
    .single();

  const instanceName = configRobo?.instance_name || `flowagenda_${lojistaId.slice(0, 8)}`;

  // Notificar cliente
  if (telefoneCliente) {
    const msgConfirmacaoCliente = `🎉 *Agendamento Confirmado!*\n\nOlá, *${nomeCliente}*!\nSeu horário no *${reserva.lojista?.nome_estabelecimento}* está 100% garantido.\n\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${horaFormatada}\n💈 *Serviço:* ${reserva.servico?.nome_servico}\n\nTe esperamos! Caso precise reagendar, avise com antecedência.`;
    await sendEvolutionTextMessage(instanceName, telefoneCliente, msgConfirmacaoCliente);
  }

  // Notificar lojista (se configurado)
  if (reserva.lojista?.whatsapp_notificacao) {
    const msgNotificacaoLojista = `🔔 *Novo Agendamento Confirmado!*\n\n• Cliente: ${nomeCliente} (${maskPhoneNumber(telefoneCliente)})\n• Data: ${dataFormatada} às ${horaFormatada}\n• Serviço: ${reserva.servico?.nome_servico}`;
    await sendEvolutionTextMessage(instanceName, reserva.lojista.whatsapp_notificacao, msgNotificacaoLojista);
  }

  return { success: true };
}
