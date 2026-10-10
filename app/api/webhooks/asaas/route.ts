import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import crypto from 'crypto';

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

export async function POST(req: Request) {
  try {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    const receivedToken = req.headers.get('asaas-access-token');

    // Validação estrita de autenticação
    if (!receivedToken || !expectedToken || !timingSafeCompare(receivedToken, expectedToken)) {
      console.warn('[ASAAS WEBHOOK] Tentativa de acesso não autorizada. Token ausente ou divergente.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const event = payload.event;
    const eventId = payload.id || payload.payment?.id || `${event}_${Date.now()}`;

    // 1. Idempotência: Se o evento já foi processado neste ciclo, retorna 200 prontamente
    if (processedEventIds.has(eventId)) {
      console.log(`[ASAAS WEBHOOK] Evento duplicado ignorado (Idempotente): ${eventId}`);
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    processedEventIds.add(eventId);

    // Limpeza da memória para não crescer indefinidamente
    if (processedEventIds.size > 2000) {
      processedEventIds.clear();
    }

    const customerId = payload.payment?.customer || payload.customer;
    const subscriptionId = payload.payment?.subscription || payload.subscription;

    if (!event || (!customerId && !subscriptionId)) {
      console.log(`[ASAAS WEBHOOK] Evento ${event} recebido sem identificadores de cliente/assinatura.`);
      return NextResponse.json({ received: true });
    }

    // 2. Mapeamento de Eventos para Status de Pagamento da Loja
    let novoStatus: 'ativo' | 'inadimplente' | 'cancelado' | null = null;

    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'SUBSCRIPTION_CREATED'].includes(event)) {
      novoStatus = 'ativo';
    } else if (['PAYMENT_OVERDUE', 'PAYMENT_DUNNING_RECEIVED'].includes(event)) {
      novoStatus = 'inadimplente';
    } else if (['PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'SUBSCRIPTION_DELETED'].includes(event)) {
      novoStatus = 'cancelado';
    }

    if (novoStatus) {
      const supabase = createAdminClient();

      // Busca e atualiza pelo customer_id ou subscription_id
      let updateQuery = supabase.from('lojistas').update({ 
        status_pagamento: novoStatus 
      });

      if (customerId && subscriptionId) {
        updateQuery = updateQuery.or(`asaas_customer_id.eq.${customerId},asaas_subscription_id.eq.${subscriptionId}`);
      } else if (customerId) {
        updateQuery = updateQuery.eq('asaas_customer_id', customerId);
      } else if (subscriptionId) {
        updateQuery = updateQuery.eq('asaas_subscription_id', subscriptionId);
      }

      const { data, error } = await updateQuery.select('id, nome_estabelecimento, status_pagamento');

      if (error) {
        console.error('[ASAAS WEBHOOK] Erro no banco ao atualizar status:', error);
      } else {
        console.log(`[ASAAS WEBHOOK] Status de pagamento atualizado para '${novoStatus}':`, data);
      }
    }

    return NextResponse.json({ received: true, event }, { status: 200 });
  } catch (error) {
    console.error('[ASAAS WEBHOOK] Exceção interna não tratada:', error);
    // Retorna HTTP 200 para confirmar recebimento e evitar spam de retentativas
    return NextResponse.json({ received: true, error: 'Internal fallback' }, { status: 200 });
  }
}
