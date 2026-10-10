import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

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

  // Validação de Role: Se for Super Admin, redireciona para a central de gestão
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'super_admin') {
    redirect('/superadmin');
  }

  // Buscar lojista associado ao user_id
  const { data: lojista } = await supabase
    .from('lojistas')
    .select('*')
    .eq('user_id', user.id)
    .single();

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
              href="https://wa.me/5500000000000?text=Ol%C3%A1,%20gostaria%20de%20ativar%20meu%20estabelecimento%20no%20FlowAgenda"
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
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Acesso Bloqueado</h3>
                <p className="text-slate-600">Resolva suas pendências financeiras no painel de cobrança.</p>
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
