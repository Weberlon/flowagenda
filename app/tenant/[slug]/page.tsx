import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import AgendamentoClient from './agendamento-client';

export default async function TenantPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const supabase = await createClient();
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;

  // 1. Buscar dados do lojista (por subdomínio ou domínio customizado)
  let query = supabase
    .from('lojistas')
    .select('id, nome_estabelecimento, whatsapp_notificacao, cor_primaria, logo_url, tipo_site, status_pagamento');

  if (slug.startsWith('custom_')) {
    query = query.eq('dominio_proprio', slug.replace('custom_', ''));
  } else {
    query = query.eq('slug_subdominio', slug);
  }

  const { data: lojista } = await query.single();

  if (!lojista) {
    notFound();
  }

  const isSuspenso = lojista.status_pagamento === 'inadimplente' || lojista.status_pagamento === 'cancelado';

  // 2. Buscar serviços ativos
  const { data: servicos } = await supabase
    .from('servicos')
    .select('id, nome_servico, duracao_minutos, preco')
    .eq('lojista_id', lojista.id)
    .eq('ativo', true)
    .order('nome_servico');

  // Valores padrão para UI se null
  const corPrimaria = lojista.cor_primaria || '#0F172A';

  return (
    <main className="min-h-screen bg-slate-50 font-sans" style={{ '--tenant-primary': corPrimaria } as React.CSSProperties}>
      {/* Header Público */}
      <header className="w-full bg-[var(--tenant-primary)] shadow-md">
        <div className="mx-auto max-w-4xl px-4 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {lojista.logo_url ? (
              <img src={lojista.logo_url} alt="Logo" className="h-12 w-12 rounded-full object-cover bg-white p-1" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center font-bold text-slate-900 text-xl">
                {lojista.nome_estabelecimento.charAt(0)}
              </div>
            )}
            <h1 className="text-xl font-bold text-white tracking-tight">{lojista.nome_estabelecimento}</h1>
          </div>
        </div>
      </header>

      {/* Bloco Institucional Completo (Tier 3) */}
      {lojista.tipo_site === 'institucional_completo' && (
        <div className="bg-white">
          {/* Hero Section */}
          <div className="mx-auto max-w-4xl px-4 py-16 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Transformando seu sorriso e autoestima
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              Especialistas dedicados a proporcionar a melhor experiência e resultados duradouros com tecnologia de ponta.
            </p>
          </div>

          {/* Sobre o Especialista */}
          <div className="bg-slate-50 py-16">
            <div className="mx-auto max-w-4xl px-4 flex flex-col md:flex-row items-center gap-8">
              <div className="w-48 h-48 rounded-2xl bg-slate-200 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-slate-400">
                [Foto do Profissional]
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Sobre o Espaço</h3>
                <p className="text-slate-600 mb-4">
                  Trabalhamos com uma abordagem humanizada, focando não apenas no resultado estético, mas também no conforto e no bem-estar de cada cliente que nos visita.
                </p>
                <button className="px-6 py-2 rounded-lg bg-[var(--tenant-primary)] text-white font-semibold shadow-sm hover:opacity-90">
                  Conheça a Equipe
                </button>
              </div>
            </div>
          </div>

          {/* Portfólio / Resultados */}
          <div className="py-16 mx-auto max-w-4xl px-4 border-b border-slate-100">
            <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Resultados que Falam por Si</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="aspect-square rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 font-medium">
                  [Imagem {item}]
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Container Principal */}
      <div className="mx-auto max-w-4xl px-4 py-8" id="agendamento">
        {isSuspenso ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Agendamentos Online Temporariamente Indisponíveis</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              O sistema de agendamento online deste estabelecimento está passando por ajustes. Entre em contato diretamente pelo WhatsApp para marcar seu horário.
            </p>
            {lojista.whatsapp_notificacao && (
              <div className="pt-2">
                <a
                  href={`https://wa.me/${lojista.whatsapp_notificacao}?text=${encodeURIComponent('Olá, gostaria de agendar um horário diretamente pelo WhatsApp.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
                >
                  Agendar pelo WhatsApp
                </a>
              </div>
            )}
          </div>
        ) : (
          <AgendamentoClient 
            lojista={lojista} 
            servicos={servicos || []} 
          />
        )}
      </div>
    </main>
  );
}
