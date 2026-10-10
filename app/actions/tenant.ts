'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createEvolutionInstance } from '@/lib/evolution';
import { createAsaasCustomer } from '@/lib/asaas';
import { addDomainToVercel } from '@/lib/vercel';

export async function createTenantAction(formData: FormData) {
  try {
    const supabase = await createClient();
    
    // 1. Auth & Role Validation
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Sessão expirada. Faça login novamente.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return { success: false, error: 'Acesso negado: apenas Super Admins podem cadastrar lojistas.' };
    }

    // 2. Extrair dados
    const nome_estabelecimento = formData.get('nome_estabelecimento') as string;
    const slug_subdominio = formData.get('slug_subdominio') as string;
    const dominio_proprio = (formData.get('dominio_proprio') as string) || null;
    const tier = formData.get('tier') as string;
    const tipo_site = formData.get('tipo_site') as string;
    const whatsapp_notificacao = (formData.get('whatsapp_notificacao') as string) || null;

    if (!nome_estabelecimento || !slug_subdominio || !tier || !tipo_site) {
      return { success: false, error: 'Preencha todos os campos obrigatórios.' };
    }

    // 3. Chamadas de API tolerantes a falha (Evolution e Asaas)
    let evolutionToken = 'mock_evolution_token';
    const evolutionInstanceName = `flowagenda_${slug_subdominio.replace(/[^a-zA-Z0-9]/g, '')}`;
    try {
      const evolutionData = await createEvolutionInstance(evolutionInstanceName);
      if (evolutionData?.token) {
        evolutionToken = evolutionData.token;
      }
    } catch (e: any) {
      console.warn('Aviso: Falha na Evolution API:', e.message);
    }

    let asaasCustomerId: string | null = null;
    try {
      const asaasData = await createAsaasCustomer({ 
        name: nome_estabelecimento, 
        externalReference: slug_subdominio 
      });
      if (asaasData?.id) {
        asaasCustomerId = asaasData.id;
      }
    } catch (e: any) {
      console.warn('Aviso: Falha na Asaas API:', e.message);
    }

    // 4. Inserção no Supabase (usando Admin se disponível, ou cliente atual)
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        dbClient = createAdminClient();
      } catch (err) {
        console.warn('Service role key não carregada, usando cliente autenticado.');
      }
    }

    const { data: lojista, error: lojistaError } = await dbClient
      .from('lojistas')
      .insert({
        user_id: user.id,
        nome_estabelecimento,
        slug_subdominio,
        dominio_proprio,
        tier,
        tipo_site,
        whatsapp_notificacao,
        asaas_customer_id: asaasCustomerId,
      })
      .select()
      .single();

    if (lojistaError) {
      return { success: false, error: `Erro no banco ao criar lojista: ${lojistaError.message}` };
    }

    const { error: roboError } = await dbClient
      .from('configuracoes_robo')
      .insert({
        lojista_id: lojista.id,
        instance_name: evolutionInstanceName,
        instance_token: evolutionToken,
      });

    if (roboError) {
      console.warn('Aviso ao configurar robô:', roboError.message);
    }

    // 5. Registro Vercel (se fornecido)
    if (dominio_proprio) {
      try {
        await addDomainToVercel(dominio_proprio);
      } catch (e: any) {
        console.warn(`Erro ao registrar domínio na Vercel: ${e.message}`);
      }
    }

    return { 
      success: true, 
      message: `Lojista "${nome_estabelecimento}" cadastrado com sucesso!`,
      lojista 
    };
  } catch (error: any) {
    console.error('Erro na action createTenantAction:', error);
    return { success: false, error: error.message || 'Erro inesperado no servidor.' };
  }
}
