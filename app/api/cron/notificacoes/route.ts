import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendWhatsAppMessage } from '@/lib/evolution';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * ==============================================================================
 * FlowAgenda — Motor de Notificações Automáticas via Cron Job
 * Arquivo: app/api/cron/notificacoes/route.ts
 * ==============================================================================
 *
 * 1. Lote T-24h: Lembrete preventivo de agendamento amanhã (janela: 23h30 a 24h30).
 * 2. Lote T-2h: Lembrete imediato (janela: 1h45 a 2h15) com trava de horário comercial (07:30 às 21:00).
 * 3. Lote Pós-Atendimento: Coleta de avaliação Google Reviews 2h após o término.
 *
 * Segurança: Autenticação estrita Bearer token contra process.env.CRON_SECRET.
 * Resiliência: Gravação de log em notificacao_erro_log e marcação de status 'erro' contra loop.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TIMEZONE = 'America/Sao_Paulo';

// ---------------------------------------------------------------------------
// Tipos de Dados
// ---------------------------------------------------------------------------

interface LojistaData {
  id: string;
  nome_negocio: string | null;
  nome_estabelecimento: string | null;
  slug_subdominio: string | null;
  whatsapp_instance_name: string | null;
  google_review_url: string | null;
}

interface ServicoData {
  id: string;
  nome_servico: string | null;
}

interface AgendamentoNotificacao {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  status: string;
  lojista_id: string;
  servico_id: string | null;
  lembrete_enviado?: boolean | null;
  lembrete_enviado_at?: string | null;
  lembrete_24h_status?: string | null;
  lembrete_2h_enviado_at?: string | null;
  lembrete_2h_status?: string | null;
  avaliacao_solicitada?: boolean | null;
  avaliacao_enviada_at?: string | null;
  pos_atendimento_status?: string | null;
  lojistas: LojistaData | null;
  servicos: ServicoData | null;
}

interface CronSummary {
  success: boolean;
  horario_brasilia: string;
  lote_24h: { processados: number; enviados: number; erros: number };
  lote_2h: { processados: number; enviados: number; erros: number; status_comercial: string };
  lote_pos_atendimento: { processados: number; enviados: number; ignorados_sem_url: number; erros: number };
  duracao_ms: number;
}

// ---------------------------------------------------------------------------
// Helpers Auxiliares
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

/**
 * Resolução da instância WhatsApp do lojista com cache em memória
 */
async function resolveLojistaInstance(
  supabase: ReturnType<typeof createAdminClient>,
  lojistaId: string,
  lojista: LojistaData | null,
  cache: Map<string, string>
): Promise<string> {
  if (cache.has(lojistaId)) {
    return cache.get(lojistaId)!;
  }

  // 1. Campo explícito lojistas.whatsapp_instance_name
  if (lojista?.whatsapp_instance_name?.trim()) {
    const inst = lojista.whatsapp_instance_name.trim();
    cache.set(lojistaId, inst);
    return inst;
  }

  // 2. Fallback na tabela configuracoes_robo
  const { data: configRobo } = await supabase
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojistaId)
    .maybeSingle();

  if (configRobo?.instance_name?.trim()) {
    const inst = configRobo.instance_name.trim();
    cache.set(lojistaId, inst);
    return inst;
  }

  // 3. Fallback na tabela whatsapp_instances
  const { data: whatsappInst } = await supabase
    .from('whatsapp_instances')
    .select('instance_name')
    .eq('organization_id', lojistaId)
    .maybeSingle();

  if (whatsappInst?.instance_name?.trim()) {
    const inst = whatsappInst.instance_name.trim();
    cache.set(lojistaId, inst);
    return inst;
  }

  // 4. Fallback pelo slug
  if (lojista?.slug_subdominio?.trim()) {
    const cleanSlug = lojista.slug_subdominio.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const fallback = `flowagenda_${cleanSlug}`;
    cache.set(lojistaId, fallback);
    return fallback;
  }

  const defaultInst = process.env.EVOLUTION_DEFAULT_INSTANCE || 'flowagenda-teste';
  cache.set(lojistaId, defaultInst);
  return defaultInst;
}

/**
 * Registra a falha na tabela notificacao_erro_log
 */
