import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEvolutionTextMessage, maskPhoneNumber } from '@/lib/evolution';
import { checkContactAiPauseStatus } from '@/lib/ai-handoff';
import crypto from 'crypto';

// Comparação segura em tempo constante contra timing attacks com guarda defensiva de tamanho
function timingSafeCompare(a: string, b: string): boolean {
  try {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufferA = Buffer.from(a, 'utf-8');
    const bufferB = Buffer.from(b, 'utf-8');
    // crypto.timingSafeEqual lança erro fatal se os comprimentos forem divergentes
    if (bufferA.length !== bufferB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const receivedToken =
      req.headers.get('apikey') ||
      req.headers.get('x-api-key') ||
      req.headers.get('apiKey') ||
      req.headers.get('x-hook-token') ||
      req.headers.get('webhook-token') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
      url.searchParams.get('apikey') ||
      url.searchParams.get('apiKey') ||
      url.searchParams.get('token') ||
      url.searchParams.get('secret');

    const expectedTokens = [
      process.env.EVOLUTION_WEBHOOK_SECRET,
      process.env.EVOLUTION_API_KEY,
      process.env.HOOK_TOKEN,
    ].filter(Boolean) as string[];

    // Validação estrita de autenticação: rejeita requisições sem token ou com token inválido
    if (expectedTokens.length > 0) {
      if (!receivedToken) {
        console.warn('[WEBHOOK EVOLUTION] Tentativa de acesso não autorizada: token ausente nos cabeçalhos.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const isValid = expectedTokens.some((expected) => timingSafeCompare(receivedToken, expected));
      if (!isValid) {
        console.warn('[WEBHOOK EVOLUTION] Tentativa de acesso com token inválido.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = await req.json();
    const eventName = (payload.event || payload.type || '').toString().toLowerCase();

    // 1. Tratamento de Atualização de Status de Conexão (CONNECTION_UPDATE / connection.update)
    if (eventName === 'connection.update' || eventName === 'connection_update') {
      const instanceName = (payload.instance || payload.instanceName || payload.data?.instanceName || payload.data?.instance) as string;
      const rawState = (payload.data?.state || payload.data?.status || payload.state || '').toString().toLowerCase();

      if (instanceName && rawState) {
        console.log(`[WEBHOOK EVOLUTION] Atualização de conexão para ${instanceName}: ${rawState}`);
        const supabase = createAdminClient();
        const mappedStatus = rawState === 'open' ? 'open' : rawState === 'connecting' ? 'connecting' : 'desconectado';

        await supabase
          .from('configuracoes_robo')
          .update({ 
            status_conexao: mappedStatus,
            updated_at: new Date().toISOString() 
          })
          .eq('instance_name', instanceName);

        try {
          await supabase
            .from('whatsapp_instances')
            .update({
              status_conexao: rawState === 'open' ? 'online' : 'offline',
              status: mappedStatus,
              ultima_verificacao: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('instance_name', instanceName);
        } catch {
          // Não impeditivo se whatsapp_instances não estiver no schema
        }
      }

      return NextResponse.json({ received: true, action: 'connection_status_updated' }, { status: 200 });
    }

    // 2. Processar apenas recebimento de mensagens (messages.upsert / MESSAGES_UPSERT)
    if ((eventName !== 'messages.upsert' && eventName !== 'messages_upsert') || !payload.data) {
      return NextResponse.json({ received: true, ignored: eventName }, { status: 200 });
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

    const instanceName = (payload.instance || payload.instanceName || dataItem?.instanceName || dataItem?.instance) as string;
    if (!instanceName) {
      return NextResponse.json({ received: true, error: 'missing_instance' }, { status: 200 });
    }

    // Extrair telefone do cliente sem sufixo @s.whatsapp.net
    const clientPhone = remoteJid.replace(/@.*$/, '').replace(/\D/g, '');
    if (!clientPhone) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Detectar tipo de conteúdo (texto vs mídia)
    const innerMessage = messageObj?.message || messageObj;
    const isMediaMessage = Boolean(
      innerMessage?.audioMessage ||
      innerMessage?.imageMessage ||
      innerMessage?.videoMessage ||
      innerMessage?.stickerMessage ||
      innerMessage?.documentMessage
    );

    const messageText: string =
      innerMessage?.conversation ||
      innerMessage?.extendedTextMessage?.text ||
      messageObj?.conversation ||
      messageObj?.text ||
      '';

    const supabase = createAdminClient();

    // 1. Buscar Lojista e Configurações do Robô (com fallback caso novas colunas de IA ainda não existam)
    let { data: config, error } = await supabase
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
          whatsapp_notificacao,
          use_ai_agent,
          is_founder,
          ai_credits
        )
      `)
      .eq('instance_name', instanceName)
      .maybeSingle();

    if (error && error.message?.includes('column')) {
      const retry = await supabase
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
        .maybeSingle();
      config = retry.data as any;
      error = retry.error;
    }

    if (error || !config || !config.lojista) {
      console.warn(`[WEBHOOK EVOLUTION] Instância não encontrada ou sem lojista vinculado: ${instanceName}`);
      return NextResponse.json({ received: true });
    }

    const lojista = (Array.isArray(config.lojista) ? config.lojista[0] : config.lojista) as unknown as {
      id: string;
      nome_estabelecimento: string;
      slug_subdominio: string;
      dominio_proprio: string | null;
      status_pagamento: string;
      whatsapp_notificacao: string | null;
      use_ai_agent?: boolean | null;
      is_founder?: boolean | null;
      ai_credits?: number | null;
    };

    // 2. Proteção de Assinatura: Se inadimplente ou cancelado, o bot não atende
    if (lojista.status_pagamento === 'inadimplente' || lojista.status_pagamento === 'cancelado') {
      return NextResponse.json({ received: true, status: 'tenant_suspended' }, { status: 200 });
    }

    // 2.1 Verificar Handoff Humano por Contato (IA pausada para este remoteJid)
    const pauseStatus = await checkContactAiPauseStatus(supabase, lojista.id, remoteJid);
    if (pauseStatus.isPaused) {
      await supabase.from('painel_notificacoes').insert({
        lojista_id: lojista.id,
        agendamento_id: null,
        cliente_nome: dataItem?.pushName || payload?.pushName || 'Cliente',
        cliente_telefone: clientPhone,
        tipo_evento: 'atendimento_humano_ativo',
        conteudo: messageText.trim() || '[Mídia recebida durante atendimento humano]',
        created_at: new Date().toISOString(),
      });
      return NextResponse.json(
        { received: true, status: 'ai_paused_for_contact', paused_until: pauseStatus.pausedUntil },
        { status: 200 }
      );
    }

    // 3. CASO 2: Se a mensagem recebida for mídia (áudio, imagem, vídeo, sticker), avisar educadamente
    if (isMediaMessage) {
      await sendEvolutionTextMessage(
        instanceName,
        clientPhone,
        'Olá! 😊 No momento nosso atendimento automático compreende apenas mensagens de *texto*. Poderia escrever sua dúvida ou solicitação por escrito, por favor?'
      );
      return NextResponse.json({ received: true, action: 'media_unsupported_replied' }, { status: 200 });
    }

    const cleanContent = messageText.trim();
    if (!cleanContent) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // 4. Avaliação de Elegibilidade do Agente de IA + Bypass Fundador
    const useAiAgent = Boolean(lojista.use_ai_agent);
    const isFounder = Boolean(lojista.is_founder);
    const aiCredits = typeof lojista.ai_credits === 'number' ? lojista.ai_credits : 0;
    const isAiEligible = useAiAgent && (isFounder || aiCredits > 0);

    // CASO 3 (IA Ativa): Enfileirar na chat_queue com janela de debounce de 8 segundos
    if (isAiEligible) {
      const messageId: string = key?.id || dataItem?.id || `msg_${Date.now()}`;
      const senderName: string | null = dataItem?.pushName || payload?.pushName || null;
      const scheduledForIso = new Date(Date.now() + 8000).toISOString();

      // Empurra a janela de debounce de mensagens pendentes anteriores do mesmo remote_jid
      await supabase
        .from('chat_queue')
        .update({
          scheduled_for: scheduledForIso,
          updated_at: new Date().toISOString(),
        })
        .eq('lojista_id', lojista.id)
        .eq('remote_jid', remoteJid)
        .eq('status', 'pending');

      // Insere a nova mensagem na fila de processamento da IA
      const { error: queueError } = await supabase.from('chat_queue').insert({
        lojista_id: lojista.id,
        remote_jid: remoteJid,
        message_id: messageId,
        sender_name: senderName,
        content: cleanContent,
        status: 'pending',
        scheduled_for: scheduledForIso,
      });

      if (queueError) {
        console.error('[WEBHOOK EVOLUTION] Erro ao enfileirar mensagem na chat_queue:', queueError.message);
      } else {
        return NextResponse.json({ status: 'queued' }, { status: 200 });
      }
    }

    // CASO 1 (Fallback Invisível): Se use_ai_agent for falso ou sem créditos (e não founder), segue o fluxo padrão
    const lowerMsg = cleanContent.toLowerCase();

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
