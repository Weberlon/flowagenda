import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Processar apenas recebimento de mensagens
    if (payload.event !== 'messages.upsert' || !payload.data?.message) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const messageData = payload.data.message;
    const instanceName = payload.instance;
    const isFromMe = messageData.key?.fromMe;

    if (isFromMe) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const remoteJid = messageData.key?.remoteJid;
    const messageText = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || '';

    if (!messageText) return NextResponse.json({ received: true });

    const supabase = createAdminClient();

    // 1. Buscar Lojista
    const { data: config } = await supabase
      .from('configuracoes_robo')
      .select('lojista_id, lojista:lojistas(nome_estabelecimento, slug_subdominio, whatsapp_notificacao, bot_pausado_ate)')
      .eq('instance_name', instanceName)
      .single();

    if (!config || !config.lojista) return NextResponse.json({ received: true });
    
    const lojista = config.lojista as any; // tipagem inline
    const isPausado = lojista.bot_pausado_ate && new Date(lojista.bot_pausado_ate) > new Date();

    const lowerMsg = messageText.toLowerCase();
    const isTransbordoTrigger = lowerMsg.includes('dúvida antes de agendar') || lowerMsg.includes('falar com atendimento');

    if (isTransbordoTrigger) {
      // Pausar bot por 2h
      const resumeTime = new Date();
      resumeTime.setHours(resumeTime.getHours() + 2);
      
      await supabase
        .from('lojistas')
        .update({ bot_pausado_ate: resumeTime.toISOString() })
        .eq('id', config.lojista_id);

      // MOCK - Enviar msg pro cliente
      console.log(`\n[EVOLUTION API MOCK - Instância: ${instanceName}]`);
      console.log(`[PARA: ${remoteJid}] -> Certo! Vou chamar nossa equipe para te atender. Aguarde um instante.`);
      
      // MOCK - Enviar alerta pro lojista
      if (lojista.whatsapp_notificacao) {
        console.log(`[ALERTA PARA: ${lojista.whatsapp_notificacao}] -> 🚨 Cliente ${remoteJid.split('@')[0]} está aguardando atendimento humano no WhatsApp da clínica!`);
      }
      console.log(`\n`);

      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (isPausado) {
      // Ignora silenciosamente, humano atende
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Se bot ativo e mensagem comum
    const linkAgendamento = `https://${lojista.slug_subdominio}.flowagenda.online`;
    console.log(`\n[EVOLUTION API MOCK - Instância: ${instanceName}]`);
    console.log(`[PARA: ${remoteJid}] -> Olá! Bem-vindo(a) à ${lojista.nome_estabelecimento}. Agende seu horário direto pelo link: ${linkAgendamento}`);
    console.log(`\n`);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Evolution Error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
