'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createEvolutionInstance } from '@/lib/evolution';
import { addDomainToVercel } from '@/lib/vercel';
import {
  AsaasCycle,
  registerAsaasCustomerForTenant,
  processAsaasTenantSubscription,
} from '@/lib/asaas-subscription';

export async function createTenantAction(formData: FormData) {
  try {
    const supabase = await createClient();

    // 1. Auth & Role Validation
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Sessão expirada. Faça login novamente.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return {
        success: false,
        error: 'Acesso negado: apenas Super Admins podem cadastrar lojistas.',
      };
    }

    // 2. Extrair dados do formulário
    const nome_estabelecimento = (formData.get('nome_estabelecimento') as string)?.trim();
    const slug_subdominio = (formData.get('slug_subdominio') as string)?.trim().toLowerCase();
    const dominio_proprio = (formData.get('dominio_proprio') as string)?.trim() || null;
    const tier = formData.get('tier') as string;
    const tipo_site = formData.get('tipo_site') as string;
    const whatsapp_notificacao =
      (formData.get('whatsapp_notificacao') as string)?.replace(/\D/g, '') || null;
    const google_review_url = (formData.get('google_review_url') as string)?.trim() || null;
    const business_niche = (formData.get('business_niche') as string) || 'barbearia';

    const ticket_medio_raw = parseFloat(
      String(formData.get('ticket_medio_padrao') || '65').replace(',', '.')
    );
    const ticket_medio_padrao =
      Number.isFinite(ticket_medio_raw) && ticket_medio_raw > 0 ? ticket_medio_raw : 65;

    const cpf_cnpj_raw = (formData.get('cpf_cnpj') as string) || '';
    const cpf_cnpj_limpo = cpf_cnpj_raw.replace(/\D/g, '');

    const asaas_initial_action =
      ((formData.get('asaas_initial_action') as string) || 'NONE').toUpperCase();
    const incluir_setup =
      formData.get('incluir_setup') === 'on' || formData.get('incluir_setup') === 'true';

    const use_ai_agent =
      formData.get('use_ai_agent') === 'on' || formData.get('use_ai_agent') === 'true';
    const is_founder =
      formData.get('is_founder') === 'on' || formData.get('is_founder') === 'true';
    const ai_credits_raw = Number(formData.get('ai_credits'));
    const ai_credits =
      Number.isFinite(ai_credits_raw) && ai_credits_raw >= 0 ? ai_credits_raw : 200;

    if (!nome_estabelecimento || !slug_subdominio || !tier || !tipo_site) {
      return { success: false, error: 'Preencha todos os campos obrigatórios.' };
    }

    const isSubscriptionRequested = ['MONTHLY', 'SEMIANNUALLY', 'YEARLY'].includes(
      asaas_initial_action
    );
    if (isSubscriptionRequested && cpf_cnpj_limpo.length < 11) {
      return {
        success: false,
        error:
          'Informe um CPF ou CNPJ válido para gerar a assinatura inicial no Asaas (ou selecione "Apenas cadastrar cliente").',
      };
    }

    // 3. Provisionamento Evolution API (tolerante a falha)
    let evolutionToken = 'mock_evolution_token';
    const evolutionInstanceName = `flowagenda_${slug_subdominio.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      const evolutionData = await createEvolutionInstance(evolutionInstanceName);
      if (evolutionData?.token) {
        evolutionToken = evolutionData.token;
      }
    } catch (e: any) {
      console.warn('Aviso: Falha na Evolution API:', e.message);
    }

    // 4. Inserção no Supabase (usando Admin se disponível, ou cliente autenticado)
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        dbClient = createAdminClient();
      } catch {
        console.warn('Service role key não carregada, usando cliente autenticado.');
      }
    }

    const initialPaymentStatus: 'ativo' | 'pendente' =
      !isSubscriptionRequested && is_founder ? 'ativo' : 'pendente';

    const insertData: Record<string, any> = {
      user_id: user.id,
      nome_estabelecimento,
      slug_subdominio,
      dominio_proprio,
      tier,
      tipo_site,
      whatsapp_notificacao,
      whatsapp_instance_name: evolutionInstanceName,
      google_review_url,
      asaas_customer_id: null,
      status_pagamento: initialPaymentStatus,
      business_niche,
      ticket_medio_padrao,
      use_ai_agent,
      is_founder: !isSubscriptionRequested && is_founder,
      ai_credits,
      configuracoes: {
        mostrar_badge_plataforma: tier === 'tier_1',
        cor_primaria: '#0F172A',
        cor_secundaria: '#38BDF8',
        favicon_url: null,
      },
    };

    let { data: lojista, error: lojistaError } = await dbClient
      .from('lojistas')
      .insert(insertData)
      .select()
      .single();

    // Fallbacks caso alguma coluna opcional ainda não exista na tabela lojistas
    if (lojistaError && lojistaError.message?.includes('ticket_medio_padrao')) {
      delete insertData.ticket_medio_padrao;
      const retry = await dbClient.from('lojistas').insert(insertData).select().single();
      lojista = retry.data;
      lojistaError = retry.error;
    }

    if (lojistaError && lojistaError.message?.includes('configuracoes')) {
      delete insertData.configuracoes;
      const retry = await dbClient.from('lojistas').insert(insertData).select().single();
      lojista = retry.data;
      lojistaError = retry.error;
    }

    if (lojistaError || !lojista) {
      return {
        success: false,
        error: `Erro no banco ao criar lojista: ${lojistaError?.message || 'Falha desconhecida'}`,
      };
    }

    // Garante sobrescrita explícita de status_pagamento pós-insert contra qualquer default/trigger 'ativo' do banco
    await dbClient
      .from('lojistas')
      .update({
        status_pagamento: initialPaymentStatus,
        is_founder: !isSubscriptionRequested && is_founder,
      })
      .eq('id', lojista.id);
    lojista.status_pagamento = initialPaymentStatus;
    lojista.is_founder = !isSubscriptionRequested && is_founder;

    const { error: roboError } = await dbClient.from('configuracoes_robo').insert({
      lojista_id: lojista.id,
      instance_name: evolutionInstanceName,
      instance_token: evolutionToken,
    });

    if (roboError) {
      console.warn('Aviso ao configurar robô:', roboError.message);
    }

    // 5. Registro Vercel (se domínio próprio foi fornecido)
    if (dominio_proprio) {
      try {
        await addDomainToVercel(dominio_proprio);
      } catch (e: any) {
        console.warn(`Erro ao registrar domínio na Vercel: ${e.message}`);
      }
    }

    // 6. Sincronização Automática com Asaas pós-criação no Supabase
    let invoiceUrl: string | null = null;
    let setupInvoiceUrl: string | null = null;
    let asaasWarning: string | null = null;

    if (isSubscriptionRequested && cpf_cnpj_limpo.length >= 11) {
      const subResult = await processAsaasTenantSubscription({
        lojistaId: lojista.id,
        cycle: asaas_initial_action as AsaasCycle,
        cpfCnpj: cpf_cnpj_limpo,
        incluirSetup: asaas_initial_action !== 'YEARLY' ? incluir_setup : false,
      });

      if (subResult.ok) {
        invoiceUrl = subResult.invoiceUrl || null;
        setupInvoiceUrl = subResult.setupInvoiceUrl || null;
      } else {
        asaasWarning = `Lojista criado no Supabase, mas houve um aviso no Asaas: ${subResult.error}`;
      }
    } else if (cpf_cnpj_limpo.length >= 11) {
      // Apenas cadastrar cliente no Asaas (sem cobrança agora)
      const custResult = await registerAsaasCustomerForTenant({
        lojistaId: lojista.id,
        name: nome_estabelecimento,
        mobilePhone: whatsapp_notificacao,
        cpfCnpj: cpf_cnpj_limpo,
      });

      if (!custResult.ok) {
        asaasWarning = `Lojista criado no Supabase, mas não foi possível vincular cliente no Asaas: ${custResult.error}`;
      }
    }

    revalidatePath('/superadmin');

    return {
      success: true,
      message: asaasWarning
        ? asaasWarning
        : invoiceUrl
        ? `Lojista "${nome_estabelecimento}" e assinatura Asaas criados com sucesso!`
        : cpf_cnpj_limpo.length >= 11
        ? `Lojista "${nome_estabelecimento}" cadastrado e vinculado no Asaas com sucesso!`
        : `Lojista "${nome_estabelecimento}" cadastrado com sucesso!`,
      lojista,
      invoiceUrl,
      setupInvoiceUrl,
      asaasWarning,
    };
  } catch (error: any) {
    console.error('Erro na action createTenantAction:', error);
    return {
      success: false,
      error: error.message || 'Erro inesperado no servidor.',
    };
  }
}