async function registrarNotificacaoErro(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    agendamentoId: string;
    lojistaId: string;
    tipoNotificacao: 'lembrete_24h' | 'lembrete_2h' | 'pos_atendimento';
    telefone: string | null;
    erro: string;
  }
): Promise<void> {
  try {
    await supabase.from('notificacao_erro_log').insert({
      agendamento_id: params.agendamentoId,
      lojista_id: params.lojistaId,
      tipo_notificacao: params.tipoNotificacao,
      telefone: params.telefone,
      erro: params.erro,
    });
  } catch (err: any) {
    console.warn('[Cron Notificações] Falha ao registrar log de erro no banco:', err?.message || err);
  }
}

// ---------------------------------------------------------------------------
// Handler Principal (GET)
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const startTime = Date.now();

  try {
    // 1. Validação de Segurança Bearer Token
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const cronSecret = process.env.CRON_SECRET || process.env.HOOK_TOKEN || '';

    if (!cronSecret) {
      console.error('[Cron Notificações] CRON_SECRET ausente no ambiente.');
      return NextResponse.json(
        { error: 'Configuração de autenticação ausente no servidor.' },
        { status: 500 }
      );
    }

    if (!bearerToken || !timingSafeCompare(bearerToken, cronSecret)) {
      console.warn('[Cron Notificações] Acesso não autorizado.');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const nowSP = dayjs().tz(TIMEZONE);
    const nowIso = nowSP.toISOString();
    const instanceCache = new Map<string, string>();

    // Inicialização do resumo
    const summary: CronSummary = {
      success: true,
      horario_brasilia: nowSP.format('YYYY-MM-DD HH:mm:ss [America/Sao_Paulo]'),
      lote_24h: { processados: 0, enviados: 0, erros: 0 },
      lote_2h: { processados: 0, enviados: 0, erros: 0, status_comercial: 'ativo' },
      lote_pos_atendimento: { processados: 0, enviados: 0, ignorados_sem_url: 0, erros: 0 },
      duracao_ms: 0,
    };

    const selectQuery = `
      id,
      data_hora_inicio,
      data_hora_fim,
      cliente_nome,
      cliente_telefone,
      status,
      lojista_id,
      servico_id,
      lembrete_enviado,
      lembrete_enviado_at,
      lembrete_24h_status,
      lembrete_2h_enviado_at,
      lembrete_2h_status,
      avaliacao_solicitada,
      avaliacao_enviada_at,
      pos_atendimento_status,
      lojistas (
        id,
        nome_negocio,
        nome_estabelecimento,
        slug_subdominio,
        whatsapp_instance_name,
        google_review_url
      ),
      servicos (
        id,
        nome_servico
      )
    `;

    // =========================================================================
    // LOTE 1: LEMBRETE T-24h (Entre 23h30 e 24h30 à frente)
    // =========================================================================
    const inicio24h = nowSP.add(23, 'hour').add(30, 'minute').toISOString();
    const fim24h = nowSP.add(24, 'hour').add(30, 'minute').toISOString();

    const { data: rawLote24h, error: err24h } = await supabase
      .from('agendamentos')
      .select(selectQuery)
      .eq('status', 'confirmado')
      .gte('data_hora_inicio', inicio24h)
      .lte('data_hora_inicio', fim24h)
      .or('lembrete_enviado.eq.false,lembrete_24h_status.is.null')
      .limit(10);

    if (err24h) {
      console.error('[Cron Notificações] Erro ao consultar lote T-24h:', err24h);
    } else if (rawLote24h && rawLote24h.length > 0) {
      const lista24h = rawLote24h as unknown as AgendamentoNotificacao[];
      summary.lote_24h.processados = lista24h.length;

      for (const ag of lista24h) {
        try {
          const telefone = (ag.cliente_telefone || '').replace(/\D/g, '');
          if (!telefone || telefone.length < 10) {
            // Marca erro para não travar a fila
            await supabase
              .from('agendamentos')
              .update({
                lembrete_24h_status: 'erro',
                updated_at: nowIso,
              })
              .eq('id', ag.id);

            await registrarNotificacaoErro(supabase, {
              agendamentoId: ag.id,
              lojistaId: ag.lojista_id,
              tipoNotificacao: 'lembrete_24h',
              telefone: ag.cliente_telefone,
              erro: 'Número de telefone do cliente ausente ou inválido',
            });
            summary.lote_24h.erros++;
            continue;
          }

          const lojista = ag.lojistas;
          const nomeNegocio =
            lojista?.nome_negocio || lojista?.nome_estabelecimento || 'Estabelecimento';
          const nomeCliente = ag.cliente_nome || 'Cliente';
          const nomeServico = ag.servicos?.nome_servico || 'Atendimento';
          const horarioFormatado = dayjs(ag.data_hora_inicio).tz(TIMEZONE).format('DD/MM [às] HH:mm');

          const instanceName = await resolveLojistaInstance(
            supabase,
            ag.lojista_id,
            lojista,
            instanceCache
          );

          const textoMensagem =
            `Olá, *${nomeCliente}*! 📅\n\n` +
            `Passando para lembrar do seu agendamento amanhã no *${nomeNegocio}*:\n` +
            `🗓️ *Data e Horário:* ${horarioFormatado}\n` +
            `✂️ *Serviço:* ${nomeServico}\n\n` +
            `Já estamos preparando tudo para receber você! Caso tenha algum imprevisto ou precise reagendar, responda esta mensagem para nos avisar. 🤝`;

          const resultado = await sendWhatsAppMessage({
            instanceName,
            number: telefone,
            text: textoMensagem,
          });

          if (resultado.success) {
            await supabase
              .from('agendamentos')
              .update({
                lembrete_enviado: true,
                lembrete_enviado_at: nowIso,
                lembrete_24h_status: 'enviado',
                updated_at: nowIso,
              })
              .eq('id', ag.id);

            summary.lote_24h.enviados++;
          } else {
            await supabase
              .from('agendamentos')
              .update({
                lembrete_24h_status: 'erro',
                updated_at: nowIso,
              })
              .eq('id', ag.id);

            await registrarNotificacaoErro(supabase, {
              agendamentoId: ag.id,
              lojistaId: ag.lojista_id,
              tipoNotificacao: 'lembrete_24h',
              telefone,
              erro: resultado.error || 'Falha no disparo do WhatsApp via Evolution API',
            });

            summary.lote_24h.erros++;
          }
        } catch (itemErr: any) {
          console.error(`[Cron Notificações] Exceção no item T-24h ${ag.id}:`, itemErr);
          await supabase
            .from('agendamentos')
            .update({ lembrete_24h_status: 'erro', updated_at: nowIso })
            .eq('id', ag.id);

          await registrarNotificacaoErro(supabase, {
            agendamentoId: ag.id,
            lojistaId: ag.lojista_id,
            tipoNotificacao: 'lembrete_24h',
            telefone: ag.cliente_telefone,
            erro: itemErr?.message || 'Exceção não tratada ao processar envio',
          });
          summary.lote_24h.erros++;
        }
      }
    }

    // =========================================================================
    // LOTE 2: LEMBRETE T-2h (Entre 1h45 e 2h15 à frente)
    // Trava de horário comercial: disparar apenas entre 07:30 e 21:00 (Brasília)
    // =========================================================================
    const minutosAtuais = nowSP.hour() * 60 + nowSP.minute();
    const minHorarioComercial = 7 * 60 + 30; // 07:30
    const maxHorarioComercial = 21 * 60;     // 21:00
    const dentroHorarioComercial =
      minutosAtuais >= minHorarioComercial && minutosAtuais <= maxHorarioComercial;

    if (!dentroHorarioComercial) {
      summary.lote_2h.status_comercial = 'pausado_fora_horario_comercial_07:30_as_21:00';
    } else {
      const inicio2h = nowSP.add(1, 'hour').add(45, 'minute').toISOString();
      const fim2h = nowSP.add(2, 'hour').add(15, 'minute').toISOString();

      const { data: rawLote2h, error: err2h } = await supabase
        .from('agendamentos')
        .select(selectQuery)
        .eq('status', 'confirmado')
        .is('lembrete_2h_status', null)
        .gte('data_hora_inicio', inicio2h)
        .lte('data_hora_inicio', fim2h)
        .limit(10);

      if (err2h) {
        console.error('[Cron Notificações] Erro ao consultar lote T-2h:', err2h);
      } else if (rawLote2h && rawLote2h.length > 0) {
        const lista2h = rawLote2h as unknown as AgendamentoNotificacao[];
        summary.lote_2h.processados = lista2h.length;

        for (const ag of lista2h) {
          try {
            const telefone = (ag.cliente_telefone || '').replace(/\D/g, '');
            if (!telefone || telefone.length < 10) {
              await supabase
                .from('agendamentos')
                .update({
                  lembrete_2h_status: 'erro',
                  updated_at: nowIso,
                })
                .eq('id', ag.id);

              await registrarNotificacaoErro(supabase, {
                agendamentoId: ag.id,
                lojistaId: ag.lojista_id,
                tipoNotificacao: 'lembrete_2h',
                telefone: ag.cliente_telefone,
                erro: 'Número de telefone do cliente ausente ou inválido',
              });
              summary.lote_2h.erros++;
              continue;
            }

            const lojista = ag.lojistas;
            const nomeNegocio =
              lojista?.nome_negocio || lojista?.nome_estabelecimento || 'Estabelecimento';
            const nomeCliente = ag.cliente_nome || 'Cliente';
            const nomeServico = ag.servicos?.nome_servico || 'Atendimento';
            const horarioFormatado = dayjs(ag.data_hora_inicio).tz(TIMEZONE).format('HH:mm');

            const instanceName = await resolveLojistaInstance(
              supabase,
              ag.lojista_id,
              lojista,
              instanceCache
            );

            const textoMensagem =
              `Olá, *${nomeCliente}*! ⏰\n\n` +
              `Passando para lembrar que seu agendamento no *${nomeNegocio}* é logo mais, hoje às *${horarioFormatado}*!\n` +
              `✂️ *Serviço:* ${nomeServico}\n\n` +
              `Já estamos preparando tudo para te atender. Te esperamos em breve! 🚀`;

            const resultado = await sendWhatsAppMessage({
              instanceName,
              number: telefone,
              text: textoMensagem,
            });

            if (resultado.success) {
              await supabase
                .from('agendamentos')
                .update({
                  lembrete_2h_enviado_at: nowIso,
                  lembrete_2h_status: 'enviado',
                  updated_at: nowIso,
                })
                .eq('id', ag.id);

              summary.lote_2h.enviados++;
            } else {
              await supabase
                .from('agendamentos')
                .update({
                  lembrete_2h_status: 'erro',
                  updated_at: nowIso,
                })
                .eq('id', ag.id);

              await registrarNotificacaoErro(supabase, {
                agendamentoId: ag.id,
                lojistaId: ag.lojista_id,
                tipoNotificacao: 'lembrete_2h',
                telefone,
                erro: resultado.error || 'Falha no envio do lembrete imediato T-2h',
              });

              summary.lote_2h.erros++;
            }
          } catch (itemErr: any) {
            console.error(`[Cron Notificações] Exceção no item T-2h ${ag.id}:`, itemErr);
            await supabase
              .from('agendamentos')
              .update({ lembrete_2h_status: 'erro', updated_at: nowIso })
              .eq('id', ag.id);

            await registrarNotificacaoErro(supabase, {
              agendamentoId: ag.id,
              lojistaId: ag.lojista_id,
              tipoNotificacao: 'lembrete_2h',
              telefone: ag.cliente_telefone,
              erro: itemErr?.message || 'Exceção não tratada ao processar envio',
            });
            summary.lote_2h.erros++;
          }
        }
      }
    }

    // =========================================================================
    // LOTE 3: PÓS-ATENDIMENTO / GOOGLE REVIEWS (Terminados há pelo menos 2h)
    // Janela deslizante segura: término entre 2h e 24h atrás
    // =========================================================================
    const limiteMinimoConclusao = nowSP.subtract(2, 'hour').toISOString();
    const limiteMaximoConclusao = nowSP.subtract(24, 'hour').toISOString();

    const { data: rawLoteReview, error: errReview } = await supabase
      .from('agendamentos')
      .select(selectQuery)
      .in('status', ['confirmado', 'concluido'])
      .eq('avaliacao_solicitada', false)
      .is('pos_atendimento_status', null)
      .lte('data_hora_fim', limiteMinimoConclusao)
      .gte('data_hora_fim', limiteMaximoConclusao)
      .limit(10);

    if (errReview) {
      console.error('[Cron Notificações] Erro ao consultar lote pós-atendimento:', errReview);
    } else if (rawLoteReview && rawLoteReview.length > 0) {
      const listaReview = rawLoteReview as unknown as AgendamentoNotificacao[];
      summary.lote_pos_atendimento.processados = listaReview.length;

      for (const ag of listaReview) {
        try {
          const lojista = ag.lojistas;
          const reviewUrl = lojista?.google_review_url?.trim();

          // Se lojista não possui URL do Google Reviews configurada, marca para não travar
          if (!reviewUrl || !reviewUrl.startsWith('http')) {
            await supabase
              .from('agendamentos')
              .update({
                avaliacao_solicitada: true,
                pos_atendimento_status: 'ignorado_sem_url',
                status: 'concluido',
                updated_at: nowIso,
              })
              .eq('id', ag.id);

            summary.lote_pos_atendimento.ignorados_sem_url++;
            continue;
          }

          const telefone = (ag.cliente_telefone || '').replace(/\D/g, '');
          if (!telefone || telefone.length < 10) {
            await supabase
              .from('agendamentos')
              .update({
                pos_atendimento_status: 'erro',
                updated_at: nowIso,
              })
              .eq('id', ag.id);

            await registrarNotificacaoErro(supabase, {
              agendamentoId: ag.id,
              lojistaId: ag.lojista_id,
              tipoNotificacao: 'pos_atendimento',
              telefone: ag.cliente_telefone,
              erro: 'Número de telefone do cliente ausente ou inválido',
            });
            summary.lote_pos_atendimento.erros++;
            continue;
          }

          const nomeNegocio =
            lojista?.nome_negocio || lojista?.nome_estabelecimento || 'Estabelecimento';
          const nomeCliente = ag.cliente_nome || 'Cliente';

          const instanceName = await resolveLojistaInstance(
            supabase,
            ag.lojista_id,
            lojista,
            instanceCache
          );

          const textoMensagem =
            `Olá, *${nomeCliente}*! ⭐\n\n` +
            `Esperamos que sua experiência no *${nomeNegocio}* tenha sido excelente!\n\n` +
            `A sua opinião é fundamental para nós. Se puder deixar uma rápida avaliação no Google, leva menos de 1 minuto e nos ajuda muito:\n` +
            `👉 ${reviewUrl}\n\n` +
            `Agradecemos de coração pela sua confiança e preferência! 🤝`;

          const resultado = await sendWhatsAppMessage({
            instanceName,
            number: telefone,
            text: textoMensagem,
          });

          if (resultado.success) {
            await supabase
              .from('agendamentos')
              .update({
                avaliacao_solicitada: true,
                avaliacao_enviada_at: nowIso,
                pos_atendimento_status: 'enviado',
                status: 'concluido',
                updated_at: nowIso,
              })
              .eq('id', ag.id);

            summary.lote_pos_atendimento.enviados++;
          } else {
            await supabase
              .from('agendamentos')
              .update({
                pos_atendimento_status: 'erro',
                updated_at: nowIso,
              })
              .eq('id', ag.id);

            await registrarNotificacaoErro(supabase, {
              agendamentoId: ag.id,
              lojistaId: ag.lojista_id,
              tipoNotificacao: 'pos_atendimento',
              telefone,
              erro: resultado.error || 'Falha no envio da mensagem de pós-atendimento',
            });

            summary.lote_pos_atendimento.erros++;
          }
        } catch (itemErr: any) {
          console.error(`[Cron Notificações] Exceção no item pós-atendimento ${ag.id}:`, itemErr);
          await supabase
            .from('agendamentos')
            .update({ pos_atendimento_status: 'erro', updated_at: nowIso })
            .eq('id', ag.id);

          await registrarNotificacaoErro(supabase, {
            agendamentoId: ag.id,
            lojistaId: ag.lojista_id,
            tipoNotificacao: 'pos_atendimento',
            telefone: ag.cliente_telefone,
            erro: itemErr?.message || 'Exceção não tratada ao processar pós-atendimento',
          });
          summary.lote_pos_atendimento.erros++;
        }
      }
    }

    summary.duracao_ms = Date.now() - startTime;
    console.log('[Cron Notificações] Execução concluída:', summary);

    return NextResponse.json(summary, { status: 200 });
  } catch (error: any) {
    console.error('[Cron Notificações] Exceção crítica:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erro interno no motor de notificações',
        duracao_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
