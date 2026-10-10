'use server';

import { createClient } from '@/utils/supabase/server';
import { 
  fetchInstanceConnectionStatus, 
  restartEvolutionInstance, 
  logoutEvolutionInstance 
} from '@/lib/evolution';
import { revalidatePath } from 'next/cache';

export async function getConfiguracoesData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autorizado');

  const { data: lojista, error: lojistaErr } = await supabase
    .from('lojistas')
    .select('id, nome_estabelecimento, slug_subdominio, dominio_proprio, whatsapp_notificacao, tier, cor_primaria')
    .eq('user_id', user.id)
    .single();

  if (lojistaErr || !lojista) throw new Error('Lojista não encontrado');

  // Buscar ou provisionar configuração do robô
  let { data: configRobo } = await supabase
    .from('configuracoes_robo')
    .select('*')
    .eq('lojista_id', lojista.id)
    .single();

  if (!configRobo) {
    const instanceName = `flowagenda_${lojista.slug_subdominio.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const { data: newConfig, error: insertErr } = await supabase
      .from('configuracoes_robo')
      .insert({
        lojista_id: lojista.id,
        instance_name: instanceName,
        status_conexao: 'desconectado',
      })
      .select()
      .single();

    if (!insertErr && newConfig) {
      configRobo = newConfig;
    }
  }

  let whatsappStatus = null;
  if (configRobo?.instance_name) {
    whatsappStatus = await fetchInstanceConnectionStatus(configRobo.instance_name);

    // Sincroniza o status do banco
    if (whatsappStatus?.state && whatsappStatus.state !== configRobo.status_conexao) {
      await supabase
        .from('configuracoes_robo')
        .update({ status_conexao: whatsappStatus.state, updated_at: new Date().toISOString() })
        .eq('lojista_id', lojista.id);
    }
  }

  return {
    lojista,
    configRobo,
    whatsappStatus,
  };
}

export async function refreshWhatsAppStatusAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autorizado' };

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  const { data: configRobo } = await supabase
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojista.id)
    .single();

  if (!configRobo?.instance_name) {
    return { success: false, error: 'Instância não configurada' };
  }

  const status = await fetchInstanceConnectionStatus(configRobo.instance_name);
  return { success: true, status };
}

export async function updateMensagemBoasVindasAction(mensagem: string) {
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
    .from('configuracoes_robo')
    .update({ 
      mensagem_boas_vindas: mensagem,
      updated_at: new Date().toISOString() 
    })
    .eq('lojista_id', lojista.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/configuracoes');
  return { success: true };
}

export async function updateWhatsAppNotificacaoAction(whatsapp: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autorizado' };

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  // Remove caracteres não numéricos
  const cleanPhone = whatsapp.replace(/\D/g, '');

  const { error } = await supabase
    .from('lojistas')
    .update({ whatsapp_notificacao: cleanPhone })
    .eq('id', lojista.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/configuracoes');
  return { success: true };
}

export async function restartWhatsAppAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autorizado' };

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  const { data: configRobo } = await supabase
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojista.id)
    .single();

  if (!configRobo?.instance_name) {
    return { success: false, error: 'Instância não encontrada' };
  }

  const res = await restartEvolutionInstance(configRobo.instance_name);
  revalidatePath('/dashboard/configuracoes');
  return res;
}

export async function disconnectWhatsAppAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autorizado' };

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  const { data: configRobo } = await supabase
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojista.id)
    .single();

  if (!configRobo?.instance_name) {
    return { success: false, error: 'Instância não encontrada' };
  }

  const res = await logoutEvolutionInstance(configRobo.instance_name);

  if (res.success) {
    await supabase
      .from('configuracoes_robo')
      .update({ status_conexao: 'desconectado', updated_at: new Date().toISOString() })
      .eq('lojista_id', lojista.id);
  }

  revalidatePath('/dashboard/configuracoes');
  return res;
}
