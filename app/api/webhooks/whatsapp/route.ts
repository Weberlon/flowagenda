import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '@/lib/evolution';
import { extrairDadosMensagem, classificarIntencao } from '@/lib/whatsapp-parser';

dayjs.extend(utc);
dayjs.extend(timezone);

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Comparação em tempo constante contra timing attacks com guarda defensiva de tamanho
 */
function timingSafeCompare(a: string, b: string): boolean {
  try {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Cliente Supabase com privilégios de Admin (Service Role)
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase Service Role não configurado no ambiente.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(req: Request) {
  try {
    // 1. Validação opcional de segurança se EVOLUTION_WEBHOOK_SECRET estiver configurado
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerKey =
        req.headers.get('apikey') ||
        req.headers.get('x-api-key') ||
        req.headers.get('x-hook-token') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

      if (!headerKey || !timingSafeCompare(headerKey, webhookSecret)) {
        console.warn('[WEBHOOK WHATSAPP] Requisição não autorizada: segredo de webhook ausente ou inválido.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 });
    }

    // 2. Filtrar apenas eventos 'messages.upsert'
    const eventName = (body.event || body.type || '').toString().toLowerCase();
    if (eventName && eventName !== 'messages.upsert' && eventName !== 'messages_upsert') {
      return NextResponse.json({ received: true, ignored: eventName }, { status: 200 });
    }

    // 3. Extrair dados normalizados da mensagem
    const dados = extrairDadosMensagem(body);
    if (!dados) {
      return NextResponse.json({ received: true, ignored: 'dados_vazios_ou_invalidos' }, { status: 200 });
    }

    // 4. Ignorar mensagens 'fromMe' ou originadas de grupos/broadcasts
    if (dados.isFromMe || dados.isGroupOrBroadcast) {
      return NextResponse.json(
        {
          received: true,
          ignored: dados.isFromMe ? 'from_me' : 'group_or_broadcast',
        },
        { status: 200 }
      );
    }

    const instanceName = (
      body.instance ||
      body.instanceName ||
      body.data?.instanceName ||
      body.data?.instance ||
      ''
    ).toString();

    if (!instanceName) {
      console.warn('[WEBHOOK WHATSAPP] Mensagem recebida sem identificador de instância.');
      return NextResponse.json({ received: true, ignored: 'missing_instance_name' }, { status: 200 });
    }

    const supabase = getSupabaseAdmin();

    // 5. Garantir Idempotência Atômica via tabela 'webhook_eventos_processados'
    const { error: idempotenciaError } = await supabase
      .from('webhook_eventos_processados')
      .insert({
        message_id: dados.messageId,
        instance_name: instanceName,
        created_at: new Date().toISOString(),
      });

    if (idempotenciaError) {
      // Código PostgreSQL 23505: violação de constraint unique
      if (idempotenciaError.code === '23505' || idempotenciaError.message?.includes('duplicate key')) {
        console.log(`[WEBHOOK WHATSAPP] Mensagem ${dados.messageId} já processada anteriormente (idempotente).`);
        return NextResponse.json({ received: true, idempotente: true }, { status: 200 });
      }
      console.warn('[WEBHOOK WHATSAPP] Aviso no registro de idempotência:', idempotenciaError.message);
    }

    // 6. Buscar o lojista em 'lojistas' onde whatsapp_instance_name == body.instance
    let { data: lojista } = await supabase
      .from('lojistas')
      .select('id, nome_negocio, nome_estabelecimento, slug_subdominio, whatsapp_instance_name, status_pagamento')
      .eq('whatsapp_instance_name', instanceName)
      .maybeSingle();

    if (!lojista) {
      // Fallback: tentar resolução pelo slug caso a instância seja nomeada flowagenda_{slug} ou flow_{slug}
      const slugCandidate = instanceName.replace(/^flowagenda_|^flow_/, '');
      if (slugCandidate) {
        const { data: fallbackLojista } = await supabase
          .from('lojistas')
          .select('id, nome_negocio, nome_estabelecimento, slug_subdominio, whatsapp_instance_name, status_pagamento')
          .eq('slug_subdominio', slugCandidate)
          .maybeSingle();
        lojista = fallbackLojista;
      }
    }

    if (!lojista) {
      console.warn(`[WEBHOOK WHATSAPP] Nenhum lojista vinculado para a instância: ${instanceName}`);
      return NextResponse.json({ received: true, ignored: 'lojista_nao_encontrado' }, { status: 200 });
    }

    // 7. Localizar o agendamento mais relevante em 'agendamentos'
    // Critérios: lojista_id, status = 'confirmado', data_hora_inicio >= NOW() - 2h, cliente_telefone LIKE '%{ultimosOitoDigitos}'
    const duasHorasAtras = dayjs().tz(TIMEZONE).subtract(2, 'hour').toISOString();

    const { data: agendamentos, error: agendamentoErr } = await supabase
      .from('agendamentos')
      .select(`
        id,
        lojista_id,
        cliente_nome,
        cliente_telefone,
        data_hora_inicio,
        data_hora_fim,
        status,
        servico_id,
        servicos:servicos ( nome_servico )
      `)
      .eq('lojista_id', lojista.id)
      .eq('status', 'confirmado')
      .gte('data_hora_inicio', duasHorasAtras)
      .like('cliente_telefone', `%${dados.ultimosOitoDigitos}`)
      .order('data_hora_inicio', { ascending: true })
      .limit(1);

    if (agendamentoErr) {
      console.error('[WEBHOOK WHATSAPP] Erro ao buscar agendamento correspondente:', agendamentoErr);
    }

    const agendamento = agendamentos && agendamentos.length > 0 ? agendamentos[0] : null;
    const nomeCliente = agendamento?.cliente_nome || dados.pushName || 'Cliente';
    const nomeEstabelecimento = lojista.nome_negocio || lojista.nome_estabelecimento || 'FlowAgenda';
    const slugSubdominio = lojista.slug_subdominio || '';
    const rootDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'flowagenda.online';
    const linkRemarcacao = slugSubdominio ? `https://${slugSubdominio}.${rootDomain}` : `https://${rootDomain}`;

    // Caso não exista agendamento confirmado nas próximas horas
    if (!agendamento) {
      console.log(`[WEBHOOK WHATSAPP] Mensagem recebida de ${dados.telefoneLimpo}, mas nenhum agendamento confirmado em aberto.`);

      // Registrar no painel como mensagem avulsa
      await supabase.from('painel_notificacoes').insert({
        lojista_id: lojista.id,
        agendamento_id: null,
        cliente_nome: nomeCliente,
        cliente_telefone: dados.telefoneLimpo,
        tipo_evento: 'texto_livre',
        conteudo: dados.texto || '[Mensagem ou mídia avulsa]',
        created_at: new Date().toISOString(),
      });

      // Resposta informativa com o link de agendamento
      await sendWhatsAppMessage({
        instanceName,
        number: dados.telefoneLimpo,
        text: `Olá, ${nomeCliente}! 👋 Recebemos sua mensagem no ${nomeEstabelecimento}.\n\nPara agendar um novo horário ou gerenciar seus atendimentos, acesse nosso link oficial:\n👉 ${linkRemarcacao}`,
      });

      return NextResponse.json({ received: true, action: 'mensagem_sem_agendamento' }, { status: 200 });
    }

    // 8. Classificar a intenção da resposta
    const intencao = classificarIntencao(dados.texto);
    const dataFormatada = dayjs(agendamento.data_hora_inicio).tz(TIMEZONE).format('DD/MM [às] HH:mm');

    // Fluxo A: CONFIRMAR
    if (intencao === 'CONFIRMAR') {
      const agoraIso = new Date().toISOString();

      await supabase
        .from('agendamentos')
        .update({
          confirmacao_cliente_at: agoraIso,
        })
        .eq('id', agendamento.id);

      const mensagemConfirmacao = `Perfeito, ${nomeCliente}! 🎉 Sua presença está *confirmada* para o dia *${dataFormatada}* no *${nomeEstabelecimento}*.\n\nEstamos preparando tudo para te receber! ✨`;

      await sendWhatsAppMessage({
        instanceName,
        number: dados.telefoneLimpo,
        text: mensagemConfirmacao,
      });

      return NextResponse.json(
        { received: true, action: 'presenca_confirmada', agendamento_id: agendamento.id },
        { status: 200 }
      );
    }

    // Fluxo B: REMARCAR_CANCELAR
    if (intencao === 'REMARCAR_CANCELAR') {
      await supabase
        .from('agendamentos')
        .update({
          status: 'cancelado',
          cancelado_origem: 'cliente_whatsapp',
        })
        .eq('id', agendamento.id);

      // Notificar lojista/equipe no painel
      await supabase.from('painel_notificacoes').insert({
        lojista_id: lojista.id,
        agendamento_id: agendamento.id,
        cliente_nome: nomeCliente,
        cliente_telefone: dados.telefoneLimpo,
        tipo_evento: 'cancelamento_ativo',
        conteudo: `Cliente cancelou via WhatsApp o agendamento de ${dataFormatada}. Motivo informado: "${dados.texto}".`,
        created_at: new Date().toISOString(),
      });

      const mensagemCancelamento = `Entendido, ${nomeCliente}. Seu agendamento para *${dataFormatada}* foi *cancelado* com sucesso conforme solicitado. ❌\n\nCaso queira reagendar para outro dia ou horário conveniente, basta acessar o link abaixo:\n👉 ${linkRemarcacao}\n\nFicamos à disposição!`;

      await sendWhatsAppMessage({
        instanceName,
        number: dados.telefoneLimpo,
        text: mensagemCancelamento,
      });

      return NextResponse.json(
        { received: true, action: 'agendamento_cancelado', agendamento_id: agendamento.id },
        { status: 200 }
      );
    }

    // Fluxo C: TEXTO_LIVRE (áudio, dúvida, atraso ou mensagem complexa)
    const tipoEvento = dados.tipoMidia === 'audio' ? 'duvida_ou_audio' : 'texto_livre';

    await supabase.from('painel_notificacoes').insert({
      lojista_id: lojista.id,
      agendamento_id: agendamento.id,
      cliente_nome: nomeCliente,
      cliente_telefone: dados.telefoneLimpo,
      tipo_evento: tipoEvento,
      conteudo: dados.texto || `[Mídia recebida: ${dados.tipoMidia || 'desconhecida'}]`,
      created_at: new Date().toISOString(),
    });

    const mensagemRespostaPolida =
      `Olá, ${nomeCliente}! 👋 Recebemos sua mensagem e já notificamos nossa equipe para te responder em instantes.\n\n` +
      `📌 *Lembrete do seu agendamento:*\n` +
      `Você tem horário marcado para *${dataFormatada}* no *${nomeEstabelecimento}*.\n\n` +
      `👉 Digite *1* para *CONFIRMAR* sua presença.\n` +
      `👉 Digite *2* para *CANCELAR* ou reagendar.`;

    await sendWhatsAppMessage({
      instanceName,
      number: dados.telefoneLimpo,
      text: mensagemRespostaPolida,
    });

    return NextResponse.json(
      { received: true, action: 'texto_livre_encaminhado', agendamento_id: agendamento.id },
      { status: 200 }
    );
  } catch (error: any) {
    // Isole exceções em try/catch retornando HTTP 200 para prevenir loops de reenvio da Evolution API
    console.error('[WEBHOOK WHATSAPP] Erro inesperado no processamento do webhook:', error);
    return NextResponse.json(
      {
        received: true,
        error: error?.message || 'Erro interno no processamento',
      },
      { status: 200 }
    );
  }
}
