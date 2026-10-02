import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 2 horas atrás
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 2);

    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('id, cliente:clientes(telefone), lojista:lojistas(id, slug_subdominio)')
      .eq('status', 'confirmado')
      .lte('data_hora_fim', cutoffTime.toISOString());

    if (error || !agendamentos || agendamentos.length === 0) {
      return NextResponse.json({ processed: 0 }, { status: 200 });
    }

    let processedCount = 0;

    for (const ag of agendamentos) {
      const cliente = ag.cliente as any;
      const lojista = ag.lojista as any;
      
      if (cliente?.telefone) {
        const reviewUrl = `https://g.page/r/${lojista.slug_subdominio}/review`; // Placeholder para URL de review do google
        
        console.log(`\n[EVOLUTION API MOCK - AVALIAÇÃO]`);
        console.log(`[PARA: ${cliente.telefone}] -> O que achou do seu atendimento hoje? Nos ajude avaliando com 5 estrelas: ${reviewUrl}\n`);
      }

      await supabase
        .from('agendamentos')
        .update({ status: 'concluido' })
        .eq('id', ag.id);

      processedCount++;
    }

    return NextResponse.json({ processed: processedCount }, { status: 200 });
  } catch (error) {
    console.error('CRON Reviews Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
