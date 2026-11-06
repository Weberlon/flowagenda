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
  selectFields = 'id, nome_estabelecimento, slug_subdominio, dominio_proprio, whatsapp_notificacao, tier, cor_primaria, google_review_url, configuracoes, business_niche, use_ai_agent, knowledge_base, ai_credits, is_founder, modo_avaliacao, ticket_medio_padrao'
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
      const { data: lojista, error } = await supabase
        .from('lojistas')
        .select(selectFields)
        .eq('id', impersonateTenantId)
        .single();
      if (lojista) return lojista;
      if (error) {
        const { data: fallback } = await supabase
          .from('lojistas')
          .select('*')
          .eq('id', impersonateTenantId)
          .single();
        if (fallback) return fallback;
      }
    }
  }

  // 2. Busca padrão para o próprio usuário lojista
  const { data: lojista, error } = await supabase
    .from('lojistas')
    .select(selectFields)
    .eq('user_id', userId)
    .single();

  if (error && !lojista) {
    const { data: fallback } = await supabase
      .from('lojistas')
      .select('*')
      .eq('user_id', userId)
      .single();
    return fallback;
  }

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
        .select('*')
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
  try {
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
          .select('id, slug_subdominio')
          .eq('id', explicitLojistaId)
          .single();
        lojista = targetLojista;
      }
    }

    if (!lojista) {
      lojista = await resolveCurrentLojista(supabase, user.id, 'id, slug_subdominio');
    }

    if (!lojista) return { success: false, error: 'Lojista não encontrado' };

    let { data: configRobo } = await supabase
      .from('configuracoes_robo')
      .select('instance_name')
      .eq('lojista_id', lojista.id)
      .maybeSingle();

    if (!configRobo?.instance_name) {
      const cleanSlug = (lojista.slug_subdominio || 'default').replace(/[^a-zA-Z0-9]/g, '_');
      const autoInstanceName = `flowagenda_${cleanSlug}`;
      await supabase.from('configuracoes_robo').upsert({
        lojista_id: lojista.id,
        instance_name: autoInstanceName,
        status_conexao: 'desconectado',
      }, { onConflict: 'lojista_id' });
      configRobo = { instance_name: autoInstanceName };
    }

    const status = await fetchInstanceConnectionStatus(configRobo.instance_name);
    return { success: true, status };
  } catch (error: any) {
    console.error('refreshWhatsAppStatusAction error:', error);
    return { success: false, error: error?.message || 'Falha ao sincronizar status do WhatsApp.' };
  }
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
  try {
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
          .select('id, slug_subdominio')
          .eq('id', explicitLojistaId)
          .single();
        lojista = targetLojista;
      }
    }

    if (!lojista) {
      lojista = await resolveCurrentLojista(supabase, user.id, 'id, slug_subdominio');
    }

    if (!lojista) return { success: false, error: 'Lojista não encontrado' };

    let { data: configRobo } = await supabase
      .from('configuracoes_robo')
      .select('instance_name')
      .eq('lojista_id', lojista.id)
      .maybeSingle();

    if (!configRobo?.instance_name) {
      const cleanSlug = (lojista.slug_subdominio || 'default').replace(/[^a-zA-Z0-9]/g, '_');
      const autoInstanceName = `flowagenda_${cleanSlug}`;
      await supabase.from('configuracoes_robo').upsert({
        lojista_id: lojista.id,
        instance_name: autoInstanceName,
        status_conexao: 'desconectado',
      }, { onConflict: 'lojista_id' });
      configRobo = { instance_name: autoInstanceName };
    }

    const res = await restartEvolutionInstance(configRobo.instance_name);
    revalidatePath('/dashboard/configuracoes');
    return res;
  } catch (error: any) {
    console.error('restartWhatsAppAction error:', error);
    return { success: false, error: error?.message || 'Falha ao reiniciar robô WhatsApp.' };
  }
}

export async function disconnectWhatsAppAction(explicitLojistaId?: string) {
  try {
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
          .select('id, slug_subdominio')
          .eq('id', explicitLojistaId)
          .single();
        lojista = targetLojista;
      }
    }

    if (!lojista) {
      lojista = await resolveCurrentLojista(supabase, user.id, 'id, slug_subdominio');
    }

    if (!lojista) return { success: false, error: 'Lojista não encontrado' };

    let { data: configRobo } = await supabase
      .from('configuracoes_robo')
      .select('instance_name')
      .eq('lojista_id', lojista.id)
      .maybeSingle();

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
  } catch (error: any) {
    console.error('disconnectWhatsAppAction error:', error);
    return { success: false, error: error?.message || 'Falha ao desconectar robô WhatsApp.' };
  }
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

export interface SaveAiOnboardingSetupParams {
  explicitLojistaId?: string;
  businessNiche: string;
  toneOfVoice: string;
  horarioFuncionamento: string;
  toleranciaAtraso: string;
  regrasCancelamento: string;
  formasPagamento: string;
  exigeSinal: boolean;
  detalhesSinal?: string;
  instrucoesAdicionais?: string;
  useAiAgent: boolean;
  customKnowledgeBase?: string;
}

