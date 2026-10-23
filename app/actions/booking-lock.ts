'use server';

/**
 * ==============================================================================
 * FlowAgenda — Trava Atômica de Agendamento, Buffer Time & Checkout Híbrido
 * Arquivo: app/actions/booking-lock.ts
 * ==============================================================================
 */

import { createAdminClient } from '@/utils/supabase/admin';
import { sendEvolutionTextMessage } from '@/lib/evolution';
import { createAsaasCustomer, createAsaasPixPayment } from '@/lib/asaas';
import { compilarMensagemWhatsApp } from '@/lib/whatsapp/template-engine';

export interface BookingPayload {
  lojista_id?: string;
  slug_subdominio?: string;
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
      (!payload.lojista_id && !payload.slug_subdominio) ||
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

    // 2. Resolução segura de Lojista sem auth.getUser() (clientes anônimos)
    let lojista: any = null;
    if (payload.lojista_id) {
      const { data } = await adminSupabase
        .from('lojistas')
        .select('id, slug_subdominio, nome_estabelecimento')
        .eq('id', payload.lojista_id)
        .maybeSingle();
      lojista = data;
    }

    if (!lojista && payload.slug_subdominio) {
      const { data } = await adminSupabase
        .from('lojistas')
        .select('id, slug_subdominio, nome_estabelecimento')
        .eq('slug_subdominio', payload.slug_subdominio)
        .maybeSingle();
      lojista = data;
    }

    if (!lojista) {
      try {
        const { headers } = await import('next/headers');
        const reqHeaders = await headers();
        const host = reqHeaders.get('host') || '';
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'flowagenda.online';
        if (host.includes(`.${rootDomain}`)) {
          const sub = host.replace(`.${rootDomain}`, '').split(':')[0];
          const { data } = await adminSupabase
            .from('lojistas')
            .select('id, slug_subdominio, nome_estabelecimento')
            .eq('slug_subdominio', sub)
            .maybeSingle();
          lojista = data;
        }
      } catch {
        // Ignora
      }
    }

    if (!lojista) {
      return {
        success: false,
        error: 'Estabelecimento não identificado para esta reserva.',
      };
    }

    const lojistaId = lojista.id;

    // Alocação determinística de profissional quando 'qualquer'
    if (!payload.profissional_id || payload.profissional_id === 'qualquer') {
      const { data: profsAtivos } = await adminSupabase
        .from('profissionais')
        .select('id, nome')
        .eq('lojista_id', lojistaId)
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
        .eq('lojista_id', lojistaId)
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
    } else {
      // Validação estrita: garante que o profissional selecionado pertence ao estabelecimento atual (Anti-IDOR)
      const { data: profValido } = await adminSupabase
        .from('profissionais')
        .select('id')
        .eq('id', payload.profissional_id)
        .eq('lojista_id', lojistaId)
        .eq('ativo', true)
        .maybeSingle();

      if (!profValido) {
        return {
          success: false,
          error: 'Profissional selecionado não encontrado ou inativo no estabelecimento.',
        };
      }
    }

