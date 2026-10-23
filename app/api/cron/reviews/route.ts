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
    const agora = new Date();

    // =========================================================================
    // FASE 1: LEMBRETES PREVENTIVOS ANTI NO-SHOW (2 Horas Antes)
    // =========================================================================
    let remindersSent = 0;
    const janelaLembreteFim = new Date(agora.getTime() + 2.5 * 60 * 60 * 1000); // Próximas 2h30

    const { data: agendamentosParaLembrar } = await supabase
      .from('agendamentos')
      .select(`
        id, data_hora_inicio, pin_validacao,
        cliente:clientes(id, nome, telefone),
        servico:servicos(id, nome_servico),
        lojista:lojistas(id, nome_estabelecimento, slug_subdominio)
      `)
      .eq('status', 'confirmado')
      .gte('data_hora_inicio', agora.toISOString())
      .lte('data_hora_inicio', janelaLembreteFim.toISOString())
      .or('pin_validacao.is.null,pin_validacao.neq.LEMBR')
      .limit(30);

    if (agendamentosParaLembrar && agendamentosParaLembrar.length > 0) {
      for (const ag of agendamentosParaLembrar) {
        const cliente = ag.cliente as any;
        const lojista = ag.lojista as any;
        const servico = ag.servico as any;

        if (cliente?.telefone && lojista) {
          // Busca a instância do lojista
          const { data: configRobo } = await supabase
            .from('configuracoes_robo')
            .select('instance_name')
            .eq('lojista_id', lojista.id)
            .single();

          const instanceName = configRobo?.instance_name || `flowagenda_${lojista.slug_subdominio}`;
          const nomeCliente = cliente.nome || 'Cliente';
          const nomeServico = servico?.nome_servico || 'Atendimento';

          // Formatar hora no fuso horário oficial de Brasília
          const horarioFormatado = new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
          });

          const mensagemLembrete =
            `Olá, *${nomeCliente}*! ⏰\n\n` +
            `Passando para lembrar do seu agendamento hoje no *${lojista.nome_estabelecimento}*:\n\n` +
            `🗓️ *Horário:* às ${horarioFormatado}\n` +
            `✂️ *Serviço:* ${nomeServico}\n\n` +
            `Já estamos preparando tudo para receber você! Caso tenha algum imprevisto ou precise reagendar, responda esta mensagem para nos avisar. 🤝`;

          await sendEvolutionTextMessage(instanceName, cliente.telefone, mensagemLembrete);
          remindersSent++;
        }

        // Marca idempotente para não reenviar lembrete
        await supabase
          .from('agendamentos')
          .update({ pin_validacao: 'LEMBR' })
          .eq('id', ag.id);
      }
    }

    // =========================================================================
    // FASE 2: AVALIAÇÕES GOOGLE MEU NEGÓCIO 5★ & CONCLUSÃO (2 Horas Pós-Atendimento)
    // =========================================================================
    let reviewsSent = 0;
    let appointmentsCompleted = 0;
    const cutoffPosAtendimento = new Date(agora.getTime() - 2 * 60 * 60 * 1000); // Finalizado há mais de 2h

    const { data: agendamentosParaReview, error: reviewError } = await supabase
      .from('agendamentos')
      .select(`
        id, status, data_hora_fim,
        cliente:clientes(id, nome, telefone, total_agendamentos),
        lojista:lojistas(id, nome_estabelecimento, slug_subdominio, google_review_url)
      `)
      .eq('status', 'confirmado')
      .lte('data_hora_fim', cutoffPosAtendimento.toISOString())
      .limit(50);

    if (agendamentosParaReview && agendamentosParaReview.length > 0) {
      for (const ag of agendamentosParaReview) {
        const cliente = ag.cliente as any;
        const lojista = ag.lojista as any;

        // Trava Anti-Spam & Consistência:
        // 1. Só dispara se o lojista possuir google_review_url configurada
        // 2. Só dispara para clientes na 1ª ou 2ª visita para não desgastar clientes frequentes
        const podeEnviarReview =
          cliente?.telefone &&
          lojista?.google_review_url &&
          (!cliente.total_agendamentos || cliente.total_agendamentos <= 2);

        if (podeEnviarReview) {
          const { data: configRobo } = await supabase
            .from('configuracoes_robo')
            .select('instance_name')
            .eq('lojista_id', lojista.id)
            .single();

          const instanceName = configRobo?.instance_name || `flowagenda_${lojista.slug_subdominio}`;
          const nomeCliente = cliente.nome || 'Cliente';

          const mensagemReview =
            `Olá, *${nomeCliente}*! ✨\n\n` +
            `Muito obrigado pela sua visita ao *${lojista.nome_estabelecimento}* hoje!\n\n` +
            `A sua opinião é essencial para nós. Se você teve uma boa experiência, poderia nos deixar uma avaliação rápida de 5 estrelas no Google? Leva menos de 30 segundos:\n\n` +
            `⭐ *Avaliar no Google:*\n${lojista.google_review_url}\n\n` +
            `Agradecemos de coração e esperamos você em breve! 🤝`;

          await sendEvolutionTextMessage(instanceName, cliente.telefone, mensagemReview);
          reviewsSent++;
        }

        // Conclui o agendamento no banco
        await supabase
          .from('agendamentos')
          .update({ status: 'concluido' })
          .eq('id', ag.id);

        appointmentsCompleted++;
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      reviewsSent,
      appointmentsCompleted,
      timestamp: agora.toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error('CRON Reviews & Reminders Error:', error);
    return NextResponse.json({ error: 'Internal Error', message: (error as Error).message }, { status: 500 });
  }
}
