import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp-sender';

/**
 * ==============================================================================
 * FlowAgenda — Endpoint de Validação de PIN de Agendamento
 * Arquivo: app/api/agendamentos/validate-pin/route.ts
 * ==============================================================================
 */

interface ValidatePinBody {
  agendamentoId: string;
  pin: string;
}

/**
 * Formata data e hora ISO para o padrão brasileiro BRT
 */
function formatarDataHoraBRT(dataIso: string): string {
  try {
    const data = new Date(dataIso);
    return data.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dataIso;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ValidatePinBody;

    if (!body?.agendamentoId || !body?.pin) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros "agendamentoId" e "pin" são obrigatórios.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // 1. Localizar agendamento com relações de lojista, serviço e profissional
    const { data: agendamento, error: fetchErr } = await adminSupabase
      .from('agendamentos')
      .select(`
        id,
        lojista_id,
        profissional_id,
        servico_id,
        cliente_id,
        cliente_nome,
        cliente_telefone,
        data_hora_inicio,
        data_hora_fim,
        status,
        pin_validacao,
        expira_em,
        lojistas (
          id,
          nome_estabelecimento,
          slug_subdominio,
          whatsapp_notificacao,
          whatsapp
        ),
        servicos (
          id,
          nome_servico,
          preco
        ),
        profissionais (
          id,
          nome
        )
      `)
      .eq('id', body.agendamentoId)
      .single();

    if (fetchErr || !agendamento) {
      return NextResponse.json(
        { success: false, error: 'Agendamento não encontrado.' },
        { status: 404 }
      );
    }

    // 2. Validações de Estado, PIN e Tempo Limite
    const agora = new Date();
    const dataExpiracao = new Date(agendamento.expira_em);

    if (agendamento.status === 'confirmado') {
      return NextResponse.json(
        { success: true, message: 'Agendamento já se encontra confirmado.' },
        { status: 200 }
      );
    }

    if (agendamento.status !== 'locked' && agendamento.status !== 'pendente_pin') {
      return NextResponse.json(
        { success: false, error: `Reserva em status inválido para validação: "${agendamento.status}".` },
        { status: 400 }
      );
    }

    if (dataExpiracao <= agora) {
      // Marcar como cancelado por expiração
      await adminSupabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', agendamento.id);

      return NextResponse.json(
        { success: false, error: 'O tempo limite de 10 minutos para validação do PIN expirou. Inicie um novo agendamento.' },
        { status: 400 }
      );
    }

    if (agendamento.pin_validacao !== body.pin.trim()) {
      return NextResponse.json(
        { success: false, error: 'O PIN de validação digitado está incorreto.' },
        { status: 400 }
      );
    }

    // 3. Atualizar agendamento para confirmado e limpar PIN
    const { error: updateErr } = await adminSupabase
      .from('agendamentos')
      .update({
        status: 'confirmado',
        pin_validacao: null,
        updated_at: agora.toISOString(),
      })
      .eq('id', agendamento.id);

    if (updateErr) {
      console.error('[ValidatePin] Erro ao confirmar agendamento:', updateErr);
      return NextResponse.json(
        { success: false, error: 'Falha ao gravar confirmação no banco de dados.' },
        { status: 500 }
      );
    }

    // 4. Upsert no CRM de Clientes
    const lojista = agendamento.lojistas as any;
    const servico = agendamento.servicos as any;
    const profissional = agendamento.profissionais as any;
    const cleanPhone = (agendamento.cliente_telefone || '').replace(/\D/g, '');

    if (agendamento.lojista_id && cleanPhone) {
      try {
        const { data: clienteExistente } = await adminSupabase
          .from('clientes')
          .select('id, total_agendamentos, total_gasto')
          .eq('lojista_id', agendamento.lojista_id)
          .eq('telefone', cleanPhone)
          .maybeSingle();

        const precoServico = Number(servico?.preco || 0);

        if (clienteExistente) {
          await adminSupabase
            .from('clientes')
            .update({
              nome: agendamento.cliente_nome || undefined,
              total_agendamentos: (clienteExistente.total_agendamentos || 1) + 1,
              total_gasto: Number(clienteExistente.total_gasto || 0) + precoServico,
              ultimo_agendamento: agora.toISOString(),
              etapa_kanban: 'agendado',
              updated_at: agora.toISOString(),
            })
            .eq('id', clienteExistente.id);

          await adminSupabase
            .from('agendamentos')
            .update({ cliente_id: clienteExistente.id })
            .eq('id', agendamento.id);
        } else {
          const { data: novoCliente } = await adminSupabase
            .from('clientes')
            .insert({
              lojista_id: agendamento.lojista_id,
              nome: agendamento.cliente_nome || 'Cliente',
              telefone: cleanPhone,
              total_agendamentos: 1,
              total_gasto: precoServico,
              ultimo_agendamento: agora.toISOString(),
              etapa_kanban: 'agendado',
            })
            .select('id')
            .single();

          if (novoCliente) {
            await adminSupabase
              .from('agendamentos')
              .update({ cliente_id: novoCliente.id })
              .eq('id', agendamento.id);
          }
        }
      } catch (crmErr) {
        console.warn('[ValidatePin] Erro não impeditivo no CRM:', crmErr);
      }
    }

    // 5. Identificar Instância da Evolution API para envio WhatsApp
    const { data: configRobo } = await adminSupabase
      .from('configuracoes_robo')
      .select('instance_name')
      .eq('lojista_id', agendamento.lojista_id)
      .maybeSingle();

    const instanceName =
      configRobo?.instance_name || `flowagenda_${lojista?.slug_subdominio || 'teste'}`;

    const horarioFormatado = formatarDataHoraBRT(agendamento.data_hora_inicio);
    const nomeLoja = lojista?.nome_estabelecimento || 'FlowAgenda';
    const nomeProfissional = profissional?.nome || 'Profissional Titular';
    const nomeServico = servico?.nome_servico || 'Serviço';

    // 6. Disparo de WhatsApp de Confirmação para o Cliente
    if (cleanPhone) {
      sendWhatsAppMessage({
        instanceName,
        number: cleanPhone,
        text: `🎉 *Agendamento Confirmado com Sucesso!*\n\nOlá, *${agendamento.cliente_nome}*!\nSeu horário para *${nomeServico}* com *${nomeProfissional}* foi reservado para:\n📅 *${horarioFormatado}* no *${nomeLoja}*.\n\nCaso precise reagendar ou cancelar, entre em contato com antecedência. Nos vemos em breve!`,
      }).catch((waErr) => {
        console.warn('[ValidatePin] Falha no disparo WhatsApp para o cliente:', waErr);
      });
    }

    // 7. Disparo de Alerta para o WhatsApp do Lojista
    const whatsappLojista = (lojista?.whatsapp_notificacao || lojista?.whatsapp || '').replace(/\D/g, '');
    if (whatsappLojista && whatsappLojista.length >= 10) {
      sendWhatsAppMessage({
        instanceName,
        number: whatsappLojista,
        text: `📅 *Novo Agendamento Confirmado!*\n\nCliente: *${agendamento.cliente_nome}* (${cleanPhone})\nServiço: *${nomeServico}*\nProfissional: *${nomeProfissional}*\nHorário: *${horarioFormatado}*`,
      }).catch((waErr) => {
        console.warn('[ValidatePin] Falha no disparo WhatsApp para o lojista:', waErr);
      });
    }

    return NextResponse.json(
      { success: true, message: 'Agendamento confirmado com sucesso!' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('[ValidatePin] Exceção crítica:', error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
