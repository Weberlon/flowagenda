import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  try {
    const token = req.headers.get('asaas-access-token');
    if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const event = payload.event;
    const customerId = payload.payment?.customer;

    if (!customerId || !event) {
      return NextResponse.json({ received: true }); // Ignorar sem erro
    }

    let novoStatus = null;
    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event)) {
      novoStatus = 'ativo';
    } else if (['PAYMENT_OVERDUE', 'PAYMENT_DUNNING_RECEIVED'].includes(event)) {
      novoStatus = 'inadimplente';
    } else if (['PAYMENT_DELETED', 'PAYMENT_REFUNDED'].includes(event)) {
      novoStatus = 'cancelado';
    }

    if (novoStatus) {
      const supabase = createAdminClient();
      await supabase
        .from('lojistas')
        .update({ status_pagamento: novoStatus })
        .eq('asaas_customer_id', customerId);
        
      // O frontend via middleware / layout bloqueia sessões inadimplentes
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Asaas Error:', error);
    return NextResponse.json({ received: true }, { status: 200 }); // Sempre 200 p/ não tentar novamente
  }
}
