'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function buscarHorariosDisponiveisAction(lojistaId: string, servicoId: string, dataIso: string) {
  const supabase = createClient();
  
  // 1. Obter duração do serviço
  const { data: servico } = await supabase
    .from('servicos')
    .select('duracao_minutos')
    .eq('id', servicoId)
    .single();

  if (!servico) throw new Error('Serviço não encontrado');
  const duracao = servico.duracao_minutos;

  // 2. Buscar agendamentos do dia para este lojista
  // Retorna confirmados e pendentes (cujo expira_em > agora)
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
    .or(`status.eq.confirmado,and(status.eq.pendente_pin,expira_em.gt.${new Date().toISOString()})`);

  // 3. Gerar grade de horários (Ex: 09:00 às 18:00)
  const slots = [];
  let currentTime = new Date(startOfDay);
  currentTime.setHours(9, 0, 0, 0); // Inicio as 09:00
  const fechamento = new Date(startOfDay);
  fechamento.setHours(18, 0, 0, 0); // Fim as 18:00

  while (currentTime < fechamento) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(currentTime.getTime() + duracao * 60000);
    
    // Passou do horário de fechamento
    if (slotEnd > fechamento) break;

    // Verificar colisão
    const isOcupado = ocupados?.some(ag => {
      const agStart = new Date(ag.data_hora_inicio);
      const agEnd = new Date(ag.data_hora_fim);
      return (slotStart < agEnd && slotEnd > agStart);
    });

    if (!isOcupado) {
      slots.push({
        inicio: slotStart.toISOString(),
        fim: slotEnd.toISOString(),
        horaFormatada: slotStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
    }

    currentTime = new Date(currentTime.getTime() + duracao * 60000); // Avança pela duração (strict)
  }

  return slots;
}

export async function reservarHorarioAction(lojistaId: string, servicoId: string, horarioInicioIso: string, horarioFimIso: string) {
  const supabase = createAdminClient(); // Usar admin client para bypass de RLS na rota pública se necessário, ou RLS p/ insert anônimo

  // Gerar PIN de 6 dígitos
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  
  const expiraEm = new Date();
  expiraEm.setMinutes(expiraEm.getMinutes() + 10);

  // Inserir agendamento pendente
  const { data, error } = await supabase
    .from('agendamentos')
    .insert({
      lojista_id: lojistaId,
      servico_id: servicoId,
      data_hora_inicio: horarioInicioIso,
      data_hora_fim: horarioFimIso,
      status: 'pendente_pin',
      pin_validacao: pin,
      expira_em: expiraEm.toISOString()
    })
    .select('id, pin_validacao')
    .single();

  if (error) throw new Error('Horário indisponível ou erro ao reservar: ' + error.message);

  // Simular envio de WhatsApp com console.log
  console.log(`\n\n[EVOLUTION API MOCK] - Enviando PIN para o cliente...`);
  console.log(`[MENSAGEM]: Seu código de validação FlowAgenda é: ${pin}`);
  console.log(`[ATENÇÃO]: Use este código na tela para confirmar seu agendamento.\n\n`);

  return { reservaId: data.id, expiracaoIso: expiraEm.toISOString() };
}

export async function validarPinAction(reservaId: string, pin: string, nome: string, telefone: string, lojistaId: string) {
  const supabase = createAdminClient();

  // 1. Validar PIN
  const { data: reserva } = await supabase
    .from('agendamentos')
    .select('id, pin_validacao, expira_em, status')
    .eq('id', reservaId)
    .single();

  if (!reserva) throw new Error('Reserva não encontrada.');
  if (reserva.status === 'confirmado') throw new Error('Agendamento já confirmado.');
  if (new Date() > new Date(reserva.expira_em)) throw new Error('Tempo expirado. Refaça o agendamento.');
  if (reserva.pin_validacao !== pin) throw new Error('PIN inválido.');

  // 2. Criar ou buscar cliente (upsert simples baseado em telefone + lojista)
  let clienteId = null;
  const { data: clienteExistente } = await supabase
    .from('clientes')
    .select('id')
    .eq('lojista_id', lojistaId)
    .eq('telefone', telefone)
    .single();

  if (clienteExistente) {
    clienteId = clienteExistente.id;
  } else {
    const { data: novoCliente } = await supabase
      .from('clientes')
      .insert({ lojista_id: lojistaId, nome, telefone })
      .select('id')
      .single();
    if(novoCliente) clienteId = novoCliente.id;
  }

  // 3. Confirmar Agendamento
  const { error: updateError } = await supabase
    .from('agendamentos')
    .update({ status: 'confirmado', cliente_id: clienteId })
    .eq('id', reservaId);

  if (updateError) throw new Error('Erro ao confirmar agendamento.');

  return { success: true };
}
