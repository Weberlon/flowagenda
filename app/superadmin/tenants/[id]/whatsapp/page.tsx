import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getConfiguracoesData } from '@/app/actions/configuracoes';
import { ConfiguracoesClient } from '@/app/dashboard/configuracoes/configuracoes-client';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function SuperAdminTenantWhatsAppPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

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

  // Seta o cookie de impersonação para garantir que qualquer Server Action chamada nesta página atue no tenant correto
  const cookieStore = await cookies();
  cookieStore.set('flow_impersonate_tenant_id', id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  // Carrega os dados do estabelecimento alvo diretamente com explicitLojistaId
  let data;
  try {
    data = await getConfiguracoesData(id);
  } catch (err: any) {
    console.error('Erro ao buscar dados do tenant:', err);
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Bar Super Admin */}
      <header className="sticky top-0 z-30 bg-[#020617] text-white border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
          >
            ← Painel Super Admin
          </Link>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Instância WhatsApp
            </span>
            <span className="text-xs text-slate-300">
              Estabelecimento: <strong className="text-white font-semibold">{data.lojista.nome_estabelecimento}</strong> ({data.lojista.slug_subdominio})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href={`/dashboard/configuracoes?impersonate_tenant_id=${data.lojista.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-colors shadow-sm"
          >
            Impersonar no Dashboard ➔
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 md:p-10">
        <ConfiguracoesClient
          lojista={data.lojista}
          configRobo={data.configRobo}
          initialWhatsappStatus={data.whatsappStatus}
        />
      </main>
    </div>
  );
}
