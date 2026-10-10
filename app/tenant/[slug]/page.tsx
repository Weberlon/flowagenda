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
    .select('id, nome_estabelecimento, whatsapp_notificacao, cor_primaria, logo_url, tipo_site, status_pagamento, google_review_url');

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

  // Fotos de alta resolução curadas como fallback temático profissional
  const isOdonto = lojista.nome_estabelecimento.toLowerCase().includes('odonto') || 
                  lojista.nome_estabelecimento.toLowerCase().includes('clínica') || 
                  lojista.nome_estabelecimento.toLowerCase().includes('dent');

  const galeriaFotos = isOdonto ? [
    { url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80', titulo: 'Consultório Moderno' },
    { url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80', titulo: 'Biossegurança & Conforto' },
    { url: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80', titulo: 'Equipamentos de Ponta' },
    { url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80', titulo: 'Atendimento Humanizado' },
  ] : [
    { url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', titulo: 'Cortes Clássicos & Modernos' },
    { url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80', titulo: 'Barba Terapia com Toalha Quente' },
    { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80', titulo: 'Ambiente Climatizado & Café' },
    { url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80', titulo: 'Produtos Profissionais' },
  ];

  return (
    <main className="min-h-screen bg-slate-50 font-sans" style={{ '--tenant-primary': corPrimaria } as React.CSSProperties}>
      {/* Header Público */}
      <header className="w-full bg-[var(--tenant-primary)] shadow-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {lojista.logo_url ? (
              <img src={lojista.logo_url} alt="Logo" className="h-10 w-10 rounded-full object-cover bg-white p-0.5 shadow-sm" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center font-black text-slate-900 text-lg shadow-sm">
                {lojista.nome_estabelecimento.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">{lojista.nome_estabelecimento}</h1>
              <span className="text-[10px] text-white/80 block">Atendimento com Agendamento Online</span>
            </div>
          </div>

          <a 
            href="#agendamento"
            className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-slate-900 shadow-sm hover:bg-slate-100 transition"
          >
            Agendar Horário
          </a>
        </div>
      </header>

      {/* Bloco Institucional Completo (Tier 2/3) */}
      {lojista.tipo_site === 'institucional_completo' && (
        <div className="bg-white">
          {/* Hero Institucional */}
          <section className="relative overflow-hidden py-16 sm:py-20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white text-center px-4">
            <div className="mx-auto max-w-3xl space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-xs">
                ⭐ Experiência Premium & Conforto
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Cuidado profissional com quem entende do assunto
              </h2>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
                Nosso compromisso é proporcionar pontualidade, atendimento personalizado e resultados impecáveis para cada cliente.
              </p>
              <div className="pt-2">
                <a 
                  href="#agendamento"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-bold text-slate-900 shadow-md hover:bg-slate-100 transition"
                >
                  Ver Horários Livres de Hoje &rarr;
                </a>
              </div>
            </div>
          </section>

          {/* Prova Social: Google Meu Negócio & Avaliações */}
          <section className="py-12 border-b border-slate-100 bg-slate-50/70">
            <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 text-2xl font-black text-amber-500">
                  5.0
                </div>
                <div>
                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    ★★★★★
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">Excelente no Google Meu Negócio</h3>
                  <p className="text-xs text-slate-500">Avaliado com nota máxima por clientes da região</p>
                </div>
              </div>

              {lojista.google_review_url && (
                <a
                  href={lojista.google_review_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs shrink-0"
                >
                  Ver Avaliações no Google Maps &rarr;
                </a>
              )}
            </div>
          </section>

          {/* Galeria de Fotos / Estrutura */}
          <section className="py-16 mx-auto max-w-5xl px-4">
            <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
              <h3 className="text-2xl font-bold text-slate-900">Conheça o Nosso Espaço</h3>
              <p className="text-xs text-slate-500">Ambiente climatizado, equipamentos esterilizados e foco no seu conforto.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {galeriaFotos.map((item, idx) => (
                <div key={idx} className="group relative aspect-4/3 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100">
                  <img
                    src={item.url}
                    alt={item.titulo}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-2.5">
                    <span className="text-[11px] font-semibold text-white drop-shadow-xs">{item.titulo}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
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
