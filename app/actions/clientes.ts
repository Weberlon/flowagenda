'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendWhatsAppMessage } from '@/lib/evolution';
import { setContactAiPauseState } from '@/lib/ai-handoff';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export interface ClienteCRM {
  id: string;
  lojista_id: string;
  nome: string;
  telefone: string;
  etapa_kanban: 'lead' | 'agendado' | 'atendido' | 'no_show' | 'fidelizado' | string;
  total_gasto: number;
  total_agendamentos: number;
  ultimo_agendamento?: string | null;
  observacoes?: string | null;
  tags?: string[] | null;
  ai_paused_until?: string | null;
  custom_metadata?: Record<string, any> | null;
  created_at: string;
  updated_at?: string | null;
}

// 1. getClientes(): Busca todos os clientes com isolamento seguro RLS
export async function getClientes() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autorizado');

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : (supabase as any);

  let lojista: any = null;

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    profile?.role === 'superadmin' ||
    profile?.role === 'admin';

  if (isSuperAdmin) {
    const cookieStore = await cookies();
    const impersonateTenantId = cookieStore.get('flow_impersonate_tenant_id')?.value;
    if (impersonateTenantId) {
      const { data: targetLojista } = await adminClient
        .from('lojistas')
        .select('*')
        .eq('id', impersonateTenantId)
        .maybeSingle();
      if (targetLojista) lojista = targetLojista;
    }
  }

  if (!lojista) {
    const { data: userLojista } = await adminClient
      .from('lojistas')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userLojista) {
      lojista = userLojista;
    } else if (isSuperAdmin) {
      const { data: firstLojista } = await adminClient
        .from('lojistas')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstLojista) lojista = firstLojista;
    }
  }

  if (!lojista) throw new Error('Lojista não encontrado');

  const queryClient = isSuperAdmin ? adminClient : supabase;

  const { data: clientes, error: clientesErr } = await queryClient
    .from('clientes')
    .select('*')
    .eq('lojista_id', lojista.id)
    .order('updated_at', { ascending: false, nullsFirst: false });

  if (clientesErr) {
    // Fallback caso updated_at ainda não exista
    const retry = await queryClient
      .from('clientes')
      .select('*')
      .eq('lojista_id', lojista.id)
      .order('created_at', { ascending: false });
    
    if (retry.error) throw new Error(`Erro ao buscar clientes: ${retry.error.message}`);
    
    return formatClientesResponse(lojista, retry.data || []);
  }

  return formatClientesResponse(lojista, clientes || []);
}

// Helper para normalizar tipos e calcular KPIs e LTV
function formatClientesResponse(lojista: any, rawClientes: any[]) {
  const clientes: ClienteCRM[] = rawClientes.map((c) => {
    const meta =
      c.custom_metadata && typeof c.custom_metadata === 'object'
        ? (c.custom_metadata as Record<string, any>)
        : {};
    const aiPausedUntil = meta.ai_paused_until || c.ai_paused_until || null;

    return {
      id: c.id,
      lojista_id: c.lojista_id,
      nome: c.nome,
      telefone: (c.telefone || '').replace(/\D/g, ''),
      etapa_kanban: c.etapa_kanban || 'lead',
      total_gasto: Number(c.total_gasto || 0),
      total_agendamentos: Number(c.total_agendamentos || 0),
      ultimo_agendamento: c.ultimo_agendamento || null,
      observacoes: c.observacoes || '',
      tags: Array.isArray(c.tags) ? c.tags : [],
      ai_paused_until: aiPausedUntil,
      custom_metadata: meta,
      created_at: c.created_at,
      updated_at: c.updated_at || c.created_at,
    };
  });

  const totalClientes = clientes.length;
  const ltvTotal = clientes.reduce((acc, c) => acc + (c.total_gasto || 0), 0);
  const clientesRecorrentes = clientes.filter((c) => c.total_agendamentos >= 2).length;
  const totalAgendamentosGeral = clientes.reduce((acc, c) => acc + (c.total_agendamentos || 0), 0);

  return {
    lojista,
    clientes,
    kpis: {
      totalClientes,
      ltvTotal,
      clientesRecorrentes,
      totalAgendamentosGeral,
    },
  };
}

