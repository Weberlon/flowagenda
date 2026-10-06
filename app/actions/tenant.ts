'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createEvolutionInstance } from '@/lib/evolution';
import { createAsaasCustomer } from '@/lib/asaas';
import { addDomainToVercel } from '@/lib/vercel';

export async function createTenantAction(formData: FormData) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
  
  // 1. Auth & Role Validation (via sessão do usuário atual)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Não autenticado.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    throw new Error('Acesso negado: apenas Super Admins.');
  }

  // 2. Extrair e validar dados do formulário
  const nome_estabelecimento = formData.get('nome_estabelecimento') as string;
  const slug_subdominio = formData.get('slug_subdominio') as string;
  const dominio_proprio = (formData.get('dominio_proprio') as string) || null;
  const tier = formData.get('tier') as string;
  const tipo_site = formData.get('tipo_site') as string;
  const whatsapp_notificacao = (formData.get('whatsapp_notificacao') as string) || null;

  if (!nome_estabelecimento || !slug_subdominio || !tier || !tipo_site) {
    throw new Error('Campos obrigatórios não preenchidos.');
  }

  // 3. Chamadas de API (Evolution e Asaas)
  const evolutionInstanceName = `flowagenda_${slug_subdominio.replace(/[^a-zA-Z0-9]/g, '')}`;
  const evolutionData = await createEvolutionInstance(evolutionInstanceName);
  
  const asaasData = await createAsaasCustomer({ 
    name: nome_estabelecimento, 
    externalReference: slug_subdominio 
  });

  // 4. Inserir no Supabase usando o ADMIN CLIENT (bypass RLS)
  // Para MVP: vinculando o lojista ao ID do próprio admin logado temporariamente
  // Num cenário ideal, faríamos um invite via admin auth e associaríamos ao novo user.id do lojista real.
  const { data: lojista, error: lojistaError } = await supabaseAdmin
    .from('lojistas')
    .insert({
      user_id: user.id, // TODO: Substituir pelo user_id real do novo lojista no futuro
      nome_estabelecimento,
      slug_subdominio,
      dominio_proprio,
      tier,
      tipo_site,
      whatsapp_notificacao,
      asaas_customer_id: asaasData.id,
    })
    .select()
    .single();

  if (lojistaError) {
    throw new Error(`Erro ao criar Lojista: ${lojistaError.message}`);
  }

  const { error: roboError } = await supabaseAdmin
    .from('configuracoes_robo')
    .insert({
      lojista_id: lojista.id,
      instance_name: evolutionInstanceName,
      instance_token: evolutionData.token,
    });

  if (roboError) {
    throw new Error(`Lojista criado, mas erro ao configurar Robô: ${roboError.message}`);
  }

  // 5. Integração Vercel (Se possuir domínio próprio)
  if (dominio_proprio) {
    try {
      await addDomainToVercel(dominio_proprio);
    } catch (e: any) {
      console.warn(`Lojista criado, mas erro ao registrar domínio na Vercel: ${e.message}`);
    }
  }

  return { success: true, message: 'Lojista criado com sucesso!', lojista };
}
