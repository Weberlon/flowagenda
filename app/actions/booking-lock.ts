'use server';

/**
 * ==============================================================================
 * FlowAgenda — Trava Atômica de Agendamento, Buffer Time & Checkout Híbrido
 * Arquivo: app/actions/booking-lock.ts
 * ==============================================================================
 */

import { createAdminClient } from '@/utils/supabase/admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp-sender';
import { createAsaasCustomer, createAsaasPixPayment } from '@/lib/asaas';

export interface BookingPayload {
  lojista_id: string;
  profissional_id: string;
  servico_id: string;
  data_horario: string; // ISO string UTC
  cliente_nome: string;
  cliente_telefone: string;
}

export type BookingResult =
  | { success: true; mode: 'pin'; agendamentoId: string }
  | { success: true; mode: 'pix'; qrCode: string; copiaECola: string; agendamentoId: string }
  | { success: false; error: string };

/**
 * Normaliza número para dígitos com DDI 55
 */
function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('55') && (cleaned.length === 10 || cleaned.length === 11)) {
    cleaned = `55${cleaned}`;
  }
  return cleaned;
}

const DURACOES_PERMITIDAS = [15, 30, 45, 60] as const;

export interface SlotDisponivel {
  inicio: string;
  fim: string;
  horaFormatada: string;
  profissionalId: string;
  profissionalNome?: string;
}

/**
 * Constrói objeto Date no fuso horário oficial de Brasília (America/Sao_Paulo = UTC-3)
 */
function createSaoPauloDate(dataIsoYmd: string, hour: number, minute: number = 0): Date {
  const [year, month, day] = dataIsoYmd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0));
}

/**
 * Busca horários disponíveis com filtro estrito de lojista_id, profissional_id
 * e cálculo de duracao_minutos + intervalo_minutos (buffer time).
 * Em caso de 'qualquer', busca entre todos os profissionais ativos do lojista.
 */
export async function buscarHorariosDisponiveisBookingLockAction(
  lojistaId: string,
  servicoId: string,
  dataIso: string,
  profissionalId?: string
): Promise<SlotDisponivel[]> {
  const adminSupabase = createAdminClient();

  // 1. Obter serviço e validar duração
  const { data: servico, error: servicoErr } = await adminSupabase
    .from('servicos')
    .select('id, nome_servico, duracao_minutos, intervalo_minutos, ativo')
    .eq('id', servicoId)
    .eq('lojista_id', lojistaId)
    .single();

  if (servicoErr || !servico || !servico.ativo) {
    throw new Error('Serviço não encontrado ou inativo.');
  }

  const duracao = Number(servico.duracao_minutos) || 30;
  if (!DURACOES_PERMITIDAS.includes(duracao as any)) {
    throw new Error('Duração de serviço fora do padrão estrito [15, 30, 45, 60] minutos.');
  }

  const intervalo = Number(servico.intervalo_minutos) || 0;
  const duracaoTotal = duracao + intervalo;

  // 2. Resolver profissionais candidatos
  let candidatos: { id: string; nome: string }[] = [];
  if (profissionalId && profissionalId !== 'qualquer') {
    const { data: prof } = await adminSupabase
      .from('profissionais')
      .select('id, nome')
      .eq('id', profissionalId)
      .eq('lojista_id', lojistaId)
      .eq('ativo', true)
      .maybeSingle();

    if (prof) candidatos = [prof];
  } else {
    const { data: todos } = await adminSupabase
      .from('profissionais')
      .select('id, nome')
      .eq('lojista_id', lojistaId)
      .eq('ativo', true)
      .order('nome');

    if (todos) candidatos = todos;
  }

  if (candidatos.length === 0) {
    return [];
  }

  const candidatoIds = candidatos.map((c) => c.id);
  const dataYmd = dataIso.split('T')[0];
  const startOfDay = createSaoPauloDate(dataYmd, 0, 0);
  const endOfDay = createSaoPauloDate(dataYmd, 23, 59);
  const nowIso = new Date().toISOString();

  // 3. Buscar agendamentos que colidem no dia para os profissionais candidatos
  const { data: ocupados } = await adminSupabase
    .from('agendamentos')
    .select('id, profissional_id, data_hora_inicio, data_hora_fim, status, expira_em')
    .eq('lojista_id', lojistaId)
    .in('profissional_id', candidatoIds)
    .gte('data_hora_inicio', startOfDay.toISOString())
    .lte('data_hora_inicio', endOfDay.toISOString())
    .or(`status.eq.confirmado,and(status.in.(locked,pendente_pin,awaiting_payment_confirmation),expira_em.gt.${nowIso})`);

  // 4. Grade comercial no horário de Brasília: 08:00 às 19:00 BRT
  const slots: SlotDisponivel[] = [];
  const currentTime = createSaoPauloDate(dataYmd, 8, 0);
  const fechamento = createSaoPauloDate(dataYmd, 19, 0);
  const agora = new Date();

  while (currentTime < fechamento) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(currentTime.getTime() + duracaoTotal * 60000);

    if (slotEnd > fechamento) break;

    const isPassado = slotStart <= agora;

    if (!isPassado) {
      // Para cada profissional candidato, verifica se está livre
      let profLivre: { id: string; nome: string } | null = null;

      for (const cand of candidatos) {
        const hasColisao = ocupados?.some((ag: any) => {
          if (ag.profissional_id !== cand.id) return false;
          const agStart = new Date(ag.data_hora_inicio);
          const agEnd = new Date(ag.data_hora_fim);
          return slotStart < agEnd && slotEnd > agStart;
        });

        if (!hasColisao) {
          profLivre = cand;
          break; // Alocação determinística no primeiro profissional disponível ordenado por nome
        }
      }

      if (profLivre) {
        const horaFormatada = slotStart.toLocaleTimeString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
        });

        slots.push({
          inicio: slotStart.toISOString(),
          fim: slotEnd.toISOString(),
          horaFormatada,
          profissionalId: profLivre.id,
          profissionalNome: profLivre.nome,
        });
      }
    }

    // Avança no mínimo 15 minutos na grade
    currentTime.setMinutes(currentTime.getMinutes() + Math.max(15, duracao));
  }

  return slots;
}