// 2. upsertCliente(): Criação/Atualização atômica com higienização de telefone
export async function upsertCliente(dados: {
  nome: string;
  telefone: string;
  etapa_kanban?: string;
  valor_adicional?: number;
  observacoes?: string;
  tags?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Não autorizado' };

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  const nome = dados.nome?.trim();
  if (!nome || nome.length < 2) {
    return { success: false, error: 'O nome deve ter pelo menos 2 caracteres.' };
  }

  // Higienização estrita de telefone
  const telefone = (dados.telefone || '').replace(/\D/g, '');
  if (!telefone || telefone.length < 10 || telefone.length > 13) {
    return { success: false, error: 'Informe um número de WhatsApp válido com DDD (ex: 11999998888).' };
  }

  // Verifica cliente existente por lojista_id e telefone
  const { data: clienteExistente } = await supabase
    .from('clientes')
    .select('id, total_agendamentos, total_gasto, etapa_kanban, observacoes, tags')
    .eq('lojista_id', lojista.id)
    .eq('telefone', telefone)
    .single();

  const now = new Date().toISOString();
  const etapa = dados.etapa_kanban || 'lead';
  const valorAdicional = Number(dados.valor_adicional || 0);

  if (clienteExistente) {
    const novoTotalGasto = Number(clienteExistente.total_gasto || 0) + valorAdicional;
    const updatePayload: Record<string, any> = {
      nome,
      etapa_kanban: etapa,
      total_gasto: novoTotalGasto,
      updated_at: now,
    };

    if (dados.observacoes !== undefined) {
      updatePayload.observacoes = dados.observacoes;
    }
    if (dados.tags !== undefined) {
      updatePayload.tags = dados.tags;
    }

    const { error: updateErr } = await supabase
      .from('clientes')
      .update(updatePayload)
      .eq('id', clienteExistente.id)
      .eq('lojista_id', lojista.id);

    if (updateErr) {
      return { success: false, error: `Erro ao atualizar cliente: ${updateErr.message}` };
    }
  } else {
    const insertPayload: Record<string, any> = {
      lojista_id: lojista.id,
      nome,
      telefone,
      etapa_kanban: etapa,
      total_gasto: valorAdicional,
      total_agendamentos: valorAdicional > 0 ? 1 : 0,
      observacoes: dados.observacoes || '',
      tags: dados.tags || [],
      created_at: now,
      updated_at: now,
    };

    const { error: insertErr } = await supabase
      .from('clientes')
      .insert(insertPayload);

    if (insertErr) {
      return { success: false, error: `Erro ao criar cliente: ${insertErr.message}` };
    }
  }

  revalidatePath('/dashboard/clientes');
  return { success: true };
}

// 3. updateClienteEtapa(): Atualização rápida de coluna no Kanban
export async function updateClienteEtapa(clienteId: string, novaEtapa: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Não autorizado' };

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  const etapasValidas = ['lead', 'agendado', 'atendido', 'no_show', 'fidelizado'];
  if (!etapasValidas.includes(novaEtapa)) {
    return { success: false, error: 'Etapa inválida.' };
  }

  const { error } = await supabase
    .from('clientes')
    .update({
      etapa_kanban: novaEtapa,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clienteId)
    .eq('lojista_id', lojista.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/clientes');
  return { success: true };
}

// 4. updateClienteNotas(): Atualiza observações internas, tags e custom_metadata (JSONB)
export async function updateClienteNotas(
  clienteId: string,
  observacoes: string,
  tags: string[],
  customMetadata?: Record<string, any>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Não autorizado' };

  const lojista = await resolveActiveLojistaForClientes(supabase, user.id);
  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  const updatePayload: Record<string, any> = {
    observacoes: observacoes || '',
    tags: Array.isArray(tags) ? tags : [],
    updated_at: new Date().toISOString(),
  };

  if (customMetadata && typeof customMetadata === 'object') {
    const { data: currentCliente } = await supabase
      .from('clientes')
      .select('custom_metadata')
      .eq('id', clienteId)
      .eq('lojista_id', lojista.id)
      .maybeSingle();

    const existingMeta =
      currentCliente?.custom_metadata && typeof currentCliente.custom_metadata === 'object'
        ? (currentCliente.custom_metadata as Record<string, any>)
        : {};

    // Preserva chaves reservadas do sistema (ai_paused_until, ai_handoff_updated_at, last_followup_sent_at)
    const systemKeys: Record<string, any> = {};
    if (existingMeta.ai_paused_until !== undefined) {
      systemKeys.ai_paused_until = existingMeta.ai_paused_until;
    }
    if (existingMeta.ai_handoff_updated_at !== undefined) {
      systemKeys.ai_handoff_updated_at = existingMeta.ai_handoff_updated_at;
    }
    if (existingMeta.last_followup_sent_at !== undefined) {
      systemKeys.last_followup_sent_at = existingMeta.last_followup_sent_at;
    }

    updatePayload.custom_metadata = {
      ...customMetadata,
      ...systemKeys,
    };
  }

  const { error } = await supabase
    .from('clientes')
    .update(updatePayload)
    .eq('id', clienteId)
    .eq('lojista_id', lojista.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/clientes');
  return { success: true };
}

// 5. deleteClienteAction(): Remoção segura
export async function deleteClienteAction(clienteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Não autorizado' };

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', clienteId)
    .eq('lojista_id', lojista.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/clientes');
  return { success: true };
}

// 6. getClienteHistoricoNotas(): Busca notas estruturadas de voz com isolamento RLS
export interface ClienteHistoricoNota {
  id: string;
  cliente_id: string;
  lojista_id: string;
  profissional_id?: string | null;
  procedimento: string;
  observacoes?: string | null;
  proximo_passo?: string | null;
  modo_gravacao: 'gemini' | 'local';
  created_at: string;
  updated_at?: string;
  profissionais?: { nome: string } | null;
}

export async function getClienteHistoricoNotas(clienteId: string): Promise<ClienteHistoricoNota[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) return [];

  const { data: notas, error } = await supabase
    .from('cliente_historico_notas')
    .select(`
      id,
      cliente_id,
      lojista_id,
      profissional_id,
      procedimento,
      observacoes,
      proximo_passo,
      modo_gravacao,
      created_at,
      updated_at,
      profissionais (
        nome
      )
    `)
    .eq('cliente_id', clienteId)
    .eq('lojista_id', lojista.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar histórico de notas:', error.message);
    return [];
  }

  return (notas || []) as unknown as ClienteHistoricoNota[];
}

// 7. deleteClienteHistoricoNota(): Remove uma anotação específica
export async function deleteClienteHistoricoNota(notaId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Não autorizado' };

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  const { error } = await supabase
    .from('cliente_historico_notas')
    .delete()
    .eq('id', notaId)
    .eq('lojista_id', lojista.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Manter compatibilidade com getClientesData
export const getClientesData = getClientes;

/**
 * Helper interno para resolver o lojista ativo na sessão (suportando impersonação Super Admin)
 */
async function resolveActiveLojistaForClientes(supabase: any, userId: string) {
  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : (supabase as any);

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    profile?.role === 'superadmin' ||
    profile?.role === 'admin';

  if (isSuperAdmin) {
    const cookieStore = await cookies();
    const impersonateTenantId = cookieStore.get('flow_impersonate_tenant_id')?.value;
    if (impersonateTenantId) {
      const { data: targetLojista } = await adminClient
        .from('lojistas')
        .select('id, nome_estabelecimento, slug_subdominio, whatsapp_instance_name')
        .eq('id', impersonateTenantId)
        .maybeSingle();
      if (targetLojista) return targetLojista;
    }
  }

  const { data: lojista } = await adminClient
    .from('lojistas')
    .select('id, nome_estabelecimento, slug_subdominio, whatsapp_instance_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (lojista) return lojista;

  if (isSuperAdmin) {
    const { data: firstLojista } = await adminClient
      .from('lojistas')
      .select('id, nome_estabelecimento, slug_subdominio, whatsapp_instance_name')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstLojista) return firstLojista;
  }

  return null;
}

/**
 * 8. toggleClienteAiPauseAction(): Alterna manualmente "Assumir Atendimento / Pausar IA" (24h) ou "Reativar IA"
 * Sem redirecionamentos (redirect). Retorna exclusivamente { success, data, pausedUntil, message, error }.
 */
export async function toggleClienteAiPauseAction(params: {
  clienteId?: string;
  telefone?: string;
  nomeCliente?: string;
  pause: boolean;
  hours?: number;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Não autorizado' };

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : (supabase as any);

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isSuperAdmin =
      profile?.role === 'super_admin' ||
      profile?.role === 'superadmin' ||
      profile?.role === 'admin';

    let targetLojistaId: string | null = null;

    if (params.clienteId) {
      const { data: clienteRow } = await adminClient
        .from('clientes')
        .select('id, lojista_id')
        .eq('id', params.clienteId)
        .maybeSingle();

      if (clienteRow) {
        if (isSuperAdmin) {
          targetLojistaId = clienteRow.lojista_id;
        } else {
          const lojista = await resolveActiveLojistaForClientes(supabase, user.id);
          if (!lojista || lojista.id !== clienteRow.lojista_id) {
            return { success: false, error: 'Sem permissão para alterar este cliente.' };
          }
          targetLojistaId = clienteRow.lojista_id;
        }
      }
    }

    if (!targetLojistaId) {
      const lojista = await resolveActiveLojistaForClientes(supabase, user.id);
      if (!lojista?.id) return { success: false, error: 'Lojista não encontrado' };
      targetLojistaId = lojista.id;
    }

    if (!targetLojistaId) {
      return { success: false, error: 'Lojista não encontrado' };
    }

    const res = await setContactAiPauseState(adminClient, {
      lojistaId: targetLojistaId,
      clienteId: params.clienteId,
      telefone: params.telefone,
      nomeCliente: params.nomeCliente,
      pause: params.pause,
      hours: params.hours ?? 24,
    });

    if (!res.success) {
      return { success: false, error: res.error || 'Erro ao alterar estado da IA.' };
    }

    return {
      success: true,
      pausedUntil: res.pausedUntil,
      data: {
        pausedUntil: res.pausedUntil,
        isPaused: params.pause,
      },
      message: params.pause
        ? 'Atendimento assumido! A IA foi pausada por 24h para este contato.'
        : 'Agente de IA reativado para este contato.',
    };
  } catch (error: any) {
    console.error('[toggleClienteAiPauseAction] Erro:', error);
    return { success: false, error: error?.message || 'Erro inesperado ao alterar pausa da IA.' };
  }
}

/**
 * 8b. toggleAiHandoffAction(clienteId): Alterna o estado de pausa da IA pelo ID do cliente.
 * NUNCA dispara redirect(). Busca o cliente primeiro e valida permissão (permitindo superadmin ou lojista dono).
 */
export async function toggleAiHandoffAction(clienteId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Não autorizado' };

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : (supabase as any);

    // 1. Busca o registro do cliente primeiro
    const { data: cliente, error: clienteErr } = await adminClient
      .from('clientes')
      .select('id, nome, telefone, lojista_id, custom_metadata')
      .eq('id', clienteId)
      .maybeSingle();

    if (clienteErr) {
      return { success: false, error: clienteErr.message };
    }
    if (!cliente) {
      return { success: false, error: 'Cliente não encontrado.' };
    }

    // 2. Validação de permissão (superadmin pode alterar qualquer cliente; lojista comum valida lojista_id)
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isSuperAdmin =
      profile?.role === 'super_admin' ||
      profile?.role === 'superadmin' ||
      profile?.role === 'admin';

    if (!isSuperAdmin) {
      const { data: userLojista } = await adminClient
        .from('lojistas')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const userLojistaId = userLojista?.id || (profile as any)?.lojista_id;
      if (!userLojistaId || userLojistaId !== cliente.lojista_id) {
        return { success: false, error: 'Sem permissão para alterar este cliente.' };
      }
    }

    const meta =
      cliente.custom_metadata && typeof cliente.custom_metadata === 'object'
        ? (cliente.custom_metadata as Record<string, any>)
        : {};

    const rawPausedUntil = meta.ai_paused_until || (cliente as any).ai_paused_until || null;
    const isCurrentlyPaused =
      Boolean(rawPausedUntil) &&
      !isNaN(new Date(rawPausedUntil).getTime()) &&
      new Date(rawPausedUntil).getTime() > Date.now();

    const shouldPause = !isCurrentlyPaused;

    const res = await setContactAiPauseState(adminClient, {
      lojistaId: cliente.lojista_id,
      clienteId: cliente.id,
      telefone: cliente.telefone,
      nomeCliente: cliente.nome,
      pause: shouldPause,
      hours: 24,
    });

    if (!res.success) {
      return { success: false, error: res.error || 'Erro ao alterar estado da IA.' };
    }

    return {
      success: true,
      pausedUntil: res.pausedUntil,
      data: {
        clienteId: cliente.id,
        lojistaId: cliente.lojista_id,
        pausedUntil: res.pausedUntil,
        isPaused: shouldPause,
      },
      message: shouldPause
        ? 'Atendimento assumido! A IA foi pausada por 24h para este contato.'
        : 'Agente de IA reativado para este contato.',
    };
  } catch (error: any) {
    console.error('[toggleAiHandoffAction] Erro:', error);
    return { success: false, error: error?.message || 'Erro ao alternar pausa da IA.' };
  }
}

/**
 * 9. sendManualInboxMessageAction(): Envia uma mensagem manual pelo Inbox/CRM e pausa automaticamente a IA por 24h
 */
export async function sendManualInboxMessageAction(params: {
  clienteId?: string;
  telefone: string;
  nomeCliente?: string;
  mensagem: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Não autorizado' };

    const texto = (params.mensagem || '').trim();
    if (!texto) {
      return { success: false, error: 'Digite uma mensagem para enviar.' };
    }

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : (supabase as any);

    let lojista = await resolveActiveLojistaForClientes(supabase, user.id);

    if (params.clienteId) {
      const { data: clienteRow } = await adminClient
        .from('clientes')
        .select('lojista_id')
        .eq('id', params.clienteId)
        .maybeSingle();

      if (clienteRow?.lojista_id && (!lojista || lojista.id !== clienteRow.lojista_id)) {
        const { data: targetLojista } = await adminClient
          .from('lojistas')
          .select('id, nome_estabelecimento, slug_subdominio, whatsapp_instance_name')
          .eq('id', clienteRow.lojista_id)
          .maybeSingle();
        if (targetLojista) lojista = targetLojista;
      }
    }

    if (!lojista) return { success: false, error: 'Lojista não encontrado' };

    let instanceName = lojista.whatsapp_instance_name?.trim() || '';
    if (!instanceName) {
      const { data: configRobo } = await adminClient
        .from('configuracoes_robo')
        .select('instance_name')
        .eq('lojista_id', lojista.id)
        .maybeSingle();
      instanceName = configRobo?.instance_name?.trim() || '';
    }

    if (!instanceName && lojista.slug_subdominio) {
      instanceName = `flowagenda_${lojista.slug_subdominio.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    if (!instanceName) {
      return { success: false, error: 'Instância do WhatsApp não configurada.' };
    }

    // 1. Pausa automaticamente a IA por 24 horas para este contato (Regra de Handoff Automático)
    const pauseRes = await setContactAiPauseState(adminClient, {
      lojistaId: lojista.id,
      clienteId: params.clienteId,
      telefone: params.telefone,
      nomeCliente: params.nomeCliente,
      pause: true,
      hours: 24,
    });

    // 2. Dispara a mensagem manual pela Evolution API
    const sendRes = await sendWhatsAppMessage({
      instanceName,
      number: params.telefone,
      text: texto,
    });

    if (!sendRes.success) {
      return {
        success: false,
        error: sendRes.error || 'Falha ao enviar mensagem pelo WhatsApp.',
      };
    }

    return {
      success: true,
      pausedUntil: pauseRes.pausedUntil,
      data: {
        pausedUntil: pauseRes.pausedUntil,
        isPaused: true,
      },
      message: 'Mensagem enviada e IA pausada automaticamente por 24h para este contato!',
    };
  } catch (error: any) {
    console.error('[sendManualInboxMessageAction] Erro:', error);
    return { success: false, error: error?.message || 'Erro ao enviar mensagem manual.' };
  }
}


