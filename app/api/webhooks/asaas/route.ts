import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import crypto from 'crypto';
import { sendWhatsAppMessage } from '@/lib/whatsapp-sender';
import { refundAsaasPayment } from '@/lib/asaas';

/**
 * ==============================================================================
 * FlowAgenda — Webhook Idempotente Asaas API v3
 * Cobrança de Assinaturas SaaS & Sinal Pix de Agendamentos com Proteção de Concorrência
 * Arquivo: app/api/webhooks/asaas/route.ts
 * ==============================================================================
 */

// Comparação segura em tempo constante contra timing attacks (Skill asaas-webhook-guard)
function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufferA = Buffer.from(a, 'utf-8');
    const bufferB = Buffer.from(b, 'utf-8');
    if (bufferA.length !== bufferB.length) return false;
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}

// Memória rápida de deduplicação recente para garantir idempotência em reenvios imediatos
const processedEventIds = new Set<string>();

/**
 * Formata data e hora ISO para o padrão brasileiro BRT
 */
function formatarDataHoraBRT(dataIso: string): string {
  try {
    const data = new Date(dataIso);
    return data.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dataIso;
  }
}

export async function POST(req: Request) {
  try {
    const expectedSecret =
      process.env.ASAAS_WEBHOOK_SECRET || process.env.ASAAS_WEBHOOK_TOKEN;
    const receivedToken = req.headers.get('asaas-access-token');

    // 1. Validação estrita de autenticação por token do webhook
    if (!receivedToken || !expectedSecret || !timingSafeCompare(receivedToken, expectedSecret)) {
      console.warn('[ASAAS WEBHOOK] Tentativa de acesso não autorizada. Token ausente ou divergente.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await req.json()) as Record<string, any>;
    const event = payload.event as string;
    const payment = payload.payment || {};
    const paymentId = payment.id || payload.id;
    const eventId = `${event}_${paymentId || Date.now()}`;

    // 2. Barreira Primária de Idempotência em Memória
    if (processedEventIds.has(eventId)) {
      console.log(`[ASAAS WEBHOOK] Evento duplicado ignorado (Idempotente): ${eventId}`);
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    processedEventIds.add(eventId);

    if (processedEventIds.size > 2000) {
      processedEventIds.clear();
    }

    const adminSupabase = createAdminClient();

    // 3. Verificar se o evento é de confirmação ou recebimento de pagamento
    const isPaymentConfirmed =
      event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED';

    if (isPaymentConfirmed && paymentId) {
      // 3.1 Buscar agendamento associado pelo asaas_payment_id
      const { data: agendamento, error: agendamentoErr } = await adminSupabase
        .from('agendamentos')
        .select(`
          id,
          lojista_id,
          profissional_id,
          servico_id,
          cliente_id,
          cliente_nome,
          cliente_telefone,
          data_hora_inicio,
          data_hora_fim,
          status,
          expira_em,
          valor_sinal,
          asaas_payment_id,
          lojistas (
            id,
            nome_estabelecimento,
            slug_subdominio,
            whatsapp_notificacao,
            whatsapp
          ),
          servicos (
            id,
            nome_servico
          ),
          profissionais (
            id,
            nome
          )
        `)
        .eq('asaas_payment_id', paymentId)
        .maybeSingle();

      if (!agendamentoErr && agendamento) {
        // BARREIRA DE IDEMPOTÊNCIA DO BANCO:
        if (agendamento.status === 'confirmado') {
          console.log(`[ASAAS WEBHOOK] Agendamento ${agendamento.id} já confirmado previamente. Encerrando idempotente.`);
          return NextResponse.json({ received: true, alreadyConfirmed: true }, { status: 200 });
        }

        const agora = new Date();
        const expiraEm = new Date(agendamento.expira_em);
        const lojista = agendamento.lojistas as any;
        const servico = agendamento.servicos as any;
        const profissional = agendamento.profissionais as any;
        const cleanPhone = (agendamento.cliente_telefone || '').replace(/\D/g, '');
        const horarioFormatado = formatarDataHoraBRT(agendamento.data_hora_inicio);
        const nomeLoja = lojista?.nome_estabelecimento || 'FlowAgenda';
        const nomeProfissional = profissional?.nome || 'Profissional Titular';
        const nomeServico = servico?.nome_servico || 'Serviço';

        // Buscar nome da instância WhatsApp do lojista
        const { data: configRobo } = await adminSupabase
          .from('configuracoes_robo')
          .select('instance_name')
          .eq('lojista_id', agendamento.lojista_id)
          .maybeSingle();

        const instanceName =
          configRobo?.instance_name || `flowagenda_${lojista?.slug_subdominio || 'teste'}`;

        // CENÁRIO 1: Pagamento no Prazo (new Date(expira_em) > new Date())
        if (expiraEm > agora) {
          console.log(`[ASAAS WEBHOOK] Pagamento no prazo para agendamento ${agendamento.id}. Confirmando...`);

          await adminSupabase
            .from('agendamentos')
            .update({
              status: 'confirmado',
              updated_at: agora.toISOString(),
            })
            .eq('id', agendamento.id);

          // Atualizar CRM
          if (cleanPhone && agendamento.lojista_id) {
            try {
              const { data: clienteExistente } = await adminSupabase
                .from('clientes')
                .select('id, total_agendamentos')
                .eq('lojista_id', agendamento.lojista_id)
                .eq('telefone', cleanPhone)
                .maybeSingle();

              if (clienteExistente) {
                await adminSupabase
                  .from('clientes')
                  .update({
                    total_agendamentos: (clienteExistente.total_agendamentos || 1) + 1,
                    ultimo_agendamento: agora.toISOString(),
                    etapa_kanban: 'agendado',
                    updated_at: agora.toISOString(),
                  })
                  .eq('id', clienteExistente.id);
              }
            } catch (crmErr) {
              console.warn('[ASAAS WEBHOOK] Erro no CRM (não impeditivo):', crmErr);
            }
          }

          // Disparar WhatsApp para o cliente
          if (cleanPhone) {
            sendWhatsAppMessage({
              instanceName,
              number: cleanPhone,
              text: `🎉 *Pagamento do Sinal Confirmado!*\n\nOlá, *${agendamento.cliente_nome}*!\nSeu Pix foi recebido e seu agendamento para *${nomeServico}* com *${nomeProfissional}* está 100% garantido para:\n📅 *${horarioFormatado}* no *${nomeLoja}*.\n\nNos vemos em breve!`,
            }).catch((waErr) => console.warn('[ASAAS WEBHOOK] Erro envio cliente:', waErr));
          }

          // Alerta no WhatsApp do Lojista
          const whatsappLojista = (lojista?.whatsapp_notificacao || lojista?.whatsapp || '').replace(/\D/g, '');
          if (whatsappLojista && whatsappLojista.length >= 10) {
            sendWhatsAppMessage({
              instanceName,
              number: whatsappLojista,
              text: `💰 *Sinal Pix Confirmado!*\n\nCliente: *${agendamento.cliente_nome}* (${cleanPhone})\nServiço: *${nomeServico}*\nProfissional: *${nomeProfissional}*\nHorário: *${horarioFormatado}*\nValor Recebido: R$ ${Number(agendamento.valor_sinal || 0).toFixed(2)}`,
            }).catch((waErr) => console.warn('[ASAAS WEBHOOK] Erro envio lojista:', waErr));
          }

          return NextResponse.json({ received: true, mode: 'pix_confirmed' }, { status: 200 });
        }

        // CENÁRIO 2: Pagamento Tardio com Colisão de Slot (Horário Expirado e Ocupado)
        console.warn(`[ASAAS WEBHOOK] Pagamento recebido após expiração (${expiraEm.toISOString()}) para agendamento ${agendamento.id}.`);

        // Verificar se outro agendamento já confirmou aquele slot para o mesmo profissional
        const { data: ocupanteConcorrente } = await adminSupabase
          .from('agendamentos')
          .select('id, cliente_nome')
          .eq('profissional_id', agendamento.profissional_id)
          .eq('status', 'confirmado')
          .neq('id', agendamento.id)
          .lt('data_hora_inicio', agendamento.data_hora_fim)
          .gt('data_hora_fim', agendamento.data_hora_inicio)
          .maybeSingle();

        if (ocupanteConcorrente) {
          console.warn(`[ASAAS WEBHOOK] Colisão detectada: Slot ocupado por ${ocupanteConcorrente.id}. Iniciando estorno automático.`);

          // 1. Chamar endpoint de estorno do Asaas
          const refundResult = await refundAsaasPayment(
            paymentId,
            Number(agendamento.valor_sinal),
            'Estorno por reserva Pix expirada e ocupada por outro cliente'
          );

          // 2. Atualizar agendamento para estornado_concorrencia
          await adminSupabase
            .from('agendamentos')
            .update({
              status: 'estornado_concorrencia',
              updated_at: agora.toISOString(),
            })
            .eq('id', agendamento.id);

          // 3. Enviar mensagem de estorno para o cliente
          const valorFormatado = Number(agendamento.valor_sinal || payment.value || 0).toFixed(2);
          if (cleanPhone) {
            sendWhatsAppMessage({
              instanceName,
              number: cleanPhone,
              text: `Identificamos que o Pix foi pago após o tempo limite de 10 minutos e a vaga foi ocupada. Seu estorno de R$ ${valorFormatado} foi processado integralmente na sua conta Pix.`,
            }).catch((waErr) => console.warn('[ASAAS WEBHOOK] Erro envio estorno WhatsApp:', waErr));
          }

          return NextResponse.json(
            { received: true, mode: 'refunded_collision', refundSuccess: refundResult.success },
            { status: 200 }
          );
        } else {
          // Vaga ainda livre: confirma mesmo com ligeiro atraso
          console.log(`[ASAAS WEBHOOK] Slot ainda livre. Confirmando agendamento tardio ${agendamento.id}.`);
          await adminSupabase
            .from('agendamentos')
            .update({
              status: 'confirmado',
              updated_at: agora.toISOString(),
            })
            .eq('id', agendamento.id);

          if (cleanPhone) {
            sendWhatsAppMessage({
              instanceName,
              number: cleanPhone,
              text: `🎉 *Agendamento Confirmado!*\n\nOlá, *${agendamento.cliente_nome}*!\nSeu Pix foi recebido e sua vaga para *${nomeServico}* está confirmada para:\n📅 *${horarioFormatado}* no *${nomeLoja}*.`,
            }).catch(() => {});
          }

          return NextResponse.json({ received: true, mode: 'late_pix_confirmed' }, { status: 200 });
        }
      }
    }

    // 4. Fluxo de Assinaturas de Lojistas SaaS (Mantido integralmente)
    const customerId = payload.payment?.customer || payload.customer;
    const subscriptionId = payload.payment?.subscription || payload.subscription;

    let novoStatus: 'ativo' | 'inadimplente' | 'cancelado' | null = null;

    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'SUBSCRIPTION_CREATED'].includes(event)) {
      novoStatus = 'ativo';
    } else if (['PAYMENT_OVERDUE', 'PAYMENT_DUNNING_RECEIVED'].includes(event)) {
      novoStatus = 'inadimplente';
    } else if (['PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'SUBSCRIPTION_DELETED'].includes(event)) {
      novoStatus = 'cancelado';
    }

    if (novoStatus && (customerId || subscriptionId)) {
      let updateQuery = adminSupabase.from('lojistas').update({
        status_pagamento: novoStatus,
      });

      if (customerId && subscriptionId) {
        updateQuery = updateQuery.or(
          `asaas_customer_id.eq.${customerId},asaas_subscription_id.eq.${subscriptionId}`
        );
      } else if (customerId) {
        updateQuery = updateQuery.eq('asaas_customer_id', customerId);
      } else if (subscriptionId) {
        updateQuery = updateQuery.eq('asaas_subscription_id', subscriptionId);
      }

      const { data, error } = await updateQuery.select('id, nome_estabelecimento, status_pagamento');

      if (error) {
        console.error('[ASAAS WEBHOOK] Erro no banco ao atualizar status de assinatura:', error);
      } else {
        console.log(`[ASAAS WEBHOOK] Status de assinatura atualizado para '${novoStatus}':`, data);
      }
    }

    return NextResponse.json({ received: true, event }, { status: 200 });
  } catch (error) {
    console.error('[ASAAS WEBHOOK] Exceção interna não tratada:', error);
    return NextResponse.json({ received: true, error: 'Internal fallback' }, { status: 200 });
  }
}
