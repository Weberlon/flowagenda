'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { 
  TEMPLATE_PADRAO_CONFIRMACAO, 
  TEMPLATE_PADRAO_LEMBRETE 
} from '@/lib/whatsapp/template-engine';

export interface SalvarTemplatesWhatsAppParams {
  templateConfirmacao: string;
  templateLembrete: string;
  explicitLojistaId?: string;
}

export interface TemplatesWhatsAppResult {
  templateConfirmacao: string;
  templateLembrete: string;
}

/**
 * Resolução determinística do lojista ativo no contexto do usuário logado.
 * Respeita a impersonação segura de 'super_admin' via cookie flow_impersonate_tenant_id.
 */
async function resolveCurrentLojista(
  supabase: any,
  userId: string,
  explicitLojistaId?: string
) {
  // 1. Checa se o usuário é super_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const isSuperAdmin = profile?.role === 'super_admin';

  if (isSuperAdmin) {
    if (explicitLojistaId) {
      const { data: target } = await supabase
        .from('lojistas')
        .select('id, configuracoes')
        .eq('id', explicitLojistaId)
        .single();
      if (target) return target;
    }

    const cookieStore = await cookies();
    const impersonateTenantId = cookieStore.get('flow_impersonate_tenant_id')?.value;
    if (impersonateTenantId) {
      const { data: impersonated } = await supabase
        .from('lojistas')
        .select('id, configuracoes')
        .eq('id', impersonateTenantId)
        .single();
      if (impersonated) return impersonated;
    }
  }

  // 2. Busca o lojista proprietário associado ao usuário
  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id, configuracoes')
    .eq('user_id', userId)
    .single();

  return lojista;
}

/**
 * Salva os templates customizados de WhatsApp no JSONB configuracoes do lojista.
 * Executa mesclagem defensiva (deep merge) em configuracoes.notificacoes.whatsapp.
 */
export async function salvarTemplatesWhatsAppAction(dados: SalvarTemplatesWhatsAppParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Acesso não autorizado. Faça login novamente.' };
    }

    const lojista = await resolveCurrentLojista(supabase, user.id, dados.explicitLojistaId);

    if (!lojista) {
      return { success: false, error: 'Estabelecimento/Lojista não encontrado.' };
    }

    // Deep merge defensivo no campo configuracoes (JSONB)
    const configuracoesAtuais = 
      lojista.configuracoes && typeof lojista.configuracoes === 'object'
        ? lojista.configuracoes
        : {};

    const notificacoesAtuais = 
      configuracoesAtuais.notificacoes && typeof configuracoesAtuais.notificacoes === 'object'
        ? configuracoesAtuais.notificacoes
        : {};

    const whatsappAtual = 
      notificacoesAtuais.whatsapp && typeof notificacoesAtuais.whatsapp === 'object'
        ? notificacoesAtuais.whatsapp
        : {};

    const configuracoesAtualizadas = {
      ...configuracoesAtuais,
      notificacoes: {
        ...notificacoesAtuais,
        whatsapp: {
          ...whatsappAtual,
          template_confirmacao: dados.templateConfirmacao?.trim() || TEMPLATE_PADRAO_CONFIRMACAO,
          template_lembrete: dados.templateLembrete?.trim() || TEMPLATE_PADRAO_LEMBRETE,
          updated_at: new Date().toISOString(),
        },
      },
    };

    const { error: updateError } = await supabase
      .from('lojistas')
      .update({
        configuracoes: configuracoesAtualizadas,
      })
      .eq('id', lojista.id);

    if (updateError) {
      console.error('[salvarTemplatesWhatsAppAction] Erro no update do Supabase:', updateError);
      return { success: false, error: `Erro ao salvar configurações: ${updateError.message}` };
    }

    revalidatePath('/dashboard/configuracoes');

    return { 
      success: true, 
      message: 'Templates de mensagens do WhatsApp salvos com sucesso!' 
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno ao salvar templates';
    console.error('[salvarTemplatesWhatsAppAction] Exceção:', err);
    return { success: false, error: msg };
  }
}

/**
 * Obtém os templates de WhatsApp configurados para o lojista ativo.
 * Retorna os templates padrão como fallback caso nenhum tenha sido gravado.
 */
export async function obterTemplatesWhatsAppAction(explicitLojistaId?: string): Promise<{
  success: boolean;
  templates?: TemplatesWhatsAppResult;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autorizado' };
    }

    const lojista = await resolveCurrentLojista(supabase, user.id, explicitLojistaId);

    if (!lojista) {
      return { success: false, error: 'Lojista não encontrado' };
    }

    const config = lojista.configuracoes as any;
    const whatsappConfig = config?.notificacoes?.whatsapp;

    return {
      success: true,
      templates: {
        templateConfirmacao: whatsappConfig?.template_confirmacao || TEMPLATE_PADRAO_CONFIRMACAO,
        templateLembrete: whatsappConfig?.template_lembrete || TEMPLATE_PADRAO_LEMBRETE,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao buscar templates';
    return { success: false, error: msg };
  }
}
