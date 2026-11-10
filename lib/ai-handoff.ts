import { createAdminClient } from '@/utils/supabase/admin';
import { sendWhatsAppMessage } from '@/lib/evolution';

/**
 * ==============================================================================
 * FlowAgenda — Controle de Handoff Humano (Pausa da IA) & Radar de Follow-up
 * Arquivo: lib/ai-handoff.ts
 * ==============================================================================
 */

export interface ContactAiPauseStatus {
  isPaused: boolean;
  pausedUntil: string | null;
  clienteId?: string | null;
}

/**
 * Normaliza os últimos 8 dígitos de um telefone ou remote_jid para matching confiável no Brasil
 * (independente da presença ou ausência do nono dígito 9 após o DDD)
 */
export function extractLastEightDigits(phoneOrJid: string): string {
  const clean = (phoneOrJid || '').replace(/@.*$/, '').replace(/\D/g, '');
  return clean.length >= 8 ? clean.slice(-8) : clean;
}

/**
 * Verifica se a IA está pausada para um determinado contato (telefone ou remote_jid) de um lojista.
 * Lê tanto `custom_metadata.ai_paused_until` quanto eventual coluna `ai_paused_until` na tabela `clientes`.
 */
export async function checkContactAiPauseStatus(
  supabase: ReturnType<typeof createAdminClient>,
  lojistaId: string,
  phoneOrJid: string
): Promise<ContactAiPauseStatus> {
  try {
    const last8 = extractLastEightDigits(phoneOrJid);
    if (!last8) {
      return { isPaused: false, pausedUntil: null };
    }

    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, telefone, custom_metadata')
      .eq('lojista_id', lojistaId)
      .like('telefone', `%${last8}`)
      .limit(1);

    const cliente = clientes && clientes.length > 0 ? clientes[0] : null;
    if (!cliente) {
      return { isPaused: false, pausedUntil: null };
    }

    const metadata =
      cliente.custom_metadata && typeof cliente.custom_metadata === 'object'
        ? (cliente.custom_metadata as Record<string, any>)
        : {};

    const pausedUntilRaw: string | null =
      metadata.ai_paused_until || (cliente as any).ai_paused_until || null;

    if (!pausedUntilRaw) {
      return { isPaused: false, pausedUntil: null, clienteId: cliente.id };
    }

    const pausedUntilDate = new Date(pausedUntilRaw);
    const isPaused =
      !isNaN(pausedUntilDate.getTime()) && pausedUntilDate.getTime() > Date.now();

    return {
      isPaused,
      pausedUntil: isPaused ? pausedUntilDate.toISOString() : null,
      clienteId: cliente.id,
    };
  } catch (err) {
    console.warn('[AI Handoff] Aviso ao checar status de pausa da IA:', err);
    return { isPaused: false, pausedUntil: null };
  }
}

/**
 * Define ou remove a pausa da IA para um contato específico (por clienteId ou telefone/remoteJid).
 * Se `pause = true`, pausa por `hours` (padrão 24 horas) e cancela mensagens pendentes na `chat_queue`.
 */
