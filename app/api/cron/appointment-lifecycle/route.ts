import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp-sender';

/**
 * ==============================================================================
 * FlowAgenda — Worker de Ciclo de Vida de Agendamentos (Lembretes & Avaliações)
 * Arquivo: app/api/cron/appointment-lifecycle/route.ts
 * ==============================================================================
 *
 * Motor 1: Lembrete Anti-No-Show — Dispara 2h antes do atendimento.
 * Motor 2: Robô de Reputação Google 5★ — Envia pedido de avaliação 2h após o término.
 * Execução: Vercel Cron a cada 10 minutos (expressao cron: cada 10 min)
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface LojistaJoin {
  id: string;
  nome_negocio: string | null;
  nome_estabelecimento: string | null;
  slug_subdominio: string | null;
  google_review_url: string | null;
}

interface ProfissionalJoin {
  id: string;
  nome: string | null;
}

interface ServicoJoin {
  id: string;
  nome_servico: string | null;
}

interface AgendamentoLembrete {
  id: string;
  data_horario: string | null;
  data_hora_inicio: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  lojista_id: string;
  lojistas: LojistaJoin | null;
  profissionais: ProfissionalJoin | null;
  servicos: ServicoJoin | null;
}

interface AgendamentoReview {
  id: string;
  status: string;
  data_horario: string | null;
  data_hora_inicio: string;
  data_hora_fim: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  lojista_id: string;
  lojistas: LojistaJoin | null;
  profissionais: ProfissionalJoin | null;
  servicos: ServicoJoin | null;
}

interface LifecycleSummary {
  success: boolean;
  lembretes_enviados: number;
  avaliacoes_enviadas: number;
  falhas: number;
  duration_ms: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function formatarHorarioBRT(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Resolve a instância de WhatsApp a partir de configuracoes_robo do lojista.
 * Fallback: variável de ambiente ou instância piloto.
 */
