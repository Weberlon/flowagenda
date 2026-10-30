import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp-sender';
import { compilarMensagemWhatsApp } from '@/lib/whatsapp/template-engine';

/**
 * ==============================================================================
 * FlowAgenda — Worker de Ciclo de Vida de Agendamentos (Lembretes & Avaliações)
 * Arquivo: app/api/cron/appointment-lifecycle/route.ts
 * ==============================================================================
 *
 * Motor 1: Lembrete Anti-No-Show — Janela deslizante de 105 a 135 minutos antes (2h UTC).
 * Motor 2: Robô de Reputação Google 5★ — Envia pedido de avaliação 2h após o término.
 * Execução: Vercel Cron a cada 10 minutos (schedule: "* /10 * * * *")
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
  configuracoes?: Record<string, any> | null;
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
  lembrete_enviado_at?: string | null;
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
  avaliacao_enviada_at?: string | null;
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
// Helpers de Segurança e Concorrência
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
 * Executa promessas em lotes controlados com Promise.allSettled.
 * Evita explosão de concorrência na VPS e simultaneamente previne timeouts na Vercel.
 */
async function processarEmLotes<T>(
  itens: T[],
  tamanhoLote: number,
  processador: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < itens.length; i += tamanhoLote) {
    const lote = itens.slice(i, i + tamanhoLote);
    await Promise.allSettled(lote.map(processador));
  }
}

/**
 * Resolve a instância de WhatsApp multi-tenant com cache em memória no ciclo de execução.
 * Identifica configuracoes_robo ou slug determinístico: flowagenda_${slug}.
 */
async function resolveInstanceNameCached(
  supabase: ReturnType<typeof createAdminClient>,
  lojistaId: string,
  slugFallback: string | null,
  cache: Map<string, string>
): Promise<string> {
  if (cache.has(lojistaId)) {
    return cache.get(lojistaId)!;
  }

  const { data: configRobo } = await supabase
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojistaId)
    .maybeSingle();

  let resolved = '';
  if (configRobo?.instance_name) {
    resolved = configRobo.instance_name;
  } else if (slugFallback) {
    const cleanSlug = slugFallback.replace(/[^a-zA-Z0-9]/g, '_');
    resolved = `flowagenda_${cleanSlug}`;
  } else {
    resolved = process.env.EVOLUTION_DEFAULT_INSTANCE || 'flowagenda-teste';
  }

  cache.set(lojistaId, resolved);
  return resolved;
}