/**
 * Cria reserva de agendamento com trava atômica, cálculo de buffer time
 * e roteamento para confirmação por PIN ou Sinal Pix via Asaas.
 */
export async function createBookingReservation(
  payload: BookingPayload
): Promise<BookingResult> {
  const adminSupabase = createAdminClient();

  try {
    // 1. Validação estrita de parâmetros obrigatórios
    if (
      !payload.lojista_id ||
      !payload.servico_id ||
      !payload.data_horario ||
      !payload.cliente_nome?.trim() ||
      !payload.cliente_telefone?.trim()
    ) {
      return {
        success: false,
        error: 'Todos os campos de identificação, horário e contato são obrigatórios.',
      };
    }

    // Alocação determinística de profissional quando 'qualquer'
    if (!payload.profissional_id || payload.profissional_id === 'qualquer') {
      const { data: profsAtivos } = await adminSupabase
        .from('profissionais')
        .select('id, nome')
        .eq('lojista_id', payload.lojista_id)
        .eq('ativo', true)
        .order('nome');

      if (!profsAtivos || profsAtivos.length === 0) {
        return {
          success: false,
          error: 'Nenhum profissional ativo cadastrado no estabelecimento.',
        };
      }

      // Procura o primeiro profissional livre no horário solicitado
      const dataReqInicio = new Date(payload.data_horario);
      const { data: servicoTemp } = await adminSupabase
        .from('servicos')
        .select('duracao_minutos, intervalo_minutos')
        .eq('id', payload.servico_id)
        .single();

      const dMin = Number(servicoTemp?.duracao_minutos) || 30;
      const iMin = Number(servicoTemp?.intervalo_minutos) || 0;
      const dataReqFim = new Date(dataReqInicio.getTime() + (dMin + iMin) * 60000);
      const nowIso = new Date().toISOString();

      let profEscolhidoId: string | null = null;
      for (const p of profsAtivos) {
        const { data: conflitosP } = await adminSupabase
          .from('agendamentos')
          .select('id')
          .eq('profissional_id', p.id)
          .lt('data_hora_inicio', dataReqFim.toISOString())
          .gt('data_hora_fim', dataReqInicio.toISOString())
          .or(`status.eq.confirmado,and(status.in.(locked,pendente_pin,awaiting_payment_confirmation),expira_em.gt.${nowIso})`);

        if (!conflitosP || conflitosP.length === 0) {
          profEscolhidoId = p.id;
          break;
        }
      }

      if (!profEscolhidoId) {
        return {
          success: false,
          error: 'Nenhum profissional está disponível neste horário exato.',
        };
      }

      payload.profissional_id = profEscolhidoId;
    }

    const cleanPhone = cleanPhoneNumber(payload.cliente_telefone);
    if (cleanPhone.length < 10) {
      return {
        success: false,
        error: 'Número de telefone WhatsApp inválido. Digite DDD + Número.',
      };
    }

    const dataInicio = new Date(payload.data_horario);
    if (isNaN(dataInicio.getTime())) {
      return {
        success: false,
        error: 'Data e horário em formato ISO inválido.',
      };
    }

    // Não permitir agendamentos no passado
    if (dataInicio.getTime() < Date.now() - 60000) {
      return {
        success: false,
        error: 'Não é possível agendar horários no passado.',
      };
    }

    // 2. Buscar serviço e calcular término com Buffer Time (intervalo_minutos)
    const { data: servico, error: servicoErr } = await adminSupabase
      .from('servicos')
      .select('id, nome_servico, duracao_minutos, intervalo_minutos, preco, ativo, exige_sinal, valor_sinal')
      .eq('id', payload.servico_id)
      .eq('lojista_id', payload.lojista_id)
      .single();

    if (servicoErr || !servico || !servico.ativo) {
      return {
        success: false,
        error: 'Serviço solicitado não encontrado ou inativo no estabelecimento.',
      };
    }

    const duracao = Number(servico.duracao_minutos) || 30;
    const intervalo = Number(servico.intervalo_minutos) || 0;
    const duracaoTotalMinutos = duracao + intervalo;

    const dataFim = new Date(dataInicio.getTime() + duracaoTotalMinutos * 60 * 1000);

    // 3. Limpeza proativa de locks expirados no banco
    const nowIso = new Date().toISOString();
    try {
      await adminSupabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('lojista_id', payload.lojista_id)
        .in('status', ['locked', 'pendente_pin', 'awaiting_payment_confirmation'])
        .lt('expira_em', nowIso);
    } catch (cleanErr) {
      console.warn('[BookingLock] Falha na limpeza de locks expirados (não impeditivo):', cleanErr);
    }

    // 4. Verificação de Concorrência e Conflito de Grade para o Profissional
    // Condição de colisão de intervalos: A < dataFim E B > dataInicio
    const { data: conflitos, error: conflitoErr } = await adminSupabase
      .from('agendamentos')
      .select('id, status, expira_em, data_hora_inicio, data_hora_fim')
      .eq('profissional_id', payload.profissional_id)
      .lt('data_hora_inicio', dataFim.toISOString())
      .gt('data_hora_fim', dataInicio.toISOString())
      .or(`status.eq.confirmado,and(status.in.(locked,pendente_pin,awaiting_payment_confirmation),expira_em.gt.${nowIso})`);

    if (conflitoErr) {
      console.error('[BookingLock] Erro ao consultar conflitos de grade:', conflitoErr);
      return {
        success: false,
        error: 'Erro de comunicação ao verificar disponibilidade do profissional.',
      };
    }

    if (conflitos && conflitos.length > 0) {
      return {
        success: false,
        error: 'Este horário acabou de ser reservado por outro cliente.',
      };
    }

    // 5. Identificar instância do WhatsApp do lojista
    const { data: configRobo } = await adminSupabase
      .from('configuracoes_robo')
      .select('instance_name')
      .eq('lojista_id', payload.lojista_id)
      .maybeSingle();

    const { data: lojista } = await adminSupabase
      .from('lojistas')
      .select('slug_subdominio, nome_estabelecimento')
      .eq('id', payload.lojista_id)
      .single();

    const instanceName =
      configRobo?.instance_name || `flowagenda_${lojista?.slug_subdominio || 'teste'}`;

    // 6. Rota B: Serviço com Sinal Financeiro via Pix (Asaas)
    const exigeSinal = Boolean(servico.exige_sinal && Number(servico.valor_sinal) > 0);

    if (exigeSinal) {
      const valorSinal = Number(servico.valor_sinal);

      // Criar/Obter cliente no Asaas
      const asaasCustomer = await createAsaasCustomer({
        name: payload.cliente_nome,
        phone: cleanPhone,
        externalReference: payload.lojista_id,
      });

      // Gerar cobrança Pix imediata
      const pixPayment = await createAsaasPixPayment({
        customerId: asaasCustomer.id,
        value: valorSinal,
        description: `Sinal: ${servico.nome_servico} - ${lojista?.nome_estabelecimento || 'FlowAgenda'}`,
        externalReference: payload.lojista_id,
      });

      // 10 minutos de lock + 3 minutos de tolerância bancária
      const expiraEmPix = new Date(Date.now() + 13 * 60 * 1000).toISOString();

      const { data: agendamentoPix, error: insertPixErr } = await adminSupabase
        .from('agendamentos')
        .insert({
          lojista_id: payload.lojista_id,
          profissional_id: payload.profissional_id,
          servico_id: payload.servico_id,
          cliente_nome: payload.cliente_nome.trim(),
          cliente_telefone: cleanPhone,
          data_horario: dataInicio.toISOString(),
          data_hora_inicio: dataInicio.toISOString(),
          data_hora_fim: dataFim.toISOString(),
          status: 'awaiting_payment_confirmation',
          asaas_payment_id: pixPayment.id,
          valor_sinal: pixPayment.value,
          expira_em: expiraEmPix,
        })
        .select('id')
        .single();

      if (insertPixErr || !agendamentoPix) {
        console.error('[BookingLock] Falha ao inserir reserva Pix:', insertPixErr);
        return {
          success: false,
          error: 'Falha ao registrar trava de agendamento com Pix.',
        };
      }

      return {
        success: true,
        mode: 'pix',
        qrCode: pixPayment.encodedImage,
        copiaECola: pixPayment.payload,
        agendamentoId: agendamentoPix.id,
      };
    }

    // 7. Rota A: Serviço sem Sinal Financeiro (Confirmação por PIN)
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEmPin = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: agendamentoPin, error: insertPinErr } = await adminSupabase
      .from('agendamentos')
      .insert({
        lojista_id: payload.lojista_id,
        profissional_id: payload.profissional_id,
        servico_id: payload.servico_id,
        cliente_nome: payload.cliente_nome.trim(),
        cliente_telefone: cleanPhone,
        data_horario: dataInicio.toISOString(),
        data_hora_inicio: dataInicio.toISOString(),
        data_hora_fim: dataFim.toISOString(),
        status: 'locked',
        pin_validacao: pin,
        expira_em: expiraEmPin,
      })
      .select('id')
      .single();

    if (insertPinErr || !agendamentoPin) {
      console.error('[BookingLock] Falha ao inserir reserva PIN:', insertPinErr);
      return {
        success: false,
        error: 'Falha ao registrar trava de agendamento.',
      };
    }

    // Disparar o PIN no WhatsApp do cliente de forma assíncrona blindada
    sendWhatsAppMessage({
      instanceName,
      number: cleanPhone,
      text: `Seu código de confirmação FlowAgenda é: *${pin}*. Ele expira em 10 minutos. Digite na tela para garantir seu horário.`,
    }).catch((waErr) => {
      console.warn('[BookingLock] Falha não impeditiva no disparo do PIN:', waErr);
    });

    return {
      success: true,
      mode: 'pin',
      agendamentoId: agendamentoPin.id,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno ao processar reserva';
    console.error('[BookingLock] Exceção crítica:', error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Validação segura de PIN do agendamento (transição locked -> confirmado)
 */
export async function validarPinBookingAction(
  agendamentoId: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient();

  try {
    const cleanPin = pin.trim();
    if (!agendamentoId || !cleanPin) {
      return { success: false, error: 'Identificador e PIN são obrigatórios.' };
    }

    const { data: agendamento, error: fetchErr } = await adminSupabase
      .from('agendamentos')
      .select('id, lojista_id, status, pin_validacao, expira_em, cliente_telefone, cliente_nome, data_hora_inicio')
      .eq('id', agendamentoId)
      .single();

    if (fetchErr || !agendamento) {
      return { success: false, error: 'Agendamento não encontrado.' };
    }

    if (agendamento.status === 'confirmado') {
      return { success: true };
    }

    if (new Date(agendamento.expira_em).getTime() < Date.now()) {
      return { success: false, error: 'O tempo limite de 10 minutos expirou. O horário foi liberado.' };
    }

    if (agendamento.pin_validacao !== cleanPin) {
      return { success: false, error: 'Código PIN incorreto. Verifique o WhatsApp e tente novamente.' };
    }

    const { error: updateErr } = await adminSupabase
      .from('agendamentos')
      .update({
        status: 'confirmado',
        pin_validacao: 'VALIDADO',
        updated_at: new Date().toISOString(),
      })
      .eq('id', agendamentoId);

    if (updateErr) {
      return { success: false, error: 'Falha ao confirmar agendamento.' };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao validar PIN';
    return { success: false, error: msg };
  }
}

/**
 * Consulta status atual do agendamento (para polling de checkout Pix)
 */
export async function verificarStatusAgendamentoAction(
  agendamentoId: string
): Promise<{ status: string }> {
  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from('agendamentos')
    .select('status')
    .eq('id', agendamentoId)
    .single();

  return { status: data?.status || 'desconhecido' };
}

