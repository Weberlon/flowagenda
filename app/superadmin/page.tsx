import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { OnboardingForm } from './onboarding-form';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

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
      <main className="flex min-h-screen items-center justify-center p-24">
        <div className="rounded-md bg-red-50 p-6 text-red-700">
          <h1 className="text-xl font-bold">Acesso Negado</h1>
          <p>Esta página é restrita a administradores do sistema.</p>
        </div>
      </main>
    );
  }

  // Busca todos os lojistas cadastrados para gestão centralizada
  const { data: lojistas } = await supabase
    .from('lojistas')
    .select('id, nome_estabelecimento, slug_subdominio, dominio_proprio, tier, whatsapp_notificacao, status_pagamento, configuracoes_robo(instance_name, status_conexao)')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Painel Super Admin</h1>
            <p className="mt-1 text-sm text-slate-600">
              Gestão global de Lojistas, Pareamento de WhatsApp (Evolution API) e Impersonação.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Super Admin Ativo
            </span>
          </div>
        </div>

        {/* Seção 1: Lista de Estabelecimentos Cadastrados */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Estabelecimentos Cadastrados (Tenants)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Acesse o QR Code do robô Evolution API ou impersone o painel administrativo da barbearia/clínica.
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
              {lojistas?.length || 0} estabelecimentos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Estabelecimento</th>
                  <th className="py-3 px-3">Subdomínio (Slug)</th>
                  <th className="py-3 px-3">Plano / Status</th>
                  <th className="py-3 px-3">Instância WhatsApp</th>
                  <th className="py-3 px-3 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {lojistas && lojistas.length > 0 ? (
                  lojistas.map((item: any) => {
                    const robo = Array.isArray(item.configuracoes_robo)
                      ? item.configuracoes_robo[0]
                      : item.configuracoes_robo;
                    const isConnected = robo?.status_conexao === 'open';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {item.nome_estabelecimento}
                          {item.whatsapp_notificacao && (
                            <span className="block text-[11px] font-normal text-slate-500">
                              Zap: {item.whatsapp_notificacao}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          <a
                            href={`https://${item.slug_subdominio}.flowagenda.online`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-blue-600"
                            title="Abrir página pública"
                          >
                            {item.slug_subdominio}.flowagenda.online
                          </a>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-800">
                            {item.tier || 'tier_1'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {robo?.instance_name ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                              <span>{robo.instance_name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pendente</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <Link
                            href={`/superadmin/tenants/${item.id}/whatsapp`}
                            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            QR Code WhatsApp
                          </Link>
                          <Link
                            href={`/dashboard/configuracoes?impersonate_tenant_id=${item.id}`}
                            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                          >
                            Impersonar Painel
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Nenhum estabelecimento cadastrado no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seção 2: Formulário de Onboarding de Novo Lojista */}
        <div>
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