// ---------------------------------------------------------------------------
// Handler Principal (Cron Worker)
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const startTime = Date.now();
  let lembretesEnviados = 0;
  let avaliacoesEnviadas = 0;
  let falhas = 0;

  try {
    // =====================================================================
    // 1. Autenticação Estrita via Bearer Token
    // =====================================================================
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const xCronSecret = req.headers.get('x-cron-secret') || '';
    const tokenRecebido = bearerToken || xCronSecret;

    const cronSecret = process.env.CRON_SECRET || process.env.HOOK_TOKEN || '';

    if (!cronSecret) {
      console.error('[Lifecycle] CRON_SECRET / HOOK_TOKEN não configurado no servidor.');
      return NextResponse.json(
        { error: 'Configuração de autenticação ausente no servidor.' },
        { status: 500 }
      );
    }

    if (!tokenRecebido || !timingSafeCompare(tokenRecebido, cronSecret)) {
      console.warn('[Lifecycle] Acesso negado. Token de autorização inválido ou ausente.');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const agora = new Date();
    const nowIso = agora.toISOString();
    const instanceCache = new Map<string, string>();

    // =====================================================================
    // MOTOR 1: Lembrete Anti-No-Show (Janela deslizante UTC de 105 a 135 min)
    // Janela de 2h centrada com +/- 15 min de margem para o ciclo cron
    // =====================================================================
    const inicioJanela = new Date(agora.getTime() + 105 * 60 * 1000).toISOString();
    const fimJanela = new Date(agora.getTime() + 135 * 60 * 1000).toISOString();

    const selectQueryBase = `
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
        google_review_url,
        configuracoes
      ),
      profissionais (
        id,
        nome
      ),
      servicos (
        id,
        nome_servico
      )
    `;

    let rawLembretes: any = null;
    let lembreteErr: any = null;

    // Tentativa 1: Filtro prioritário por lembrete_enviado_at IS NULL (Blindagem anti-spam)
    const queryComTimestamp = await supabase
      .from('agendamentos')
      .select(selectQueryBase)
      .eq('status', 'confirmado')
      .is('lembrete_enviado_at', null)
      .gte('data_hora_inicio', inicioJanela)
      .lte('data_hora_inicio', fimJanela)
      .limit(50);

    if (queryComTimestamp.error && (queryComTimestamp.error.message?.includes('lembrete_enviado_at') || queryComTimestamp.error.code === '42703')) {
      // Fallback defensivo para schema legado caso a migration ainda esteja pendente
      console.warn('[Lifecycle] Coluna lembrete_enviado_at ausente no schema. Usando fallback para lembrete_enviado = false.');
      const queryFallback = await supabase
        .from('agendamentos')
        .select(selectQueryBase)
        .eq('status', 'confirmado')
        .eq('lembrete_enviado', false)
        .gte('data_hora_inicio', inicioJanela)
        .lte('data_hora_inicio', fimJanela)
        .limit(50);

      rawLembretes = queryFallback.data;
      lembreteErr = queryFallback.error;
    } else {
      rawLembretes = queryComTimestamp.data;
      lembreteErr = queryComTimestamp.error;
    }

    if (lembreteErr) {
      console.error('[Lifecycle] Erro ao consultar lembretes:', lembreteErr);
    }

    const agendamentosLembrete = (rawLembretes || []) as unknown as AgendamentoLembrete[];

    if (agendamentosLembrete.length > 0) {
      console.log(`[Lifecycle] Motor 1: ${agendamentosLembrete.length} lembretes a processar (janela: 105-135 min).`);

      // Processamento em lotes controlados (concorrência de 3 itens)
      await processarEmLotes(agendamentosLembrete, 3, async (ag) => {
        try {
          const telefone = (ag.cliente_telefone || '').replace(/\D/g, '');
          if (!telefone || telefone.length < 10) {
            // Marca como enviado para evitar reprocessamento infinito de telefone inválido
            await supabase
              .from('agendamentos')
              .update({ lembrete_enviado: true, lembrete_enviado_at: nowIso, updated_at: nowIso })
              .eq('id', ag.id);
            return;
          }

          const lojista = ag.lojistas;
          const nomeNegocio =
            lojista?.nome_negocio || lojista?.nome_estabelecimento || 'Estabelecimento';
          const nomeProfissional = ag.profissionais?.nome || 'Profissional Titular';
          const nomeCliente = ag.cliente_nome || 'Cliente';
          const nomeServico = ag.servicos?.nome_servico || 'Serviço';
          const horarioRef = ag.data_horario || ag.data_hora_inicio;
          const horarioFormatado = formatarHorarioBRT(horarioRef);

          // Roteamento multi-tenant da instância WhatsApp com cache
          const instanceName = await resolveInstanceNameCached(
            supabase,
            ag.lojista_id,
            lojista?.slug_subdominio || null,
            instanceCache
          );

          // Compilação dinâmica do lembrete com template personalizado ou fallback pt-BR
          const templateLembreteCustomizado =
            lojista?.configuracoes?.notificacoes?.whatsapp?.template_lembrete;

          const textoLembrete = compilarMensagemWhatsApp(
            templateLembreteCustomizado,
            'lembrete',
            {
              cliente: nomeCliente,
              data: 'hoje',
              horario: horarioFormatado,
              servico: nomeServico,
              profissional: nomeProfissional,
              estabelecimento: nomeNegocio,
            }
          );

          const resultado = await sendWhatsAppMessage({
            instanceName,
            number: telefone,
            text: textoLembrete,
          });

          if (resultado.success) {
            // Blindagem anti-spam: grava lembrete_enviado_at com timestamp atômico
            const updatePayload: Record<string, any> = {
              lembrete_enviado: true,
              lembrete_enviado_at: nowIso,
              updated_at: nowIso,
            };

            let updateRes = await supabase
              .from('agendamentos')
              .update(updatePayload)
              .eq('id', ag.id);

            // Se coluna lembrete_enviado_at não existir no schema remoto, remove do payload
            if (updateRes.error && (updateRes.error.message?.includes('lembrete_enviado_at') || updateRes.error.code === '42703')) {
              delete updatePayload.lembrete_enviado_at;
              updateRes = await supabase
                .from('agendamentos')
                .update(updatePayload)
                .eq('id', ag.id);
            }

            lembretesEnviados++;
          } else {
            console.warn(`[Lifecycle] Lembrete falhou para agendamento ${ag.id} (Instância: ${instanceName}):`, resultado.error);
            falhas++;
          }
        } catch (itemErr: any) {
          // Garante isolamento: falha em um lojista/cliente NUNCA derruba o processamento dos demais
          console.error(`[Lifecycle] Exceção ao processar lembrete ${ag.id}:`, itemErr?.message || itemErr);
          falhas++;
        }
      });
    }

    // =====================================================================
    // MOTOR 2: Robô de Reputação Google 5★ (2h pós-término, até 24h atrás)
    // =====================================================================
    const limiteMinimoConclusao = new Date(agora.getTime() - 120 * 60 * 1000).toISOString();
    const limiteMaximoConclusao = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const selectReviewQueryBase = `
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
    `;

    let rawReviews: any = null;
    let reviewErr: any = null;

    const queryReviewComTimestamp = await supabase
      .from('agendamentos')
      .select(selectReviewQueryBase)
      .in('status', ['concluido', 'confirmado'])
      .is('avaliacao_enviada_at', null)
      .lte('data_hora_fim', limiteMinimoConclusao)
      .gte('data_hora_fim', limiteMaximoConclusao)
      .limit(50);

    if (queryReviewComTimestamp.error && (queryReviewComTimestamp.error.message?.includes('avaliacao_enviada_at') || queryReviewComTimestamp.error.code === '42703')) {
      console.warn('[Lifecycle] Coluna avaliacao_enviada_at ausente no schema. Usando fallback para avaliacao_solicitada = false.');
      const queryReviewFallback = await supabase
        .from('agendamentos')
        .select(selectReviewQueryBase)
        .in('status', ['concluido', 'confirmado'])
        .eq('avaliacao_solicitada', false)
        .lte('data_hora_fim', limiteMinimoConclusao)
        .gte('data_hora_fim', limiteMaximoConclusao)
        .limit(50);

      rawReviews = queryReviewFallback.data;
      reviewErr = queryReviewFallback.error;
    } else {
      rawReviews = queryReviewComTimestamp.data;
      reviewErr = queryReviewComTimestamp.error;
    }

    if (reviewErr) {
      console.error('[Lifecycle] Erro ao consultar avaliações:', reviewErr);
    }

    const agendamentosReview = (rawReviews || []) as unknown as AgendamentoReview[];

    if (agendamentosReview.length > 0) {
      console.log(`[Lifecycle] Motor 2: ${agendamentosReview.length} avaliações a processar.`);

      // Processamento em lotes controlados (concorrência de 3 itens)
      await processarEmLotes(agendamentosReview, 3, async (ag) => {
        try {
          const lojista = ag.lojistas;
          const googleReviewUrl = lojista?.google_review_url;

          // Sem URL do Google Reviews → marca para não reprocessar sem envio
          if (!googleReviewUrl || !googleReviewUrl.startsWith('http')) {
            const updatePayload: Record<string, any> = {
              avaliacao_solicitada: true,
              avaliacao_enviada_at: nowIso,
              updated_at: nowIso,
            };
            let res = await supabase.from('agendamentos').update(updatePayload).eq('id', ag.id);
            if (res.error && (res.error.message?.includes('avaliacao_enviada_at') || res.error.code === '42703')) {
              delete updatePayload.avaliacao_enviada_at;
              await supabase.from('agendamentos').update(updatePayload).eq('id', ag.id);
            }
            return;
          }

          const telefone = (ag.cliente_telefone || '').replace(/\D/g, '');
          if (!telefone || telefone.length < 10) {
            const updatePayload: Record<string, any> = {
              avaliacao_solicitada: true,
              avaliacao_enviada_at: nowIso,
              updated_at: nowIso,
            };
            let res = await supabase.from('agendamentos').update(updatePayload).eq('id', ag.id);
            if (res.error && (res.error.message?.includes('avaliacao_enviada_at') || res.error.code === '42703')) {
              delete updatePayload.avaliacao_enviada_at;
              await supabase.from('agendamentos').update(updatePayload).eq('id', ag.id);
            }
            return;
          }

          const nomeNegocio =
            lojista?.nome_negocio || lojista?.nome_estabelecimento || 'Estabelecimento';
          const nomeCliente = ag.cliente_nome || 'Cliente';

          const instanceName = await resolveInstanceNameCached(
            supabase,
            ag.lojista_id,
            lojista?.slug_subdominio || null,
            instanceCache
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
            console.warn(`[Lifecycle] Avaliação falhou para agendamento ${ag.id} (Instância: ${instanceName}):`, resultado.error);
            falhas++;
          }

          // Atualização de estado da avaliação
          const updateReviewPayload: Record<string, any> = {
            avaliacao_solicitada: true,
            avaliacao_enviada_at: nowIso,
            status: ag.status === 'confirmado' ? 'concluido' : ag.status,
            updated_at: nowIso,
          };

          let updateRevRes = await supabase
            .from('agendamentos')
            .update(updateReviewPayload)
            .eq('id', ag.id);

          if (updateRevRes.error && (updateRevRes.error.message?.includes('avaliacao_enviada_at') || updateRevRes.error.code === '42703')) {
            delete updateReviewPayload.avaliacao_enviada_at;
            await supabase
              .from('agendamentos')
              .update(updateReviewPayload)
              .eq('id', ag.id);
          }
        } catch (itemErr: any) {
          console.error(`[Lifecycle] Exceção ao processar avaliação ${ag.id}:`, itemErr?.message || itemErr);
          falhas++;
        }
      });
    }

    // =====================================================================
    // Resumo e Retorno da Execução
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