export async function saveAiOnboardingSetupAction(params: SaveAiOnboardingSetupParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Não autorizado. Faça login novamente.' };

    let lojista: any = null;
    if (params.explicitLojistaId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'super_admin') {
        const { data: targetLojista } = await supabase
          .from('lojistas')
          .select('id, nome_estabelecimento, configuracoes')
          .eq('id', params.explicitLojistaId)
          .single();
        lojista = targetLojista;
      }
    }

    if (!lojista) {
      lojista = await resolveCurrentLojista(supabase, user.id, 'id, nome_estabelecimento, configuracoes');
    }

    if (!lojista) {
      return { success: false, error: 'Estabelecimento não encontrado.' };
    }

    const businessNiche = (params.businessNiche || 'Barbearia').trim();
    const toneOfVoice = (params.toneOfVoice || 'Amigável e descontraído').trim();
    const horario = (params.horarioFuncionamento || 'Segunda a Sábado, das 09h às 19h').trim();
    const tolerancia = (params.toleranciaAtraso || '15 minutos de tolerância').trim();
    const cancelamento = (params.regrasCancelamento || 'Cancelamentos ou reagendamentos com no mínimo 2 horas de antecedência.').trim();
    const pagamento = (params.formasPagamento || 'Pix, Cartão de Crédito/Débito e Dinheiro').trim();
    const sinalTexto = params.exigeSinal
      ? `Sim (${(params.detalhesSinal || 'Sinal antecipado via Pix na confirmação').trim()})`
      : 'Não exige sinal antecipado (pagamento no local)';
    const instrucoes = (params.instrucoesAdicionais || 'Nenhuma instrução complementar especificada.').trim();

    const compiledKnowledgeBase = params.customKnowledgeBase?.trim()
      ? params.customKnowledgeBase.trim()
      : [
          `# Base de Conhecimento Oficial — ${lojista.nome_estabelecimento}`,
          ``,
          `## 1. Perfil e Posicionamento`,
          `- **Estabelecimento:** ${lojista.nome_estabelecimento}`,
          `- **Nicho de Atuação:** ${businessNiche}`,
          `- **Tom de Voz do Agente:** ${toneOfVoice}`,
          ``,
          `## 2. Regras de Atendimento e Agenda`,
          `- **Horário de Funcionamento:** ${horario}`,
          `- **Tolerância de Atraso:** ${tolerancia}`,
          `- **Política de Cancelamento e Reagendamento:** ${cancelamento}`,
          ``,
          `## 3. Pagamentos e Política de Sinal`,
          `- **Formas de Pagamento Aceitas:** ${pagamento}`,
          `- **Exigência de Sinal / Reserva:** ${sinalTexto}`,
          ``,
          `## 4. Instruções Adicionais e Perguntas Frequentes (FAQ)`,
          `${instrucoes}`,
          ``,
          `## 5. Diretrizes de Segurança e Conformidade (LGPD)`,
          `- Atuar exclusivamente na orientação de horários, serviços, preços e dúvidas operacionais do estabelecimento.`,
          `- Nunca solicitar, processar ou armazenar prontuários médicos, anamneses ou dados clínicos sensíveis.`,
        ].join('\n');

    const configAtual =
      lojista.configuracoes && typeof lojista.configuracoes === 'object'
        ? lojista.configuracoes
        : {};

    const novasConfiguracoes = {
      ...configAtual,
      ai_onboarding: {
        business_niche: businessNiche,
        tone_of_voice: toneOfVoice,
        horario_funcionamento: horario,
        tolerancia_atraso: tolerancia,
        regras_cancelamento: cancelamento,
        formas_pagamento: pagamento,
        exige_sinal: Boolean(params.exigeSinal),
        detalhes_sinal: params.detalhesSinal || '',
        instrucoes_adicionais: params.instrucoesAdicionais || '',
        updated_at: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabase
      .from('lojistas')
      .update({
        business_niche: businessNiche,
        use_ai_agent: Boolean(params.useAiAgent),
        knowledge_base: compiledKnowledgeBase,
        configuracoes: novasConfiguracoes,
      })
      .eq('id', lojista.id);

    if (updateError) {
      return { success: false, error: `Erro ao gravar configurações de IA: ${updateError.message}` };
    }

    revalidatePath('/dashboard/configuracoes');
    revalidatePath('/dashboard');

    return {
      success: true,
      knowledgeBase: compiledKnowledgeBase,
      message: params.useAiAgent
        ? 'Agente de IA ativado e Base de Conhecimento (RAG) gravada com sucesso!'
        : 'Base de Conhecimento salva! O Agente de IA permanece desativado (modo bot numérico ativo).',
    };
  } catch (error: any) {
    console.error('[saveAiOnboardingSetupAction] Erro:', error);
    return {
      success: false,
      error: error?.message || 'Falha inesperada ao salvar configuração do Agente de IA.',
    };
  }
}
