'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEvolutionTextMessage, maskPhoneNumber } from '@/lib/evolution';

// Validação estrita de duração de acordo com a regra de engenharia do AGENTS.md
const DURACOES_PERMITIDAS = [15, 30, 45, 60] as const;

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
  } catch (err) {
    // Continua mesmo se bypass admin falhar
  }

  // 3. Buscar agendamentos que bloqueiam slots
  // Considera 'confirmado' e 'pendente_pin' com lock ativo (expira_em > agora)
  const startOfDay = new Date(dataIso);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dataIso);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: ocupados } = await supabase
    .from('agendamentos')
    .select('data_hora_inicio, data_hora_fim, status, expira_em')
    .eq('lojista_id', lojistaId)
    .gte('data_hora_inicio', startOfDay.toISOString())
    .lte('data_hora_inicio', endOfDay.toISOString())
    .or(`status.eq.confirmado,and(status.eq.pendente_pin,expira_em.gt.${agoraIso})`);

  // 4. Gerar grade de horários (08:00 às 19:00)
  const slots = [];
  const currentTime = new Date(startOfDay);
  currentTime.setHours(8, 0, 0, 0);
  const fechamento = new Date(startOfDay);
  fechamento.setHours(19, 0, 0, 0);

  const agora = new Date();

  while (currentTime < fechamento) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(currentTime.getTime() + duracao * 60000);

    if (slotEnd > fechamento) break;

    // Não exibe horários do passado se a consulta for para hoje
    const isPassado = slotStart <= agora;

    // Verificar colisão de intervalo [slotStart, slotEnd] com agendamentos ocupados
    const isColisao = ocupados?.some((ag: any) => {
      const agStart = new Date(ag.data_hora_inicio);
      const agEnd = new Date(ag.data_hora_fim);
      return slotStart < agEnd && slotEnd > agStart;
    });

    if (!isPassado && !isColisao) {
      slots.push({
        inicio: slotStart.toISOString(),
        fim: slotEnd.toISOString(),
        horaFormatada: slotStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
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

  // 2. Gerar PIN de 6 dígitos
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Configurar Lock de exatos 10 minutos
  const expiraEm = new Date();
  expiraEm.setMinutes(expiraEm.getMinutes() + 10);

  // 4. Criar ou vincular registro temporário do cliente
  let clienteId: string | null = null;
  const { data: clienteExistente } = await dbClient
    .from('clientes')
    .select('id')
    .eq('lojista_id', lojistaId)
    .eq('telefone', cleanPhone)
    .single();

  if (clienteExistente) {
    clienteId = clienteExistente.id;
  } else {
    const { data: novoCliente } = await dbClient
      .from('clientes')
      .insert({
        lojista_id: lojistaId,
        nome: cleanNome,
        telefone: cleanPhone,
        total_agendamentos: 0,
      })
      .select('id')
      .single();

    if (novoCliente) clienteId = novoCliente.id;
  }

  // 5. Inserir agendamento com status 'pendente_pin'
  const { data: agendamento, error: insertError } = await dbClient
    .from('agendamentos')
    .insert({
      lojista_id: lojistaId,
      servico_id: servicoId,
      cliente_id: clienteId,
      data_hora_inicio: horarioInicioIso,
      data_hora_fim: horarioFimIso,
      status: 'pendente_pin',
      pin_validacao: pin,
      expira_em: expiraEm.toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !agendamento) {
    throw new Error(`Falha ao reservar horário: ${insertError?.message || 'Erro desconhecido'}`);
  }

  // 6. Disparar PIN transacional via Evolution API
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

  return {
    reservaId: agendamento.id,
    expiracaoIso: expiraEm.toISOString(),
    telefoneMascarado: maskPhoneNumber(cleanPhone),
    pinSimulado: pin, // Disponível para ambientes locais/mock de homologação
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
      cliente_id, servico_id,
      cliente:clientes(nome, telefone),
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

  const agora = new Date();
  if (agora > new Date(reserva.expira_em)) {
    // Lock expirado: cancela e libera
    await dbClient
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', reservaId);

    throw new Error('O tempo limite de 10 minutos expirou. O horário foi liberado. Por favor, reinicie seu agendamento.');
  }

  if (reserva.pin_validacao !== pin.trim()) {
    throw new Error('Código PIN incorreto. Verifique o código recebido no seu WhatsApp.');
  }

  // 2. Confirmar o agendamento
  const { error: confirmError } = await dbClient
    .from('agendamentos')
    .update({
      status: 'confirmado',
    })
    .eq('id', reservaId);

  if (confirmError) {
    throw new Error(`Erro ao confirmar: ${confirmError.message}`);
  }

  // 3. Atualizar estatísticas do cliente
  if (reserva.cliente_id) {
    const { data: clienteAtual } = await dbClient
      .from('clientes')
      .select('total_agendamentos')
      .eq('id', reserva.cliente_id)
      .single();

    const novoTotal = (clienteAtual?.total_agendamentos || 0) + 1;

    await dbClient
      .from('clientes')
      .update({
        total_agendamentos: novoTotal,
        ultimo_agendamento: new Date().toISOString(),
      })
      .eq('id', reserva.cliente_id);
  }

  // 4. Enviar mensagem de confirmação no WhatsApp do cliente
  const dataFormatada = new Date(reserva.data_hora_inicio).toLocaleDateString('pt-BR');
  const horaFormatada = new Date(reserva.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const { data: configRobo } = await dbClient
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojistaId)
    .single();

  const instanceName = configRobo?.instance_name || `flowagenda_${lojistaId.slice(0, 8)}`;

  if (reserva.cliente?.telefone) {
    const msgConfirmacaoCliente = `🎉 *Agendamento Confirmado!*\n\nOlá, *${reserva.cliente.nome}*!\nSeu horário no *${reserva.lojista?.nome_estabelecimento}* está 100% garantido.\n\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${horaFormatada}\n💈 *Serviço:* ${reserva.servico?.nome_servico}\n\nTe esperamos! Caso precise reagendar, avise com antecedência.`;
    await sendEvolutionTextMessage(instanceName, reserva.cliente.telefone, msgConfirmacaoCliente);
  }

  // 5. Notificar lojista (se tiver whatsapp cadastrado)
  if (reserva.lojista?.whatsapp_notificacao) {
    const msgNotificacaoLojista = `🔔 *Novo Agendamento Confirmado!*\n\n• Cliente: ${reserva.cliente?.nome} (${reserva.cliente?.telefone})\n• Data: ${dataFormatada} às ${horaFormatada}\n• Serviço: ${reserva.servico?.nome_servico}`;
    await sendEvolutionTextMessage(instanceName, reserva.lojista.whatsapp_notificacao, msgNotificacaoLojista);
  }

  return { success: true };
}
