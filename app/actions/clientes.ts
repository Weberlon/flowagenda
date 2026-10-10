'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getClientesData(searchQuery?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autorizado');

  const { data: lojista, error: lojistaErr } = await supabase
    .from('lojistas')
    .select('id, nome_estabelecimento, slug_subdominio')
    .eq('user_id', user.id)
    .single();

  if (lojistaErr || !lojista) throw new Error('Lojista não encontrado');

  let query = supabase
    .from('clientes')
    .select('*')
    .eq('lojista_id', lojista.id)
    .order('ultimo_agendamento', { ascending: false, nullsFirst: false });

  if (searchQuery && searchQuery.trim() !== '') {
    const cleanSearch = searchQuery.trim();
    query = query.or(`nome.ilike.%${cleanSearch}%,telefone.ilike.%${cleanSearch}%`);
  }

  const { data: clientes, error: clientesErr } = await query;

  if (clientesErr) {
    throw new Error(`Erro ao buscar clientes: ${clientesErr.message}`);
  }

  // Cálculo de KPIs
  const totalClientes = clientes?.length || 0;
  const clientesRecorrentes = clientes?.filter(c => c.total_agendamentos > 1).length || 0;
  const totalAgendamentosGeral = clientes?.reduce((acc, c) => acc + (c.total_agendamentos || 0), 0) || 0;

  return {
    lojista,
    clientes: clientes || [],
    kpis: {
      totalClientes,
      clientesRecorrentes,
      totalAgendamentosGeral,
    },
  };
}

export async function addClienteAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Não autorizado' };

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  const nome = (formData.get('nome') as string)?.trim();
  const rawTelefone = (formData.get('telefone') as string)?.trim();

  if (!nome || nome.length < 2) {
    return { success: false, error: 'O nome deve ter pelo menos 2 caracteres.' };
  }

  const telefone = rawTelefone.replace(/\D/g, '');
  if (!telefone || telefone.length < 10 || telefone.length > 13) {
    return { success: false, error: 'Informe um número de telefone/WhatsApp válido com DDD.' };
  }

  const { error } = await supabase
    .from('clientes')
    .upsert({
      lojista_id: lojista.id,
      nome,
      telefone,
      total_agendamentos: 1,
      ultimo_agendamento: new Date().toISOString(),
    }, {
      onConflict: 'lojista_id,telefone',
    });

  if (error) {
    return { success: false, error: `Erro ao cadastrar cliente: ${error.message}` };
  }

  revalidatePath('/dashboard/clientes');
  return { success: true };
}

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
