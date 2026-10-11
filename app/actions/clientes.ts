'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

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
  created_at: string;
  updated_at?: string | null;
}

// 1. getClientes(): Busca todos os clientes com isolamento seguro RLS
export async function getClientes() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autorizado');

  const { data: lojista, error: lojistaErr } = await supabase
    .from('lojistas')
    .select('id, nome_estabelecimento, slug_subdominio')
    .eq('user_id', user.id)
    .single();

  if (lojistaErr || !lojista) throw new Error('Lojista não encontrado');

  const { data: clientes, error: clientesErr } = await supabase
    .from('clientes')
    .select('*')
    .eq('lojista_id', lojista.id)
    .order('updated_at', { ascending: false, nullsFirst: false });

  if (clientesErr) {
    // Fallback caso updated_at ainda não exista
    const retry = await supabase
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
  const clientes: ClienteCRM[] = rawClientes.map((c) => ({
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
    created_at: c.created_at,
    updated_at: c.updated_at || c.created_at,
  }));

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

// 4. updateClienteNotas(): Atualiza observações internas e tags
export async function updateClienteNotas(clienteId: string, observacoes: string, tags: string[]) {
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
    .update({
      observacoes: observacoes || '',
      tags: Array.isArray(tags) ? tags : [],
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

// Manter compatibilidade com getClientesData
export const getClientesData = getClientes;
