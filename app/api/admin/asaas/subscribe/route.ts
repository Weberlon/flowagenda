import { NextResponse } from 'next/server';
import {
  PLANOS_CONFIG,
  AsaasCycle,
  processAsaasTenantSubscription,
} from '@/lib/asaas-subscription';

export { PLANOS_CONFIG };
export type { AsaasCycle };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      lojistaId,
      cycle = 'YEARLY',
      cpfCnpj,
      incluirSetup = false,
    }: {
      lojistaId?: string;
      cycle?: AsaasCycle;
      cpfCnpj?: string;
      incluirSetup?: boolean;
    } = body;

    if (!lojistaId) {
      return NextResponse.json({ error: 'ID do lojista é obrigatório.' }, { status: 400 });
    }

    const result = await processAsaasTenantSubscription({
      lojistaId,
      cycle,
      cpfCnpj,
      incluirSetup,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || 'Erro ao processar assinatura no Asaas.',
          needsCpfCnpj: result.needsCpfCnpj,
        },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      customerId: result.customerId,
      subscriptionId: result.subscriptionId,
      invoiceUrl: result.invoiceUrl,
      setupPaymentId: result.setupPaymentId,
      setupInvoiceUrl: result.setupInvoiceUrl,
      valorAssinatura: result.valorAssinatura,
      valorSetup: result.valorSetup,
    });
  } catch (err: any) {
    console.error('[ASAAS_SUBSCRIBE_ERROR]:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno ao processar assinatura.' },
      { status: 500 }
    );
  }
}