export async function setContactAiPauseState(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    lojistaId: string;
    clienteId?: string;
    telefone?: string;
    nomeCliente?: string;
    pause: boolean;
    hours?: number;
  }
): Promise<{ success: boolean; pausedUntil: string | null; error?: string }> {
  try {
    const { lojistaId, pause, hours = 24 } = params;
    const pausedUntilIso = pause
      ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      : null;

    let targetCliente: any = null;

    if (params.clienteId) {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, telefone, custom_metadata')
        .eq('id', params.clienteId)
        .eq('lojista_id', lojistaId)
        .maybeSingle();
      targetCliente = data;
    }

    if (!targetCliente && params.telefone) {
      const last8 = extractLastEightDigits(params.telefone);
      if (last8) {
        const { data: list } = await supabase
          .from('clientes')
          .select('id, nome, telefone, custom_metadata')
          .eq('lojista_id', lojistaId)
          .like('telefone', `%${last8}`)
          .limit(1);
        targetCliente = list && list.length > 0 ? list[0] : null;
      }
    }

    const cleanPhone = (params.telefone || targetCliente?.telefone || '')
      .replace(/@.*$/, '')
      .replace(/\D/g, '');

    if (targetCliente) {
      const currentMeta =
        targetCliente.custom_metadata && typeof targetCliente.custom_metadata === 'object'
          ? (targetCliente.custom_metadata as Record<string, any>)
          : {};

      const updatedMeta = {
        ...currentMeta,
        ai_paused_until: pausedUntilIso,
        ai_handoff_updated_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase
        .from('clientes')
        .update({
          custom_metadata: updatedMeta,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetCliente.id)
        .eq('lojista_id', lojistaId);

      if (updateErr) {
        return { success: false, pausedUntil: null, error: updateErr.message };
      }
    } else if (cleanPhone) {
      // Caso o contato do Inbox ainda não esteja na tabela clientes, cria o registro de lead
      const { error: insertErr } = await supabase.from('clientes').insert({
        lojista_id: lojistaId,
        nome: params.nomeCliente?.trim() || 'Contato WhatsApp',
        telefone: cleanPhone,
        etapa_kanban: 'lead',
        total_agendamentos: 0,
        total_gasto: 0,
        custom_metadata: {
          ai_paused_until: pausedUntilIso,
          ai_handoff_updated_at: new Date().toISOString(),
        },
      });

      if (insertErr) {
        return { success: false, pausedUntil: null, error: insertErr.message };
      }
    } else {
      return {
        success: false,
        pausedUntil: null,
        error: 'Identificador ou telefone do cliente ausente.',
      };
    }

    // Se pausou a IA, remove/deleta eventuais itens pendentes desse contato na chat_queue via remote_jid
    if (pause && cleanPhone) {
      await supabase
        .from('chat_queue')
        .delete()
        .eq('lojista_id', lojistaId)
        .eq('status', 'pending')
        .like('remote_jid', `${cleanPhone}%`);

      const last8 = extractLastEightDigits(cleanPhone);
      if (last8 && !cleanPhone.startsWith('55')) {
        await supabase
          .from('chat_queue')
          .delete()
          .eq('lojista_id', lojistaId)
          .eq('status', 'pending')
          .like('remote_jid', `%${last8}%`);
      }
    }

    return {
      success: true,
      pausedUntil: pausedUntilIso,
    };
  } catch (err: any) {
    console.error('[AI Handoff] Erro ao atualizar pausa da IA:', err);
    return {
      success: false,
      pausedUntil: null,
      error: err?.message || 'Erro ao atualizar estado de pausa da IA.',
    };
  }
}

/**
 * ==============================================================================
 * ROTINA DE RADAR / FOLLOW-UP (LEADS FRIOS > 3 HORAS)
 * ==============================================================================
 * Identifica leads ou conversas sem agendamento futuro que ficaram sem resposta
 * há mais de 3 horas (entre 3h e 24h atrás) e dispara um lembrete curto, cordial
 * e sem pressão convidando o cliente a retomar o agendamento se desejar.
 */
export interface ColdLeadsFollowUpSummary {
  evaluated: number;
  sent: number;
  skipped: number;
}

export async function runColdLeadsFollowUpRadar(): Promise<ColdLeadsFollowUpSummary> {
  const supabase = createAdminClient();
  const nowMs = Date.now();
  const threeHoursAgoIso = new Date(nowMs - 3 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgoIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

  let evaluated = 0;
  let sent = 0;
  let skipped = 0;

  try {
    // Busca conversas concluídas na chat_queue entre 24h e 3h atrás
    const { data: recentQueueRows, error } = await supabase
      .from('chat_queue')
      .select('id, lojista_id, remote_jid, sender_name, created_at')
      .eq('status', 'completed')
      .lte('created_at', threeHoursAgoIso)
      .gte('created_at', twentyFourHoursAgoIso)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error || !recentQueueRows || recentQueueRows.length === 0) {
      return { evaluated: 0, sent: 0, skipped: 0 };
    }

    // Deduplica por (lojista_id + remote_jid) mantendo apenas a interação mais recente
    const uniqueContacts = new Map<
      string,
      { id: string; lojista_id: string; remote_jid: string; sender_name: string | null; created_at: string }
    >();

    for (const row of recentQueueRows) {
      const key = `${row.lojista_id}:::${row.remote_jid}`;
      if (!uniqueContacts.has(key)) {
        uniqueContacts.set(key, row);
      }
    }

    for (const [, contact] of uniqueContacts.entries()) {
      evaluated++;
      const last8 = extractLastEightDigits(contact.remote_jid);
      if (!last8) {
        skipped++;
        continue;
      }

      // 1. Verifica se houve mensagem mais recente (< 3h) do mesmo cliente na chat_queue
      const { data: newerMsgs } = await supabase
        .from('chat_queue')
        .select('id')
        .eq('lojista_id', contact.lojista_id)
        .eq('remote_jid', contact.remote_jid)
        .gt('created_at', threeHoursAgoIso)
        .limit(1);

      if (newerMsgs && newerMsgs.length > 0) {
        skipped++;
        continue;
      }

      // 2. Verifica cliente no CRM (se IA está pausada ou se já recebeu follow-up nas últimas 48h)
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome, telefone, custom_metadata')
        .eq('lojista_id', contact.lojista_id)
        .like('telefone', `%${last8}`)
        .limit(1);

      const cliente = clientes && clientes.length > 0 ? clientes[0] : null;
      const metadata =
        cliente?.custom_metadata && typeof cliente.custom_metadata === 'object'
          ? (cliente.custom_metadata as Record<string, any>)
          : {};

      // Respeita pausa de handoff humano
      if (metadata.ai_paused_until && new Date(metadata.ai_paused_until).getTime() > nowMs) {
        skipped++;
        continue;
      }

      // Evita múltiplos disparos de follow-up para o mesmo lead em menos de 48h
      if (
        metadata.last_followup_sent_at &&
        nowMs - new Date(metadata.last_followup_sent_at).getTime() < 48 * 60 * 60 * 1000
      ) {
        skipped++;
        continue;
      }

      // 3. Verifica se o cliente já tem agendamento confirmado ou pendente futuro
      const { data: activeBookings } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('lojista_id', contact.lojista_id)
        .in('status', ['confirmado', 'pendente_pin'])
        .gte('data_hora_inicio', new Date(nowMs - 60 * 60 * 1000).toISOString())
        .like('cliente_telefone', `%${last8}`)
        .limit(1);

      if (activeBookings && activeBookings.length > 0) {
        skipped++;
        continue;
      }

      // 4. Busca dados do lojista para montar link e instância
      const { data: lojista } = await supabase
        .from('lojistas')
        .select(
          'id, nome_estabelecimento, nome_negocio, slug_subdominio, dominio_proprio, whatsapp_instance_name, use_ai_agent, status_pagamento'
        )
        .eq('id', contact.lojista_id)
        .maybeSingle();

      if (
        !lojista ||
        !lojista.use_ai_agent ||
        lojista.status_pagamento === 'inadimplente' ||
        lojista.status_pagamento === 'cancelado'
      ) {
        skipped++;
        continue;
      }

      let instanceName = lojista.whatsapp_instance_name?.trim() || '';
      if (!instanceName) {
        const { data: configRobo } = await supabase
          .from('configuracoes_robo')
          .select('instance_name')
          .eq('lojista_id', lojista.id)
          .maybeSingle();
        instanceName = configRobo?.instance_name?.trim() || '';
      }

      if (!instanceName && lojista.slug_subdominio) {
        instanceName = `flowagenda_${lojista.slug_subdominio.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }

      if (!instanceName) {
        skipped++;
        continue;
      }

      const rootDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'flowagenda.online';
      const linkAgendamento = lojista.dominio_proprio
        ? `https://${lojista.dominio_proprio}`
        : lojista.slug_subdominio
        ? `https://${lojista.slug_subdominio}.${rootDomain}`
        : `https://${rootDomain}`;

      const nomeCliente = cliente?.nome || contact.sender_name || 'tudo bem';
      const nomeLoja = lojista.nome_estabelecimento || lojista.nome_negocio || 'nosso espaço';
      const phoneClean = contact.remote_jid.replace(/@.*$/, '').replace(/\D/g, '');

      // Template curto, cordial e sem pressão
      const mensagemFollowUp =
        `Oi, ${nomeCliente}! Passando rapidinho apenas para deixar nosso link de horários aqui do *${nomeLoja}* caso ainda queira garantir sua vaga de forma prática: ${linkAgendamento}\n\n` +
        `Fique à vontade e, se precisar de qualquer ajuda, é só chamar! 😊`;

      const sendRes = await sendWhatsAppMessage({
        instanceName,
        number: phoneClean,
        text: mensagemFollowUp,
      });

      if (sendRes.success) {
        sent++;
        const nowIso = new Date().toISOString();
        if (cliente) {
          await supabase
            .from('clientes')
            .update({
              custom_metadata: {
                ...metadata,
                last_followup_sent_at: nowIso,
              },
              updated_at: nowIso,
            })
            .eq('id', cliente.id);
        } else {
          await supabase.from('clientes').insert({
            lojista_id: lojista.id,
            nome: contact.sender_name || 'Contato WhatsApp',
            telefone: phoneClean,
            etapa_kanban: 'lead',
            total_agendamentos: 0,
            total_gasto: 0,
            custom_metadata: {
              last_followup_sent_at: nowIso,
            },
          });
        }
      } else {
        skipped++;
      }
    }
  } catch (err) {
    console.error('[Follow-up Radar] Erro durante varredura de leads frios:', err);
  }

  return { evaluated, sent, skipped };
}

