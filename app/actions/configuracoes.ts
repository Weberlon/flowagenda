'use server';

import { createClient } from '@/utils/supabase/server';
import { 
  fetchInstanceConnectionStatus, 
  restartEvolutionInstance, 
  logoutEvolutionInstance 
} from '@/lib/evolution';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Resolução determinística do lojista ativo.
 * Suporta impersonação segura para perfis 'super_admin' sem conceder privilégios a lojistas comuns.
 */
async function resolveCurrentLojista(
  supabase: any,
  userId: string,
  selectFields = 'id, nome_estabelecimento, slug_subdominio, dominio_proprio, whatsapp_notificacao, tier, cor_primaria, google_review_url'
) {
  // 1. Checa se o usuário é super_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'super_admin') {
    const cookieStore = await cookies();
    const impersonateTenantId = cookieStore.get('flow_impersonate_tenant_id')?.value;
    if (impersonateTenantId) {
      const { data: lojista } = await supabase
        .from('lojistas')
        .select(selectFields)
        .eq('id', impersonateTenantId)
        .single();
      if (lojista) return lojista;
    }
  }

  // 2. Busca padrão para o próprio usuário lojista
  const { data: lojista } = await supabase
    .from('lojistas')
    .select(selectFields)
    .eq('user_id', userId)
    .single();

  return lojista;
}

export async function getConfiguracoesData(explicitLojistaId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autorizado');

  let lojista: any = null;

  if (explicitLojistaId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'super_admin') {
      const { data: targetLojista } = await supabase
        .from('lojistas')
        .select('id, nome_estabelecimento, slug_subdominio, dominio_proprio, whatsapp_notificacao, tier, cor_primaria, google_review_url')
        .eq('id', explicitLojistaId)
        .single();
      lojista = targetLojista;
    }
  }

  if (!lojista) {
    lojista = await resolveCurrentLojista(supabase, user.id);
  }

  if (!lojista) throw new Error('Lojista não encontrado');

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

export async function refreshWhatsAppStatusAction(explicitLojistaId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autorizado' };

  let lojista: any = null;
  if (explicitLojistaId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'super_admin') {
      const { data: targetLojista } = await supabase
        .from('lojistas')
        .select('id')
        .eq('id', explicitLojistaId)
        .single();
      lojista = targetLojista;
    }
  }

  if (!lojista) {
    lojista = await resolveCurrentLojista(supabase, user.id, 'id');
  }

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

export async function updateMensagemBoasVindasAction(mensagem: string, explicitLojistaId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autorizado' };

  let lojista: any = null;
  if (explicitLojistaId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'super_admin') {
      const { data: targetLojista } = await supabase
        .from('lojistas')
        .select('id')
        .eq('id', explicitLojistaId)
        .single();
      lojista = targetLojista;
    }
  }

  if (!lojista) {
    lojista = await resolveCurrentLojista(supabase, user.id, 'id');
  }

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

export async function updateWhatsAppNotificacaoAction(whatsapp: string, explicitLojistaId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autorizado' };

  let lojista: any = null;
  if (explicitLojistaId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'super_admin') {
      const { data: targetLojista } = await supabase
        .from('lojistas')
        .select('id')
        .eq('id', explicitLojistaId)
        .single();
      lojista = targetLojista;
    }
  }

  if (!lojista) {
    lojista = await resolveCurrentLojista(supabase, user.id, 'id');
  }

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

export async function restartWhatsAppAction(explicitLojistaId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autorizado' };

  let lojista: any = null;
  if (explicitLojistaId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'super_admin') {
      const { data: targetLojista } = await supabase
        .from('lojistas')
        .select('id')
        .eq('id', explicitLojistaId)
        .single();
      lojista = targetLojista;
    }
  }

  if (!lojista) {
    lojista = await resolveCurrentLojista(supabase, user.id, 'id');
  }

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

export async function disconnectWhatsAppAction(explicitLojistaId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autorizado' };

  let lojista: any = null;
  if (explicitLojistaId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'super_admin') {
      const { data: targetLojista } = await supabase
        .from('lojistas')
        .select('id')
        .eq('id', explicitLojistaId)
        .single();
      lojista = targetLojista;
    }
  }

  if (!lojista) {
    lojista = await resolveCurrentLojista(supabase, user.id, 'id');
  }

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

export async function updateGoogleReviewUrlAction(reviewUrl: string, explicitLojistaId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Não autorizado' };

  let lojista: any = null;
  if (explicitLojistaId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'super_admin') {
      const { data: targetLojista } = await supabase
        .from('lojistas')
        .select('id')
        .eq('id', explicitLojistaId)
        .single();
      lojista = targetLojista;
    }
  }

  if (!lojista) {
    lojista = await resolveCurrentLojista(supabase, user.id, 'id');
  }

  if (!lojista) return { success: false, error: 'Lojista não encontrado' };

  const cleanUrl = reviewUrl.trim();

  const { error } = await supabase
    .from('lojistas')
    .update({ google_review_url: cleanUrl || null })
    .eq('id', lojista.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/configuracoes');
  return { success: true };
}
