import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { OnboardingForm } from './onboarding-form';
import { AsaasSubscribeButton } from './asaas-subscribe-button';
import { HealthCheckPanel } from './health-check-panel';
import { SuperAdminAnalytics } from './superadmin-analytics';
import { BrandLogo } from '@/components/BrandLogo';
import { AuthNavigationGuard } from '@/components/AuthNavigationGuard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PRECOS_MENSAIS: Record<string, number> = {
  tier_1: 59.90,
  tier_2: 99.90,
  tier_3: 189.90,
  tier_3_institucional: 189.90,
};

export default async function SuperAdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Validação de Role (super_admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#242933] p-24 text-[#ECEFF4]">
        <div className="rounded-2xl border border-[#BF616A]/40 bg-[#2E3440] p-8 text-center max-w-md shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#BF616A]/20 text-[#BF616A] mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#ECEFF4]">Acesso Negado</h1>
          <p className="mt-2 text-sm text-[#D8DEE9]/80">
            Esta página é restrita a administradores do sistema FlowAgenda.
          </p>
        </div>
      </main>
    );
  }

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : supabase;

  // 1. Busca todos os lojistas cadastrados para gestão centralizada
  const { data: lojistasData } = await adminClient
    .from('lojistas')
    .select('*, configuracoes_robo(instance_name, status_conexao)')
    .order('created_at', { ascending: false });

  const lojistas = lojistasData || [];

  // 2. Busca métricas analíticas da plataforma em paralelo
  const [agendamentosRes, chatQueueCountRes, webhookEventosCountRes] =
    await Promise.all([
      adminClient
        .from('agendamentos')
        .select('id, lojista_id, created_at, status'),
      adminClient
        .from('chat_queue')
        .select('id', { count: 'exact', head: true }),
      adminClient
        .from('webhook_eventos_processados')
        .select('id', { count: 'exact', head: true }),
    ]);

  const allAgendamentos = agendamentosRes.data || [];
  const totalAgendamentosCount = allAgendamentos.length;
  const totalInteracoesCount =
    (chatQueueCountRes.count || 0) + (webhookEventosCountRes.count || 0);

  // 3. Cálculo de KPIs SaaS
  let mrrEstimado = 0;
  let lojistasAtivos = 0;
  let lojistasPendentes = 0;
  let lojistasInadimplentes = 0;

  let countTier1 = 0;
  let countTier2 = 0;
  let countTier3 = 0;

  for (const l of lojistas) {
    const status = l.status_pagamento;
    const tier = l.tier || 'tier_1';
    const precoMensal = PRECOS_MENSAIS[tier] || 59.90;

    if (status === 'ativo') {
      lojistasAtivos++;
      mrrEstimado += precoMensal;
    } else if (status === 'inadimplente' || status === 'cancelado') {
      lojistasInadimplentes++;
    } else {
      lojistasPendentes++;
    }

    if (tier === 'tier_2') {
      countTier2++;
    } else if (tier === 'tier_3' || tier === 'tier_3_institucional') {
      countTier3++;
    } else {
      countTier1++;
    }
  }

  const arrEstimado = mrrEstimado * 12;

  // 4. Gráfico de Rosca/Donut de Planos
  const distribuicaoPlanos = [
    {
      name: 'Essencial',
      key: 'tier_1',
      value: countTier1,
      mrr: countTier1 * 59.90,
      color: '#88C0D0',
    },
    {
      name: 'Profissional',
      key: 'tier_2',
      value: countTier2,
      mrr: countTier2 * 99.90,
      color: '#A3BE8C',
    },
    {
      name: 'Autoridade',
      key: 'tier_3_institucional',
      value: countTier3,
      mrr: countTier3 * 189.90,
      color: '#B48EAD',
    },
  ];

  // 5. Gráfico de Barras: Novos Cadastros / Mês (últimos 6 meses)
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const hoje = new Date();
  const novosCadastrosMes: Array<{ mes: string; cadastros: number; receita: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const ano = d.getFullYear();
    const mesNum = d.getMonth();
    const nomeMes = `${mesesNomes[mesNum]}/${String(ano).slice(2)}`;

    const cadastrosNoMes = lojistas.filter((l: any) => {
      const cDate = new Date(l.created_at);
      return cDate.getFullYear() === ano && cDate.getMonth() === mesNum;
    });

    const receitaMes = cadastrosNoMes.reduce((acc: number, l: any) => {
      return acc + (PRECOS_MENSAIS[l.tier || 'tier_1'] || 59.90);
    }, 0);

    novosCadastrosMes.push({
      mes: nomeMes,
      cadastros: cadastrosNoMes.length,
      receita: receitaMes,
    });
  }

  // 6. Barras Horizontais: Estabelecimentos Mais Ativos
  const agendamentosPorLojista = new Map<string, number>();
  for (const a of allAgendamentos) {
    if (a.lojista_id) {
      agendamentosPorLojista.set(
        a.lojista_id,
        (agendamentosPorLojista.get(a.lojista_id) || 0) + 1
      );
    }
  }

  const estabelecimentosMaisAtivos = lojistas
    .map((l: any) => ({
      nome: l.nome_estabelecimento,
      slug: l.slug_subdominio,
      agendamentos: agendamentosPorLojista.get(l.id) || 0,
      status: l.status_pagamento || 'pendente',
      tier: l.tier || 'tier_1',
    }))
    .sort((a, b) => b.agendamentos - a.agendamentos)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#242933] p-6 md:p-12 font-sans text-[#ECEFF4]">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Top Header Super Admin (Nord Dark) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#3B4252] pb-6">
          <div className="flex items-center gap-4">
            <BrandLogo variant="lg" showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#ECEFF4]">
                  Painel Super Admin
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#88C0D0]/15 border border-[#88C0D0]/30 px-3 py-1 text-xs font-semibold text-[#88C0D0]">
                  <span className="h-2 w-2 rounded-full bg-[#A3BE8C]" />
                  SaaS Central
                </span>
              </div>
              <p className="mt-1 text-sm text-[#D8DEE9]/80">
                Gestão executiva de Lojistas, Assinaturas Asaas, Instâncias WhatsApp e Inteligência Analítica.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <AuthNavigationGuard rootPath="/superadmin" />
            <span className="inline-flex items-center gap-2 rounded-xl border border-[#4C566A] bg-[#2E3440] px-3.5 py-1.5 text-xs font-semibold text-[#ECEFF4] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#A3BE8C] animate-pulse" />
              Super Admin: {user.email}
            </span>
          </div>
        </div>

        {/* 0. ANALYTICS EXECUTIVO SUPER ADMIN */}
        <SuperAdminAnalytics
          kpis={{
            mrrEstimado,
            arrEstimado,
            totalLojistas: lojistas.length,
            lojistasAtivos,
            lojistasPendentes,
            lojistasInadimplentes,
            totalAgendamentos: totalAgendamentosCount,
            totalInteracoesIA: totalInteracoesCount,
          }}
          distribuicaoPlanos={distribuicaoPlanos}
          novosCadastrosMes={novosCadastrosMes}
          estabelecimentosMaisAtivos={estabelecimentosMaisAtivos}
        />

        {/* Seção 1: Lista de Estabelecimentos Cadastrados */}
        <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#ECEFF4]">Estabelecimentos Cadastrados</h2>
              <p className="text-xs text-[#D8DEE9]/70 mt-0.5">
                Acesse o QR Code do robô Evolution API ou entre no painel administrativo do estabelecimento.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#88C0D0] bg-[#242933] px-3 py-1 rounded-xl border border-[#3B4252]">
              {lojistas.length} {lojistas.length === 1 ? 'estabelecimento' : 'estabelecimentos'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#3B4252] text-[#D8DEE9]/70 uppercase tracking-wider font-semibold text-[11px] bg-[#242933]/40">
                  <th className="py-3 px-3">Estabelecimento</th>
                  <th className="py-3 px-3">Subdomínio (Slug)</th>
                  <th className="py-3 px-3">Plano / Status</th>
                  <th className="py-3 px-3">Instância WhatsApp</th>
                  <th className="py-3 px-3 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3B4252]/60 text-[#ECEFF4]">
                {lojistas.length > 0 ? (
                  lojistas.map((item: any) => {
                    const robo = Array.isArray(item.configuracoes_robo)
                      ? item.configuracoes_robo[0]
                      : item.configuracoes_robo;
                    const isConnected = robo?.status_conexao === 'open';

                    return (
                      <tr key={item.id} className="hover:bg-[#3B4252]/40 transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-[#ECEFF4]">
                          {item.nome_estabelecimento}
                          {item.whatsapp_notificacao && (
                            <span className="block text-[11px] font-mono font-normal text-[#D8DEE9]/60 mt-0.5">
                              Zap: {item.whatsapp_notificacao}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px]">
                          <a
                            href={`https://${item.slug_subdominio}.flowagenda.online`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-[#88C0D0]"
                            title="Abrir página pública"
                          >
                            {item.slug_subdominio}.flowagenda.online
                          </a>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-[#242933] border border-[#3B4252] text-[#88C0D0]">
                              {item.tier || 'tier_1'}
                            </span>
                            {item.status_pagamento && (
                              <span
                                className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                                  item.status_pagamento === 'ativo'
                                    ? 'bg-[#A3BE8C]/15 text-[#A3BE8C] border border-[#A3BE8C]/30'
                                    : item.status_pagamento === 'inadimplente'
                                    ? 'bg-[#BF616A]/15 text-[#BF616A] border border-[#BF616A]/30'
                                    : 'bg-[#EBCB8B]/15 text-[#EBCB8B] border border-[#EBCB8B]/30'
                                }`}
                              >
                                {item.status_pagamento}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px]">
                          {robo?.instance_name ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-[#A3BE8C]' : 'bg-[#EBCB8B]'}`} />
                              <span>{robo.instance_name}</span>
                            </span>
                          ) : (
                            <span className="text-[#D8DEE9]/40 italic">Pendente</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right space-x-2 whitespace-nowrap">
                          <AsaasSubscribeButton lojista={item} />
                          <Link
                            href={`/superadmin/tenants/${item.id}/whatsapp`}
                            className="inline-flex items-center rounded-xl bg-[#A3BE8C] px-3 py-1.5 text-xs font-bold text-[#242933] hover:bg-[#A3BE8C]/90 transition-colors shadow-sm"
                          >
                            QR Code WhatsApp
                          </Link>
                          <Link
                            href={`/dashboard/configuracoes?impersonate_tenant_id=${item.id}`}
                            className="inline-flex items-center rounded-xl border border-[#4C566A] bg-[#3B4252] px-3 py-1.5 text-xs font-semibold text-[#ECEFF4] hover:bg-[#434C5E] transition-colors shadow-sm"
                          >
                            Acessar Painel
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#D8DEE9]/60">
                      Nenhum estabelecimento cadastrado no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção 2: Diagnóstico & Reparação do Sistema */}
        <div>
          <HealthCheckPanel />
        </div>

        {/* Seção 3: Formulário de Onboarding de Novo Lojista */}
        <div>
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}