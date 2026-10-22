import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getWhatsAppComercialUrl } from '@/lib/contact';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Validação de Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isSuperAdmin = profile?.role === 'super_admin';
  let lojista: any = null;
  let isImpersonating = false;

  if (isSuperAdmin) {
    const cookieStore = await cookies();
    const impersonateTenantId = cookieStore.get('flow_impersonate_tenant_id')?.value;

    if (impersonateTenantId) {
      const { data: targetLojista } = await supabase
        .from('lojistas')
        .select('*')
        .eq('id', impersonateTenantId)
        .single();

      if (targetLojista) {
        lojista = targetLojista;
        isImpersonating = true;
      }
    }

    // Se é Super Admin e não possui lojista para impersonar, vai para a gestão central
    if (!lojista) {
      redirect('/superadmin');
    }
  } else {
    // Buscar lojista associado diretamente ao user_id (Lojista padrão)
    const { data: userLojista } = await supabase
      .from('lojistas')
      .select('*')
      .eq('user_id', user.id)
      .single();

    lojista = userLojista;
  }

  if (!lojista) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0F172A] text-slate-100 font-sans p-6">
        <div className="max-w-md text-center space-y-6 bg-[#1E293B] p-8 rounded-2xl border border-slate-700 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 border border-slate-600">
            <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Conta Criada!</h2>
            <p className="text-slate-400 text-sm">
              Sua conta foi registrada com sucesso. Estamos preparando o ambiente do seu estabelecimento.
              Se você é um novo lojista, conclua o processo de ativação com o nosso suporte ou aguarde a aprovação.
            </p>
          </div>
          <div className="space-y-3">
            <a
              href={getWhatsAppComercialUrl('Olá, gostaria de ativar meu estabelecimento no FlowAgenda')}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-md bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Falar com Suporte no WhatsApp
            </a>
            <Link
              href="/login"
              className="block w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Trocar de conta / Voltar ao Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isInadimplente = lojista.status_pagamento === 'inadimplente' || lojista.status_pagamento === 'cancelado';

  return (
    <div className="flex h-screen w-full bg-[#0F172A] text-slate-100 font-sans">
      
      {/* Sidebar Compacta (Nord Dark) */}
      <aside className="w-64 flex-col border-r border-slate-800 bg-[#020617] hidden md:flex">
        <div className="flex h-16 items-center px-6 border-b border-slate-800">
          <span className="font-bold text-lg tracking-tight">FlowAgenda</span>
        </div>
        
        <nav className="flex-1 space-y-2 p-4 text-sm font-medium">
          <Link href="/dashboard" className="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            Agenda
          </Link>
          <Link href="/dashboard/servicos" className="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            Serviços
          </Link>
          <Link href="/dashboard/clientes" className="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            Clientes
          </Link>
          <Link href="/dashboard/configuracoes" className="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
            Configurações
          </Link>
        </nav>
        
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          <p>Plano: {lojista.tier}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 text-slate-900">
        {/* Impersonation Warning Banner */}
        {isImpersonating && (
          <div className="bg-amber-400 text-slate-950 px-6 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-3 shadow-sm z-20 border-b border-amber-500">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-950 text-amber-300 uppercase tracking-wider">
                Super Admin
              </span>
              <span>
                Gerenciando estabelecimento: <strong>{lojista.nome_estabelecimento}</strong> ({lojista.slug_subdominio})
              </span>
            </div>
            <Link
              href="/dashboard?exit_impersonation=true"
              className="inline-flex items-center gap-1 font-bold underline hover:text-slate-900 transition-colors"
            >
              Sair da Impersonação ➔
            </Link>
          </div>
        )}

        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-slate-800">{lojista.nome_estabelecimento}</h2>
          <div className="text-sm font-medium text-slate-500">
            {user.email}
          </div>
        </header>

        {/* Inadimplência Banner */}
        {isInadimplente && (
          <div className="bg-red-600 px-6 py-3 text-center text-sm font-medium text-white shadow-sm">
            Sua assinatura está suspensa por falta de pagamento. Regularize para reativar os agendamentos online.
          </div>
        )}

        {/* Scrollable Main */}
        <main className="flex-1 overflow-y-auto p-6">
          {isInadimplente ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-md text-center bg-white p-8 rounded-2xl border border-red-200 shadow-sm space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Assinatura Suspensa</h3>
                  <p className="text-slate-600 text-sm">
                    Identificamos uma pendência financeira na sua conta FlowAgenda. Seus agendamentos online foram temporariamente pausados.
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  <a
                    href={getWhatsAppComercialUrl('Olá, gostaria de regularizar a assinatura do meu estabelecimento no FlowAgenda')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Falar com o Financeiro no WhatsApp
                  </a>
                  <p className="text-[11px] text-slate-400">
                    Assim que o pagamento for identificado pelo Asaas, seu painel e os agendamentos online serão reativados automaticamente em segundos.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
