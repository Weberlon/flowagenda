import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { fetchInstanceConnectionStatus } from '@/lib/evolution';
import { SuperAdminWhatsAppClient } from './whatsapp-client';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function SuperAdminTenantWhatsAppPage({ params }: PageProps) {
  // 1. DESEMPACOTAMENTO DE PARAMS (NEXT.JS 15 / REACT 19):
  const { id } = await params;

  const supabase = await createClient();

  // Validação de sessão do usuário
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Validação estrita de Role: Super Admin
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

  // 2. CONSULTA AO SCHEMA REAL DO SUPABASE:
  // Busque os dados exclusivamente em public.lojistas usando o UUID recebido:
  const { data: lojista, error: lojistaError } = await supabase
    .from('lojistas')
    .select('id, nome_estabelecimento, slug_subdominio')
    .eq('id', id)
    .single();

  if (lojistaError || !lojista) {
    notFound();
  }

  // 3. MAPEAMENTO CORRETO DA INSTÂNCIA EVOLUTION API:
  // A instância na Evolution API utiliza o slug do estabelecimento com prefixo (ex: flowagenda_barbeariamodelo), NUNCA o UUID da rota.
  // Passe slug_subdominio (e não o UUID) para as funções de busca de status e geração de QR Code da lib/evolution.ts.
  let { data: configRobo } = await supabase
    .from('configuracoes_robo')
    .select('*')
    .eq('lojista_id', lojista.id)
    .maybeSingle();

  const cleanSlug = lojista.slug_subdominio.replace(/[^a-zA-Z0-9]/g, '_');
  const instanceName = configRobo?.instance_name || `flowagenda_${cleanSlug}`;

  if (!configRobo) {
    const { data: newRobo } = await supabase
      .from('configuracoes_robo')
      .insert({
        lojista_id: lojista.id,
        instance_name: instanceName,
        status_conexao: 'desconectado',
      })
      .select()
      .maybeSingle();

    if (newRobo) {
      configRobo = newRobo;
    }
  }

  // Isole a chamada da Evolution API em bloco try/catch para renderizar aviso amigável na tela se a VPS falhar
  let whatsappStatus: { instanceName: string; state: string; qrcode?: string | null } | null = null;
  let vpsWarning: string | null = null;

  try {
    whatsappStatus = await fetchInstanceConnectionStatus(instanceName);

    // Sincroniza o status do banco caso tenha mudado
    if (whatsappStatus?.state && configRobo && whatsappStatus.state !== configRobo.status_conexao) {
      await supabase
        .from('configuracoes_robo')
        .update({ status_conexao: whatsappStatus.state, updated_at: new Date().toISOString() })
        .eq('lojista_id', lojista.id);
    }
  } catch (err: any) {
    console.error(`[SuperAdmin WhatsApp] VPS Error para ${instanceName}:`, err);
    vpsWarning = 'Não foi possível conectar ao gateway Evolution API neste momento. Verifique se a VPS está online.';
    whatsappStatus = {
      instanceName,
      state: 'close',
      qrcode: null,
    };
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
              Estabelecimento: <strong className="text-white font-semibold">{lojista.nome_estabelecimento}</strong> ({lojista.slug_subdominio})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href={`/dashboard/configuracoes?impersonate_tenant_id=${lojista.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-colors shadow-sm"
          >
            Impersonar no Dashboard ➔
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-10">
        {/* 4. INDEPENDÊNCIA DE COOKIE DE IMPERSONAÇÃO: SuperAdminWhatsAppClient opera diretamente com lojista.id */}
        <SuperAdminWhatsAppClient
          lojista={lojista}
          instanceName={instanceName}
          initialStatus={whatsappStatus}
          vpsWarning={vpsWarning}
        />
      </main>
    </div>
  );
}
