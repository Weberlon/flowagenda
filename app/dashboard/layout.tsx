import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getWhatsAppComercialUrl } from '@/lib/contact';
import { fetchPendingAsaasInvoiceUrl } from '@/lib/asaas-subscription';
import { DashboardHeaderNav } from '@/components/dashboard/DashboardHeaderNav';
import { BrandLogo } from '@/components/BrandLogo';
import { Calendar, Scissors, Users, Settings, ExternalLink } from 'lucide-react';

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

  const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : (supabase as any);

  // Validação de Role
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    profile?.role === 'superadmin' ||
    profile?.role === 'admin';
  let lojista: any = null;
  let isImpersonating = false;

  if (isSuperAdmin) {
    const cookieStore = await cookies();
    const impersonateTenantId = cookieStore.get('flow_impersonate_tenant_id')?.value;

    if (impersonateTenantId) {
      const { data: targetLojista } = await adminClient
        .from('lojistas')
        .select('*')
        .eq('id', impersonateTenantId)
        .maybeSingle();

      if (targetLojista) {
        lojista = targetLojista;
        isImpersonating = true;
      }
    }

    // Se Super Admin não está impersonando, tenta buscar lojista próprio ou o primeiro ativo (nunca redireciona forçadamente para /superadmin)
    if (!lojista) {
      const { data: ownLojista } = await adminClient
        .from('lojistas')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (ownLojista) {
        lojista = ownLojista;
      } else {
        const { data: firstLojista } = await adminClient
          .from('lojistas')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstLojista) {
          lojista = firstLojista;
        }
      }
    }
  } else {
    // Buscar lojista associado diretamente ao user_id (Lojista padrão)
    const { data: userLojista } = await supabase
      .from('lojistas')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

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

  const lojistaId: string = lojista.id;
  const isFounder = Boolean(lojista.is_founder);
  const isExemptFromPaymentLock = isFounder || isImpersonating;
  const isPaymentBlocked = !isExemptFromPaymentLock && lojista.status_pagamento !== 'ativo';

  let pendingInvoiceUrl: string | null = null;
  if (isPaymentBlocked) {
    pendingInvoiceUrl = await fetchPendingAsaasInvoiceUrl(
      lojista.asaas_subscription_id,
      lojista.asaas_customer_id
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#242933] text-[#ECEFF4] font-sans">
      
      {/* Sidebar Compacta (Nord Dark) */}
      <aside className="w-64 flex-col border-r border-[#3B4252] bg-[#242933] hidden md:flex">
        <div className="flex h-16 items-center px-5 border-b border-[#3B4252]">
          <Link href="/dashboard">
            <BrandLogo variant="sm" />
          </Link>
        </div>
        
        <nav className="flex-1 space-y-1.5 p-4 text-xs sm:text-sm font-semibold">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[#D8DEE9] hover:bg-[#3B4252] hover:text-[#ECEFF4] transition-colors"
          >
            <Calendar className="h-4 w-4 text-[#88C0D0]" />
            <span>Agenda & Métricas</span>
          </Link>
          <Link
            href="/dashboard/servicos"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[#D8DEE9] hover:bg-[#3B4252] hover:text-[#ECEFF4] transition-colors"
          >
            <Scissors className="h-4 w-4 text-[#81A1C1]" />
            <span>Serviços</span>
          </Link>
          <Link
            href="/dashboard/clientes"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[#D8DEE9] hover:bg-[#3B4252] hover:text-[#ECEFF4] transition-colors"
          >
            <Users className="h-4 w-4 text-[#A3BE8C]" />
            <span>Clientes (CRM)</span>
          </Link>
          <Link
            href="/dashboard/configuracoes"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[#D8DEE9] hover:bg-[#3B4252] hover:text-[#ECEFF4] transition-colors"
          >
            <Settings className="h-4 w-4 text-[#EBCB8B]" />
            <span>Configurações IA</span>
          </Link>
        </nav>
        
        <div className="p-4 border-t border-[#3B4252] text-xs space-y-2">
          <div className="flex items-center justify-between text-[#88C0D0]">
            <span className="font-semibold">Plano</span>
            <span className="font-mono uppercase bg-[#88C0D0]/10 px-2 py-0.5 rounded border border-[#88C0D0]/30 text-[10px]">
              {lojista.tier}
            </span>
          </div>
          {lojista.slug_subdominio && (
            <a
              href={`https://${lojista.slug_subdominio}.flowagenda.online`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-[11px] text-[#D8DEE9]/70 hover:text-[#88C0D0] transition-colors"
            >
              <span>Ver Página Pública</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#242933] text-[#ECEFF4]">
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
            <a
              href="/superadmin?exit_impersonation=true"
              className="inline-flex items-center gap-1 font-bold underline hover:text-slate-900 transition-colors"
            >
              Voltar ao Super Admin ➔
            </a>
          </div>
        )}

        {/* Header Responsivo (Nord Dark com Drawer Mobile) */}
        <DashboardHeaderNav
          lojista={{
            id: lojistaId,
            nome_estabelecimento: lojista.nome_estabelecimento,
            slug_subdominio: lojista.slug_subdominio,
            tier: lojista.tier,
          }}
          userEmail={user.email}
        />

        {/* Banner Superior de Pendência Financeira */}
        {isPaymentBlocked && (
          <div className="bg-[#BF616A] px-6 py-2.5 text-center text-xs sm:text-sm font-semibold text-[#ECEFF4] shadow-sm">
            Sua assinatura está aguardando confirmação de pagamento ({lojista.status_pagamento || 'pendente'}). Regularize para liberar o acesso completo ao painel.
          </div>
        )}

        {/* Scrollable Main */}
        <main className="flex-1 overflow-y-auto bg-[#242933] p-6 text-[#ECEFF4]">
          {isPaymentBlocked ? (
            <div className="flex h-full items-center justify-center p-4">
              <div className="w-full max-w-lg text-center bg-[#2E3440] p-8 rounded-2xl border border-[#3B4252] shadow-2xl space-y-6 text-[#ECEFF4]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3B4252] text-[#88C0D0] border border-[#4C566A]">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <span className="inline-flex items-center rounded-full bg-[#BF616A]/20 border border-[#BF616A]/40 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#BF616A]">
                    Status: {lojista.status_pagamento || 'pendente'}
                  </span>
                  <h3 className="text-2xl font-bold text-[#ECEFF4]">
                    Aguardando Confirmação de Pagamento
                  </h3>
                  <p className="text-[#D8DEE9]/80 text-sm leading-relaxed">
                    Para liberar o acesso ao painel de gestão de <strong>{lojista.nome_estabelecimento}</strong>, conclua o pagamento da sua assinatura FlowAgenda (Pix, Boleto ou Cartão).
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {pendingInvoiceUrl && (
                    <a
                      href={pendingInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#A3BE8C] px-5 py-3 text-sm font-black text-[#242933] hover:bg-[#A3BE8C]/90 transition-colors shadow-md"
                    >
                      <span>💳 Regularizar Assinatura / Abrir Fatura</span>
                    </a>
                  )}

                  <a
                    href={getWhatsAppComercialUrl(
                      `Olá, gostaria de regularizar ou ativar a assinatura do estabelecimento "${lojista.nome_estabelecimento}" no FlowAgenda.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-bold transition-colors ${
                      pendingInvoiceUrl
                        ? 'border border-[#4C566A] bg-[#3B4252] text-[#ECEFF4] hover:bg-[#434C5E]'
                        : 'bg-[#88C0D0] text-[#242933] hover:bg-[#88C0D0]/90 shadow-md'
                    }`}
                  >
                    <span>💬 Falar com o Suporte no WhatsApp</span>
                  </a>

                  <p className="text-[11px] text-[#D8DEE9]/60 pt-1">
                    Assim que o pagamento for confirmado pelo Asaas, seu acesso será liberado automaticamente em segundos.
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