async function resolveInstanceName(
  supabase: ReturnType<typeof createAdminClient>,
  lojistaId: string,
  slugFallback: string | null
): Promise<string> {
  const { data: configRobo } = await supabase
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojistaId)
    .maybeSingle();

  if (configRobo?.instance_name) return configRobo.instance_name;
  if (slugFallback) return `flowagenda_${slugFallback}`;

  return process.env.EVOLUTION_DEFAULT_INSTANCE || 'flowagenda-teste';
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const startTime = Date.now();
  let lembretesEnviados = 0;
  let avaliacoesEnviadas = 0;
  let falhas = 0;

  try {
    // =====================================================================
    // 1. Autenticação via Bearer Token (timingSafeEqual)
    // =====================================================================
    const authHeader = req.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET || process.env.HOOK_TOKEN || '';

    if (!cronSecret) {
      console.error('[Lifecycle] CRON_SECRET / HOOK_TOKEN ausente.');
      return NextResponse.json(
        { error: 'Configuração de autenticação ausente no servidor.' },
        { status: 500 }
      );
    }

    if (!timingSafeCompare(authHeader, `Bearer ${cronSecret}`)) {
      console.warn('[Lifecycle] Acesso negado. Token inválido.');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const agora = new Date();
    const nowIso = agora.toISOString();

    // =====================================================================
    // MOTOR 1: Lembrete Anti-No-Show (janela de 1h50 a 2h10 antes)
    // =====================================================================
    const inicioJanela = new Date(agora.getTime() + 110 * 60 * 1000).toISOString();
    const fimJanela = new Date(agora.getTime() + 130 * 60 * 1000).toISOString();

    const { data: rawLembretes, error: lembreteErr } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_horario,
        data_hora_inicio,
        cliente_nome,
        cliente_telefone,
        lojista_id,
        lojistas (
          id,
          nome_negocio,
          nome_estabelecimento,
          slug_subdominio,
          google_review_url
        ),
        profissionais (
          id,
          nome
        ),
        servicos (
          id,
          nome_servico
        )
      `)
      .eq('status', 'confirmado')
      .eq('lembrete_enviado', false)
      .gte('data_hora_inicio', inicioJanela)
      .lte('data_hora_inicio', fimJanela)
      .limit(50);

    if (lembreteErr) {
      console.error('[Lifecycle] Erro ao consultar lembretes:', lembreteErr);
    }

    const agendamentosLembrete = (rawLembretes || []) as unknown as AgendamentoLembrete[];

    if (agendamentosLembrete.length > 0) {
      console.log(`[Lifecycle] Motor 1: ${agendamentosLembrete.length} lembretes a processar.`);

      const promessasLembrete = agendamentosLembrete.map(async (ag) => {
        const telefone = (ag.cliente_telefone || '').replace(/\D/g, '');
        if (!telefone || telefone.length < 10) return;

        const lojista = ag.lojistas;
        const nomeNegocio =
          lojista?.nome_negocio || lojista?.nome_estabelecimento || 'Estabelecimento';
        const nomeProfissional = ag.profissionais?.nome || 'Profissional';
        const nomeCliente = ag.cliente_nome || 'Cliente';
        const horarioRef = ag.data_horario || ag.data_hora_inicio;
        const horarioFormatado = formatarHorarioBRT(horarioRef);

        const instanceName = await resolveInstanceName(
          supabase,
          ag.lojista_id,
          lojista?.slug_subdominio || null
        );

        const resultado = await sendWhatsAppMessage({
          instanceName,
          number: telefone,
          text:
            `Olá, ${nomeCliente}! Lembramos que seu atendimento na *${nomeNegocio}* com *${nomeProfissional}* está marcado para hoje às *${horarioFormatado}*.\n\n` +
            `Caso precise remarcar ou tenha algum imprevisto, entre em contato com antecedência para liberar a vaga.`,
        });

        if (resultado.success) {
          await supabase
            .from('agendamentos')
            .update({ lembrete_enviado: true, updated_at: nowIso })
            .eq('id', ag.id);
          lembretesEnviados++;
        } else {
          console.warn(`[Lifecycle] Lembrete falhou para agendamento ${ag.id}:`, resultado.error);
          falhas++;
        }
      });

      await Promise.allSettled(promessasLembrete);
    }

    // =====================================================================
    // MOTOR 2: Robô de Reputação Google 5★ (2h pós-término, últimas 24h)
    // =====================================================================
    const limiteMinimoConclusao = new Date(agora.getTime() - 120 * 60 * 1000).toISOString();
    const limiteMaximoConclusao = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: rawReviews, error: reviewErr } = await supabase
      .from('agendamentos')
      .select(`
        id,
        status,
        data_horario,
        data_hora_inicio,
        data_hora_fim,
        cliente_nome,
        cliente_telefone,
        lojista_id,
        lojistas (
          id,
          nome_negocio,
          nome_estabelecimento,
          slug_subdominio,
          google_review_url
        ),
        profissionais (
          id,
          nome
        ),
        servicos (
          id,
          nome_servico
        )
      `)
      .in('status', ['concluido', 'confirmado'])
      .eq('avaliacao_solicitada', false)
      .lte('data_hora_fim', limiteMinimoConclusao)
      .gte('data_hora_fim', limiteMaximoConclusao)
      .limit(50);

    if (reviewErr) {
      console.error('[Lifecycle] Erro ao consultar avaliações:', reviewErr);
    }

    const agendamentosReview = (rawReviews || []) as unknown as AgendamentoReview[];

    if (agendamentosReview.length > 0) {
      console.log(`[Lifecycle] Motor 2: ${agendamentosReview.length} avaliações a processar.`);

      const promessasReview = agendamentosReview.map(async (ag) => {
        const lojista = ag.lojistas;
        const googleReviewUrl = lojista?.google_review_url;

        // Sem URL do Google Reviews → ignora silenciosamente para não enviar link quebrado
        if (!googleReviewUrl || !googleReviewUrl.startsWith('http')) {
          // Marca como solicitada para não reprocessar, mas sem envio
          await supabase
            .from('agendamentos')
            .update({ avaliacao_solicitada: true, updated_at: nowIso })
            .eq('id', ag.id);
          return;
        }

        const telefone = (ag.cliente_telefone || '').replace(/\D/g, '');
        if (!telefone || telefone.length < 10) {
          await supabase
            .from('agendamentos')
            .update({ avaliacao_solicitada: true, updated_at: nowIso })
            .eq('id', ag.id);
          return;
        }

        const nomeNegocio =
          lojista?.nome_negocio || lojista?.nome_estabelecimento || 'Estabelecimento';
        const nomeCliente = ag.cliente_nome || 'Cliente';

        const instanceName = await resolveInstanceName(
          supabase,
          ag.lojista_id,
          lojista?.slug_subdominio || null
        );

        const resultado = await sendWhatsAppMessage({
          instanceName,
          number: telefone,
          text:
            `Olá, ${nomeCliente}! Esperamos que seu atendimento na *${nomeNegocio}* tenha sido excelente! ⭐\n\n` +
            `Sua opinião é fundamental para nós. Se puder avaliar nosso atendimento no Google, leva menos de 1 minuto e nos ajuda muito:\n` +
            `👉 ${googleReviewUrl}\n\n` +
            `Agradecemos pela confiança!`,
        });

        if (resultado.success) {
          avaliacoesEnviadas++;
        } else {
          console.warn(`[Lifecycle] Avaliação falhou para agendamento ${ag.id}:`, resultado.error);
          falhas++;
        }

        // Marca como solicitada independentemente do resultado do envio
        // para não reprocessar infinitamente
        await supabase
          .from('agendamentos')
          .update({
            avaliacao_solicitada: true,
            status: ag.status === 'confirmado' ? 'concluido' : ag.status,
            updated_at: nowIso,
          })
          .eq('id', ag.id);
      });

      await Promise.allSettled(promessasReview);
    }

    // =====================================================================
    // Resumo e retorno
    // =====================================================================
    const summary: LifecycleSummary = {
      success: true,
      lembretes_enviados: lembretesEnviados,
      avaliacoes_enviadas: avaliacoesEnviadas,
      falhas,
      duration_ms: Date.now() - startTime,
    };

    console.log('[Lifecycle] Execução concluída:', summary);
    return NextResponse.json(summary, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno no lifecycle worker';
    console.error('[Lifecycle] Exceção crítica:', error);
    return NextResponse.json(
      {
        success: false,
        error: msg,
        lembretes_enviados: lembretesEnviados,
        avaliacoes_enviadas: avaliacoesEnviadas,
        falhas,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
