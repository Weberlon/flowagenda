'use server';

import { createClient } from '@/utils/supabase/server';
import { fetchInstanceConnectionStatus } from '@/lib/evolution';

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id, nome_estabelecimento')
    .eq('user_id', user.id)
    .single();

  if (!lojista) throw new Error('Tenant not found');

  // Fetch Agenda (Today/Upcoming)
  const { data: agendamentos } = await supabase
    .from('agendamentos')
    .select(`
      id, data_hora_inicio, data_hora_fim, status,
      servico_id,
      cliente:clientes(nome, telefone),
      servico:servicos(nome_servico, duracao_minutos)
    `)
    .eq('lojista_id', lojista.id)
    .gte('data_hora_inicio', new Date().toISOString().split('T')[0])
    .order('data_hora_inicio', { ascending: true });

  // Fetch WhatsApp Config
  const { data: configRobo } = await supabase
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojista.id)
    .single();

  let whatsappStatus = null;
  if (configRobo?.instance_name) {
    whatsappStatus = await fetchInstanceConnectionStatus(configRobo.instance_name);
  }

  return { agendamentos, whatsappStatus, lojistaId: lojista.id };
}

export async function getServicosData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) throw new Error('Tenant not found');

  const { data: servicos } = await supabase
    .from('servicos')
    .select('*')
    .eq('lojista_id', lojista.id)
    .order('created_at', { ascending: false });

  return { servicos, lojistaId: lojista.id };
}

export async function addServicoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: lojista } = await supabase.from('lojistas').select('id').eq('user_id', user.id).single();
  if (!lojista) throw new Error('Tenant not found');

  const nome_servico = formData.get('nome_servico') as string;
  const duracao_minutos = parseInt(formData.get('duracao_minutos') as string);
  const preco = parseFloat(formData.get('preco') as string);
  const ativo = formData.get('ativo') === 'on';

  const { error } = await supabase.from('servicos').insert({
    lojista_id: lojista.id,
    nome_servico,
    duracao_minutos,
    preco,
    ativo,
  });

  if (error) throw new Error(error.message);
  return { success: true };
}