    // Higienização estrita do telefone para formato internacional com DDI 55
    const cleanPhone = payload.cliente_telefone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    if (!cleanPhone || cleanPhone.length < 10 || formattedPhone.length < 12 || formattedPhone.length > 13) {
      return {
        success: false,
        error: 'Número de telefone WhatsApp inválido. Digite DDD + Número (ex: 31988887777).',
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

    // 3. Buscar serviço e calcular término com Buffer Time (intervalo_minutos)
    const { data: servico, error: servicoErr } = await adminSupabase
      .from('servicos')
      .select('id, nome_servico, duracao_minutos, intervalo_minutos, preco, ativo, exige_sinal, valor_sinal')
      .eq('id', payload.servico_id)
      .eq('lojista_id', lojistaId)
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

    // 4. Limpeza proativa de locks expirados no banco
    const nowIso = new Date().toISOString();
    try {
      await adminSupabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('lojista_id', lojistaId)
        .in('status', ['locked', 'pendente_pin', 'awaiting_payment_confirmation'])
        .lt('expira_em', nowIso);
    } catch (cleanErr) {
      console.warn('[BookingLock] Falha na limpeza de locks expirados (não impeditivo):', cleanErr);
    }

    // 5. Verificação de Concorrência e Conflito de Grade para o Profissional
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

    // 6. Identificar instância do WhatsApp do lojista
    const { data: configRobo } = await adminSupabase
      .from('configuracoes_robo')
      .select('instance_name')
      .eq('lojista_id', lojistaId)
      .maybeSingle();

    const cleanSlug = (lojista.slug_subdominio || 'barbeariamodelo').replace(/[^a-zA-Z0-9]/g, '_');
    const instanceName = configRobo?.instance_name || `flowagenda_${cleanSlug}`;

    // 7. Rota B: Serviço com Sinal Financeiro via Pix (Asaas)
    const exigeSinal = Boolean(servico.exige_sinal && Number(servico.valor_sinal) > 0);

    if (exigeSinal) {
      const valorSinal = Number(servico.valor_sinal);

      // Criar/Obter cliente no Asaas
      const asaasCustomer = await createAsaasCustomer({
        name: payload.cliente_nome,
        phone: formattedPhone,
        externalReference: lojistaId,
      });

      // Gerar cobrança Pix imediata
      const pixPayment = await createAsaasPixPayment({
        customerId: asaasCustomer.id,
        value: valorSinal,
        description: `Sinal: ${servico.nome_servico} - ${lojista?.nome_estabelecimento || 'FlowAgenda'}`,
        externalReference: lojistaId,
      });

      // 10 minutos de lock + 3 minutos de tolerância bancária
      const expiraEmPix = new Date(Date.now() + 13 * 60 * 1000).toISOString();

      const { data: agendamentoPix, error: insertPixErr } = await adminSupabase
        .from('agendamentos')
        .insert({
          lojista_id: lojistaId,
          profissional_id: payload.profissional_id,
          servico_id: payload.servico_id,
          cliente_nome: payload.cliente_nome.trim(),
          cliente_telefone: formattedPhone,
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

    // 8. Rota A: Serviço sem Sinal Financeiro (Confirmação por PIN)
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEmPin = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: agendamentoPin, error: insertPinErr } = await adminSupabase
      .from('agendamentos')
      .insert({
        lojista_id: lojistaId,
        profissional_id: payload.profissional_id,
        servico_id: payload.servico_id,
        cliente_nome: payload.cliente_nome.trim(),
        cliente_telefone: formattedPhone,
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

    // Disparar o PIN no WhatsApp do cliente via Evolution API (lib/evolution.ts)
    console.log(`[BookingLock] Disparando PIN ${pin} para ${formattedPhone} na instância "${instanceName}"...`);
    const mensagemPin = `Olá, ${payload.cliente_nome.trim()}! 🤖\n\nSeu código de confirmação no *${lojista.nome_estabelecimento}* é:\n\n🔑 *${pin}*\n\nEle vence em 10 minutos. Digite na tela para confirmar seu horário.`;

    const waResult = await sendEvolutionTextMessage(instanceName, formattedPhone, mensagemPin);
    console.log('[BookingLock] Retorno Evolution API envio PIN:', waResult);

    if (!waResult.success) {
      console.error('[BookingLock] Erro retornado pela Evolution API ao disparar PIN:', waResult.error);
      return {
        success: false,
        error: `Falha ao enviar código PIN para o WhatsApp: ${waResult.error || 'Erro na VPS Evolution'}. Verifique o número informado.`,
      };
    }

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

interface LojistaRelationalRecord {
  id: string;
  nome_estabelecimento?: string | null;
  slug_subdominio?: string | null;
  whatsapp_notificacao?: string | null;
  whatsapp?: string | null;
  configuracoes?: Record<string, any> | null;
}

interface ServicoRelationalRecord {
  id: string;
  nome_servico?: string | null;
  preco?: number | string | null;
}

interface ProfissionalRelationalRecord {
  id: string;
  nome?: string | null;
}

interface AgendamentoLockRecord {
  id: string;
  lojista_id: string;
  status: string;
  pin_validacao: string | null;
  expira_em: string;
  cliente_telefone: string | null;
  cliente_nome: string | null;
  data_hora_inicio: string;
  servico_id: string;
  profissional_id: string;
  cliente_id?: string | null;
  lojistas?: LojistaRelationalRecord | LojistaRelationalRecord[] | null;
  servicos?: ServicoRelationalRecord | ServicoRelationalRecord[] | null;
  profissionais?: ProfissionalRelationalRecord | ProfissionalRelationalRecord[] | null;
}

/**
 * Validação segura de PIN do agendamento (transição locked/pendente_pin -> confirmado)
 * Executada com createAdminClient (bypass de RLS para usuário anônimo)
 */
export async function validarPinBookingAction(
  agendamentoId: string,
  pin: string,
  telefone?: string,
  lojistaId?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const adminSupabase = createAdminClient();

  try {
    // Sanitização defensiva: expurga espaços e caracteres não numéricos antes da validação
    const cleanPin = String(pin ?? '').replace(/\D/g, '').trim();
    if (cleanPin.length !== 6) {
      return { success: false, error: 'O código PIN de validação deve conter exatamente 6 dígitos numéricos.' };
    }

    // Resolução defensiva de lojistaId via headers se não enviado explicitamente pelo client
    let activeLojistaId = lojistaId;
    if (!activeLojistaId) {
      try {
        const { headers } = await import('next/headers');
        const reqHeaders = await headers();
        const host = reqHeaders.get('host') || '';
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'flowagenda.online';
        if (host.includes(`.${rootDomain}`)) {
          const sub = host.replace(`.${rootDomain}`, '').split(':')[0];
          const { data: store } = await adminSupabase
            .from('lojistas')
            .select('id')
            .eq('slug_subdominio', sub)
            .maybeSingle();
          if (store?.id) activeLojistaId = store.id;
        }
      } catch {
        // Ignora caso headers não estejam disponíveis no contexto
      }
    }

    let agendamento: AgendamentoLockRecord | null = null;

    // 1. Busca prioritária por ID da reserva (se fornecido)
    if (agendamentoId && agendamentoId.trim()) {
      let query = adminSupabase
        .from('agendamentos')
        .select(`
          id, lojista_id, status, pin_validacao, expira_em, cliente_telefone, cliente_nome, data_hora_inicio,
          servico_id, profissional_id,
          lojistas ( id, nome_estabelecimento, slug_subdominio, whatsapp_notificacao, whatsapp, configuracoes ),
          servicos ( id, nome_servico, preco ),
          profissionais ( id, nome )
        `)
        .eq('id', agendamentoId.trim());

      if (activeLojistaId) {
        query = query.eq('lojista_id', activeLojistaId);
      }

      const { data, error: fetchErr } = await query.maybeSingle();

      if (fetchErr) {
        console.error('[ConfirmBooking] Erro ao consultar agendamento por ID:', fetchErr);
      }
      agendamento = data;
    }

    // 2. Busca de contingência por Telefone normalizado com DDI 55
    if (!agendamento) {
      const phoneInput = telefone || agendamentoId;
      const cleanDigits = (phoneInput || '').replace(/\D/g, '');

      if (cleanDigits.length >= 10) {
        const ddiPhone = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;
        const localPhone = cleanDigits.startsWith('55') ? cleanDigits.slice(2) : cleanDigits;

        console.log(`[ConfirmBooking] Buscando reserva ativa por telefone: ${ddiPhone} / ${localPhone}`);

        let phoneQuery = adminSupabase
          .from('agendamentos')
          .select(`
            id, lojista_id, status, pin_validacao, expira_em, cliente_telefone, cliente_nome, data_hora_inicio,
            servico_id, profissional_id,
            lojistas ( id, nome_estabelecimento, slug_subdominio, whatsapp_notificacao, whatsapp, configuracoes ),
            servicos ( id, nome_servico, preco ),
            profissionais ( id, nome )
          `)
          .or(`cliente_telefone.eq.${ddiPhone},cliente_telefone.eq.${localPhone},telefone_contato.eq.${ddiPhone},telefone_contato.eq.${localPhone}`)
          .in('status', ['locked', 'pendente_pin']);

        if (activeLojistaId) {
          phoneQuery = phoneQuery.eq('lojista_id', activeLojistaId);
        }

        const { data: agendamentoByPhone, error: phoneErr } = await phoneQuery
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (phoneErr) {
          console.error('[ConfirmBooking] Erro ao consultar agendamento por telefone:', phoneErr);
        }
        agendamento = agendamentoByPhone;
      }
    }

    if (!agendamento) {
      console.warn('[ConfirmBooking] Agendamento não encontrado para os parâmetros:', { agendamentoId, telefone, lojistaId });
      return { success: false, error: 'Reserva não encontrada ou expirada. Por favor, reinicie o agendamento.' };
    }

    if (agendamento.status === 'confirmado') {
      return { success: true };
    }

    if (agendamento.status !== 'locked' && agendamento.status !== 'pendente_pin') {
      return { success: false, error: 'Esta reserva não está mais disponível para validação.' };
    }

    // 3. Validação de Expiração do Lock Provisório (10 minutos)
    const agora = new Date();
    if (new Date(agendamento.expira_em).getTime() < agora.getTime()) {
      await adminSupabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', agendamento.id);

      return { success: false, error: 'O tempo limite de 10 minutos expirou. O horário foi liberado.' };
    }

    // 4. Validação do Código PIN
    if (agendamento.pin_validacao !== cleanPin) {
      return { success: false, error: 'Código PIN incorreto. Verifique a mensagem recebida no WhatsApp e tente novamente.' };
    }

    // 5. Upsert no CRM (tabela public.clientes) utilizando createAdminClient()
    let clienteId: string | null = agendamento.cliente_id || null;
    const rawCliPhone = (agendamento.cliente_telefone || telefone || '').replace(/\D/g, '');
    const formattedCliPhone = rawCliPhone.startsWith('55') ? rawCliPhone : `55${rawCliPhone}`;
    const localCliPhone = rawCliPhone.startsWith('55') ? rawCliPhone.slice(2) : rawCliPhone;

    if (agendamento.lojista_id && formattedCliPhone.length >= 10) {
      try {
        const { data: clienteExistente, error: findCliErr } = await adminSupabase
          .from('clientes')
          .select('id, total_agendamentos, total_gasto')
          .eq('lojista_id', agendamento.lojista_id)
          .or(`telefone.eq.${formattedCliPhone},telefone.eq.${localCliPhone}`)
          .maybeSingle();

        if (findCliErr) {
          console.error('[ConfirmBooking] Erro ao consultar cliente no CRM:', findCliErr);
        }

        const precoServico = Number((agendamento.servicos as any)?.preco || 0);

        if (clienteExistente) {
          clienteId = clienteExistente.id;
          const { error: updCliErr } = await adminSupabase
            .from('clientes')
            .update({
              nome: agendamento.cliente_nome || undefined,
              total_agendamentos: (clienteExistente.total_agendamentos || 1) + 1,
              total_gasto: Number(clienteExistente.total_gasto || 0) + precoServico,
              ultimo_agendamento: agora.toISOString(),
            })
            .eq('id', clienteExistente.id);

          if (updCliErr) {
            console.error('[ConfirmBooking] Erro ao atualizar cliente no CRM:', updCliErr);
          }
        } else {
          const { data: novoCliente, error: insCliErr } = await adminSupabase
            .from('clientes')
            .insert({
              lojista_id: agendamento.lojista_id,
              nome: agendamento.cliente_nome || 'Cliente',
              telefone: formattedCliPhone,
              total_agendamentos: 1,
              total_gasto: precoServico,
              ultimo_agendamento: agora.toISOString(),
            })
            .select('id')
            .single();

          if (insCliErr) {
            console.error('[ConfirmBooking] Erro ao cadastrar cliente no CRM:', insCliErr);
          } else if (novoCliente) {
            clienteId = novoCliente.id;
          }
        }
      } catch (crmEx) {
        console.error('[ConfirmBooking] Exceção ao sincronizar cliente no CRM:', crmEx);
      }
    }

    // 6. Atualização Atômica para 'confirmado' (Limpando PIN com null para não violar VARCHAR(6))
    const updateFields: Record<string, any> = {
      status: 'confirmado',
      pin_validacao: null, // pin_validacao é VARCHAR(6) no Postgres; NULL evita erro de estouro de caractere
    };

    if (clienteId) {
      updateFields.cliente_id = clienteId;
    }

    const { data: updatedRows, error: updateErr } = await adminSupabase
      .from('agendamentos')
      .update(updateFields)
      .eq('id', agendamento.id)
      .in('status', ['locked', 'pendente_pin'])
      .select('id');

    if (updateErr) {
      console.error('[ConfirmBooking] Erro de banco ao confirmar agendamento:', updateErr);
      return {
        success: false,
        error: 'Não foi possível confirmar seu agendamento. Tente novamente.',
      };
    }

    if (!updatedRows || updatedRows.length === 0) {
      // Checagem defensiva de idempotência: se o agendamento já constar como 'confirmado', retorna sucesso
      const { data: checkAtual } = await adminSupabase
        .from('agendamentos')
        .select('status')
        .eq('id', agendamento.id)
        .maybeSingle();

      if (checkAtual?.status === 'confirmado') {
        console.log(`[ConfirmBooking] Idempotência: Agendamento ${agendamento.id} já confirmado anteriormente por requisição concorrente.`);
        return { success: true, message: 'Agendamento já confirmado anteriormente.' };
      }

      return {
        success: false,
        error: 'Esta reserva expirou ou já foi atualizada por outra sessão. Por favor, reinicie o agendamento.',
      };
    }

    console.log(`[ConfirmBooking] Agendamento ${agendamento.id} confirmado com sucesso no banco de dados.`);

    // 7. Notificações Transacionais pós-confirmação via Evolution API (Não-impeditivas)
    try {
      const lojista = Array.isArray(agendamento.lojistas) ? agendamento.lojistas[0] : agendamento.lojistas;
      const servico = Array.isArray(agendamento.servicos) ? agendamento.servicos[0] : agendamento.servicos;
      const profissional = Array.isArray(agendamento.profissionais) ? agendamento.profissionais[0] : agendamento.profissionais;

      const { data: configRobo } = await adminSupabase
        .from('configuracoes_robo')
        .select('instance_name')
        .eq('lojista_id', agendamento.lojista_id)
        .maybeSingle();

      const cleanSlug = (lojista?.slug_subdominio || 'default').replace(/[^a-zA-Z0-9]/g, '_');
      const instanceName = configRobo?.instance_name || `flowagenda_${cleanSlug}`;

      const dataInicio = new Date(agendamento.data_hora_inicio);
      const dataFormatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const horaFormatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      });
      const dataFormatada = dataFormatter.format(dataInicio);
      const horaFormatada = horaFormatter.format(dataInicio);

      const nomeCliente = agendamento.cliente_nome || 'Cliente';
      const nomeLoja = lojista?.nome_estabelecimento || 'FlowAgenda';
      const nomeServico = servico?.nome_servico || 'Serviço';
      const nomeProfissional = profissional?.nome || 'Profissional Titular';

      // Extrair template customizado de confirmação do lojista (se houver)
      const templateConfirmacaoCustomizado =
        lojista?.configuracoes?.notificacoes?.whatsapp?.template_confirmacao;

      // Compilar mensagem dinâmica com fallbacks e tratamento defensivo via template-engine
      const msgCliente = compilarMensagemWhatsApp(
        templateConfirmacaoCustomizado,
        'confirmacao',
        {
          cliente: nomeCliente,
          data: dataFormatada,
          horario: horaFormatada,
          servico: nomeServico,
          profissional: nomeProfissional,
          estabelecimento: nomeLoja,
        }
      );

      // Disparo estritamente síncrono com await para o gateway da Evolution API
      if (formattedCliPhone && formattedCliPhone.length >= 10) {
        await sendEvolutionTextMessage(instanceName, formattedCliPhone, msgCliente);
      }

      // Disparo de notificação para o lojista
      const lojistaPhone = (lojista?.whatsapp_notificacao || lojista?.whatsapp || '').replace(/\D/g, '');
      if (lojistaPhone && lojistaPhone.length >= 10) {
        const formattedLojistaPhone = lojistaPhone.startsWith('55') ? lojistaPhone : `55${lojistaPhone}`;
        const msgLojista = `📅 *Novo Agendamento Confirmado!*\n\n• Cliente: ${nomeCliente} (${formattedCliPhone})\n• Data: ${dataFormatada} às ${horaFormatada}\n• Serviço: ${nomeServico}\n• Profissional: ${nomeProfissional}`;
        await sendEvolutionTextMessage(instanceName, formattedLojistaPhone, msgLojista);
      }
    } catch (notifErr) {
      console.warn('[ConfirmBooking] Falha no disparo de notificação WhatsApp pós-confirmação (não impeditivo):', notifErr);
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Não foi possível confirmar seu agendamento. Tente novamente.';
    console.error('[ConfirmBooking] Exceção crítica:', err);
    return { success: false, error: 'Não foi possível confirmar seu agendamento. Tente novamente.' };
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

