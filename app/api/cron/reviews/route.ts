import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEvolutionTextMessage } from '@/lib/evolution';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const validSecret = process.env.CRON_SECRET || process.env.HOOK_TOKEN;

    // Validação de segurança para execução automatizada pelo cron da Vercel
    if (validSecret && authHeader !== `Bearer ${validSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Janela pós-atendimento: agendamentos finalizados há mais de 2 horas
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 2);

    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select(`
        id, status, data_hora_fim,
        cliente:clientes(id, nome, telefone, total_agendamentos),
        lojista:lojistas(id, nome_estabelecimento, slug_subdominio, google_review_url)
      `)
      .eq('status', 'confirmado')
      .lte('data_hora_fim', cutoffTime.toISOString())
      .limit(50);

    if (error || !agendamentos || agendamentos.length === 0) {
      return NextResponse.json({ processed: 0, message: 'Nenhum agendamento pendente de avaliação' }, { status: 200 });
    }

    let processedCount = 0;
    let reviewsSent = 0;

    for (const ag of agendamentos) {
      const cliente = ag.cliente as any;
      const lojista = ag.lojista as any;

      // Trava Anti-Spam & Consistência:
      // 1. Só dispara se o lojista possuir google_review_url configurada
      // 2. Só dispara para clientes na 1ª ou 2ª visita para não incomodar clientes recorrentes a cada visita
      const podeEnviarReview = 
        cliente?.telefone && 
        lojista?.google_review_url && 
        (!cliente.total_agendamentos || cliente.total_agendamentos <= 2);

      if (podeEnviarReview) {
        // Busca a instância dedicada do lojista
        const { data: configRobo } = await supabase
          .from('configuracoes_robo')
          .select('instance_name')
          .eq('lojista_id', lojista.id)
          .single();

        const instanceName = configRobo?.instance_name || `flowagenda_${lojista.slug_subdominio}`;
        const nomeCliente = cliente.nome || 'Cliente';

        const mensagemReview = `Olá, *${nomeCliente}*! ✨\n\nMuito obrigado pela sua visita ao *${lojista.nome_estabelecimento}* hoje!\n\nA sua opinião é essencial para nós. Se teve uma boa experiência, poderia nos deixar uma avaliação rápida de 5 estrelas no Google? Leva menos de 30 segundos:\n\n⭐ *Avaliar no Google:*\n${lojista.google_review_url}\n\nAgradecemos de coração e esperamos você em breve! 🤝`;

        await sendEvolutionTextMessage(instanceName, cliente.telefone, mensagemReview);
        reviewsSent++;
      }

      // Conclui o agendamento no banco
      await supabase
        .from('agendamentos')
        .update({ status: 'concluido' })
        .eq('id', ag.id);

      processedCount++;
    }

    return NextResponse.json({ 
      processed: processedCount, 
      reviewsSent,
      timestamp: new Date().toISOString() 
    }, { status: 200 });

  } catch (error) {
    console.error('CRON Reviews Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
