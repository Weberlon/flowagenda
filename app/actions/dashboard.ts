'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { fetchInstanceConnectionStatus } from '@/lib/evolution';
import { cookies } from 'next/headers';

const DURACOES_PERMITIDAS = [15, 30, 45, 60] as const;

async function syncKnowledgeBaseServicos(dbClient: any, lojistaId: string) {
  try {
    const { data: lojista } = await dbClient
      .from('lojistas')
      .select('id, knowledge_base')
      .eq('id', lojistaId)
      .maybeSingle();

    if (!lojista?.knowledge_base) return;

    const { data: servicosAtivos } = await dbClient
      .from('servicos')
      .select('nome_servico, preco, duracao_minutos')
      .eq('lojista_id', lojistaId)
      .eq('ativo', true)
      .order('nome_servico', { ascending: true });

    const catalogoTexto =
      servicosAtivos && servicosAtivos.length > 0
        ? servicosAtivos
            .map(
              (s: any) =>
                `- **${s.nome_servico}**: R$ ${Number(s.preco || 0)
                  .toFixed(2)
                  .replace('.', ',')} (${s.duracao_minutos} min)`
            )
            .join('\n')
        : '- Consultar tabela de serviços e valores no link de agendamento.';

    const kbAtual: string = lojista.knowledge_base;
    let kbNova = kbAtual;

    if (/## 2\. Serviços e Preços/i.test(kbAtual)) {
      kbNova = kbAtual.replace(
        /(## 2\. Serviços e Preços\r?\n)([\s\S]*?)(?=\r?\n## \d+\.|$)/i,
        `$1${catalogoTexto}\n`
      );
    } else if (/## Catálogo Atualizado de Serviços e Preços/i.test(kbAtual)) {
      kbNova = kbAtual.replace(
        /(## Catálogo Atualizado de Serviços e Preços\r?\n)([\s\S]*?)(?=\r?\n## |$)/i,
        `$1${catalogoTexto}\n`
      );
    } else {
      kbNova = `${kbAtual.trim()}\n\n## Catálogo Atualizado de Serviços e Preços\n${catalogoTexto}`;
    }

    if (kbNova !== kbAtual) {
      await dbClient
        .from('lojistas')
        .update({ knowledge_base: kbNova })
        .eq('id', lojistaId);
    }
  } catch (err) {
    console.warn('[syncKnowledgeBaseServicos] Aviso ao sincronizar serviços na knowledge_base:', err);
  }
}

async function resolveDashboardLojista(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'super_admin') {
    const cookieStore = await cookies();
    const impersonateTenantId = cookieStore.get('flow_impersonate_tenant_id')?.value;
    if (impersonateTenantId) {
      const { data: targetLojista } = await supabase
        .from('lojistas')
        .select('id, nome_estabelecimento')
        .eq('id', impersonateTenantId)
        .single();
      if (targetLojista) return targetLojista;
    }
  }

  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id, nome_estabelecimento')
    .eq('user_id', userId)
    .single();

  return lojista;
}

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const lojista = await resolveDashboardLojista(supabase, user.id);

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

  const lojista = await resolveDashboardLojista(supabase, user.id);

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

  const lojista = await resolveDashboardLojista(supabase, user.id);
  if (!lojista) throw new Error('Tenant not found');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const dbClient =
    profile?.role === 'super_admin' && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : supabase;

  const nome_servico = (formData.get('nome_servico') as string)?.trim();
  const duracao_minutos = parseInt(formData.get('duracao_minutos') as string, 10);
  const preco = parseFloat(formData.get('preco') as string);
  const ativo = formData.get('ativo') === 'on';

  if (!DURACOES_PERMITIDAS.includes(duracao_minutos as any)) {
    throw new Error('Duração inválida. Valores permitidos: 15, 30, 45 ou 60 minutos.');
  }

  const { error } = await dbClient.from('servicos').insert({
    lojista_id: lojista.id,
    nome_servico,
    duracao_minutos,
    preco,
    ativo,
  });

  if (error) throw new Error(error.message);

  // Sincroniza automaticamente o catálogo atualizado dentro de lojistas.knowledge_base
  await syncKnowledgeBaseServicos(dbClient, lojista.id);

  return { success: true };
}
