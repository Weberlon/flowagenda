import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEvolutionTextMessage, maskPhoneNumber } from '@/lib/evolution';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Processar apenas recebimento de mensagens
    if (payload.event !== 'messages.upsert' || !payload.data) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Compatibilidade com diferentes formatos de payload da Evolution API
    const dataItem = Array.isArray(payload.data) ? payload.data[0] : payload.data;
    const messageObj = dataItem?.message || dataItem;
    const key = dataItem?.key || messageObj?.key;

    // Ignorar mensagens enviadas por nós mesmos
    if (key?.fromMe) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const remoteJid = key?.remoteJid as string | undefined;
    if (!remoteJid) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Regra de Proteção: Ignorar grupos (@g.us) e canais/broadcasts de status (@broadcast)
    if (remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) {
      return NextResponse.json({ received: true, ignored: 'group_or_broadcast' }, { status: 200 });
    }

    // Extrair o texto da mensagem
    const messageText: string =
      messageObj?.message?.conversation ||
      messageObj?.message?.extendedTextMessage?.text ||
      messageObj?.conversation ||
      messageObj?.text ||
      '';

    if (!messageText.trim()) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const instanceName = (payload.instance || payload.instanceName) as string;
    if (!instanceName) {
      return NextResponse.json({ received: true, error: 'missing_instance' }, { status: 200 });
    }

    // Extrair telefone do cliente sem sulfixo @s.whatsapp.net
    const clientPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (!clientPhone) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const supabase = createAdminClient();

    // 1. Buscar Lojista e Configurações do Robô
    const { data: config, error } = await supabase
      .from('configuracoes_robo')
      .select(`
        id,
        lojista_id,
        instance_name,
        mensagem_boas_vindas,
        bot_pausado_ate,
        lojista:lojistas (
          id,
          nome_estabelecimento,
          slug_subdominio,
          dominio_proprio,
          status_pagamento,
          whatsapp_notificacao
        )
      `)
      .eq('instance_name', instanceName)
      .single();

    if (error || !config || !config.lojista) {
      console.warn(`[WEBHOOK EVOLUTION] Instância não encontrada ou sem lojista vinculado: ${instanceName}`);
      return NextResponse.json({ received: true });
    }

    const lojista = config.lojista as unknown as {
      id: string;
      nome_estabelecimento: string;
      slug_subdominio: string;
      dominio_proprio: string | null;
      status_pagamento: string;
      whatsapp_notificacao: string | null;
    };

    // 2. Proteção de Assinatura: Se inadimplente ou cancelado, o bot não atende
    if (lojista.status_pagamento === 'inadimplente' || lojista.status_pagamento === 'cancelado') {
      return NextResponse.json({ received: true, status: 'tenant_suspended' }, { status: 200 });
    }

    const lowerMsg = messageText.toLowerCase();

    // 3. Gatilhos de Transbordo Humano
    const isTransbordoTrigger =
      lowerMsg.includes('humano') ||
      lowerMsg.includes('atendente') ||
      lowerMsg.includes('falar com atendente') ||
      lowerMsg.includes('falar com recepcionista') ||
      lowerMsg.includes('falar com alguém') ||
      lowerMsg.includes('dúvida antes de agendar') ||
      lowerMsg.includes('duvida antes de agendar') ||
      lowerMsg.includes('atendimento humano');

    if (isTransbordoTrigger) {
      // Pausar o robô por 2 horas para permitir atendimento humano livre
      const resumeTime = new Date();
      resumeTime.setHours(resumeTime.getHours() + 2);

      await supabase
        .from('configuracoes_robo')
        .update({ bot_pausado_ate: resumeTime.toISOString() })
        .eq('id', config.id);

      // Resposta imediata e empática para o cliente
      await sendEvolutionTextMessage(
        instanceName,
        clientPhone,
        `Compreendo perfeitamente! 🤝 Já notifiquei nossa equipe e um atendente humano irá falar com você por aqui em instantes. Por favor, aguarde!`
      );

      // Alerta para o WhatsApp do lojista/recepção
      if (lojista.whatsapp_notificacao) {
        const masked = maskPhoneNumber(clientPhone);
        const snippet = messageText.length > 120 ? `${messageText.slice(0, 120)}...` : messageText;
        await sendEvolutionTextMessage(
          instanceName,
          lojista.whatsapp_notificacao,
          `🚨 *ALERTA FLOWAGENDA - Atendimento Humano Solicitado*\n\n` +
          `O cliente *${masked}* pediu para falar com um humano no WhatsApp da empresa.\n\n` +
          `*Mensagem enviada:* "${snippet}"\n\n` +
          `⏸️ O robô foi pausado automaticamente por 2 horas para você poder responder livremente.`
        );
      }

      return NextResponse.json({ received: true, action: 'transbordo_ativado' }, { status: 200 });
    }

    // 4. Se o bot estiver em pausa (humano já atendendo), não responde
    const isPausado = config.bot_pausado_ate && new Date(config.bot_pausado_ate) > new Date();
    if (isPausado) {
      return NextResponse.json({ received: true, action: 'bot_em_pausa' }, { status: 200 });
    }

    // 5. Resposta Automática Padrão com Link de Agendamento
    const linkAgendamento = lojista.dominio_proprio
      ? `https://${lojista.dominio_proprio}`
      : `https://${lojista.slug_subdominio}.flowagenda.online`;

    const templateMsg =
      config.mensagem_boas_vindas ||
      'Oi, tudo bem? Que bom ter você por aqui! 🤖 Sou o robô de agendamento do(a) {nome_estabelecimento}. Para marcar seu horário rapidinho sem precisar esperar, acesse: {link_agendamento}';

    const textoFinal = templateMsg
      .replaceAll('{nome_estabelecimento}', lojista.nome_estabelecimento)
      .replaceAll('{link_agendamento}', linkAgendamento);

    // Disparo real via Evolution API
    await sendEvolutionTextMessage(instanceName, clientPhone, textoFinal);

    return NextResponse.json({ received: true, action: 'boas_vindas_enviado' }, { status: 200 });
  } catch (error) {
    console.error('Webhook Evolution Error:', error);
    return NextResponse.json({ received: true, error: (error as Error).message }, { status: 200 });
  }
}
