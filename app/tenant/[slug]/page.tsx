import { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import AgendamentoClient from './agendamento-client';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  MessageCircle, 
  Star, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface TenantPageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

// 1. Geração de Metadados Dinâmicos (White Label)
export async function generateMetadata({ params }: TenantPageProps): Promise<Metadata> {
  const supabase = await createClient();
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;

  const baseFields = 'nome_estabelecimento, logo_url, tier, cor_primaria';

  let query = supabase
    .from('lojistas')
    .select(`${baseFields}, configuracoes`);

  if (slug.startsWith('custom_')) {
    query = query.eq('dominio_proprio', slug.replace('custom_', ''));
  } else {
    query = query.eq('slug_subdominio', slug);
  }

  let lojista: any = null;
  const { data, error } = await query.single();

  if (error && error.message?.includes('configuracoes')) {
    let retryQuery = supabase.from('lojistas').select(baseFields);
    if (slug.startsWith('custom_')) {
      retryQuery = retryQuery.eq('dominio_proprio', slug.replace('custom_', ''));
    } else {
      retryQuery = retryQuery.eq('slug_subdominio', slug);
    }
    const retry = await retryQuery.single();
    lojista = retry.data;
  } else {
    lojista = data;
  }

  if (!lojista) {
    return {
      title: 'Agendamento Online',
      description: 'Agende seu horário online de forma rápida e prática.',
    };
  }

  const nome = lojista.nome_estabelecimento;
  const config = lojista.configuracoes as { favicon_url?: string; [key: string]: any } | null;
  const favicon = config?.favicon_url || lojista.logo_url || '/favicon.ico';

  return {
    title: `${nome} | Agendamento Online`,
    description: `Agende seu horário online em ${nome}. Rápido, prático e sem filas.`,
    icons: {
      icon: favicon,
      apple: favicon,
    },
    openGraph: {
      title: `${nome} | Agendamento Online`,
      description: `Agende seu horário online em ${nome}. Rápido, prático e sem filas.`,
      images: lojista.logo_url ? [{ url: lojista.logo_url }] : [],
    },
  };
}

export default async function TenantPage({ params }: TenantPageProps) {
  const supabase = await createClient();
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;

  const baseFields = 'id, nome_estabelecimento, whatsapp_notificacao, cor_primaria, logo_url, tipo_site, status_pagamento, google_review_url, tier';

  let query = supabase
    .from('lojistas')
    .select(`${baseFields}, configuracoes`);

  if (slug.startsWith('custom_')) {
    query = query.eq('dominio_proprio', slug.replace('custom_', ''));
  } else {
    query = query.eq('slug_subdominio', slug);
  }

  let lojista: any = null;
  const { data, error } = await query.single();

  // Fallback caso a migration de configuracoes ainda não tenha sido rodada no Supabase
  if (error && error.message?.includes('configuracoes')) {
    let retryQuery = supabase.from('lojistas').select(baseFields);
    if (slug.startsWith('custom_')) {
      retryQuery = retryQuery.eq('dominio_proprio', slug.replace('custom_', ''));
    } else {
      retryQuery = retryQuery.eq('slug_subdominio', slug);
    }
    const retry = await retryQuery.single();
    lojista = retry.data;
  } else {
    lojista = data;
  }

  if (!lojista) {
    notFound();
  }

  const isSuspenso = lojista.status_pagamento === 'inadimplente' || lojista.status_pagamento === 'cancelado';

  // 2. Buscar serviços ativos
  const { data: servicos } = await supabase
    .from('servicos')
    .select('id, nome_servico, duracao_minutos, intervalo_minutos, preco, exige_sinal, valor_sinal')
    .eq('lojista_id', lojista.id)
    .eq('ativo', true)
    .order('nome_servico');

  // 3. Buscar profissionais ativos
  const { data: profissionais } = await supabase
    .from('profissionais')
    .select('id, nome, foto_url, bio, ativo')
    .eq('lojista_id', lojista.id)
    .eq('ativo', true)
    .order('nome');

  // Configurações White Label & Cores
  const config = lojista.configuracoes as {
    mostrar_badge_plataforma?: boolean;
    cor_primaria?: string;
    cor_secundaria?: string;
    favicon_url?: string;
  } | null;

  const corPrimaria = config?.cor_primaria || lojista.cor_primaria || '#2E3440';
  const corSecundaria = config?.cor_secundaria || '#88C0D0';

  // Regra de White Label:
  const mostrarBadgePlataforma = config?.mostrar_badge_plataforma !== undefined
    ? config.mostrar_badge_plataforma
    : (lojista.tier === 'tier_1');

  const anoAtual = new Date().getFullYear();

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
    <main 
      className="min-h-screen bg-[#242933] text-[#ECEFF4] font-sans flex flex-col justify-between selection:bg-[#88C0D0]/30 selection:text-[#ECEFF4]" 
      style={{ 
        '--tenant-primary': corPrimaria,
        '--tenant-secondary': corSecundaria,
      } as React.CSSProperties}
    >
      <div>
        {/* Header Público com Identidade do Lojista */}
        <header className="w-full bg-[#2E3440]/90 backdrop-blur-md border-b border-[#3B4252] sticky top-0 z-40 shadow-lg">
          <div className="mx-auto max-w-5xl px-4 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {lojista.logo_url ? (
                <img 
                  src={lojista.logo_url} 
                  alt={lojista.nome_estabelecimento} 
                  className="h-11 w-11 rounded-2xl object-cover bg-[#3B4252] p-0.5 border border-[#4C566A] shadow-md shrink-0" 
                />
              ) : (
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#88C0D0] to-[#5E81AC] flex items-center justify-center font-black text-[#242933] text-lg shadow-md shrink-0">
                  {lojista.nome_estabelecimento.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate leading-tight">
                  {lojista.nome_estabelecimento}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[#A3BE8C] font-semibold">
                    <span className="h-2 w-2 rounded-full bg-[#A3BE8C] animate-pulse" />
                    Aberto para Agendamentos
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {lojista.whatsapp_notificacao && (
                <a
                  href={`https://wa.me/${lojista.whatsapp_notificacao.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Tenho dúvidas sobre agendamentos no ${lojista.nome_estabelecimento}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#242933] hover:bg-[#3B4252] border border-[#434C5E] text-[#ECEFF4] text-xs font-semibold transition"
                  title="Tirar dúvidas no WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#A3BE8C]" />
                  <span>WhatsApp</span>
                </a>
              )}

              <a 
                href="#agendamento"
                className="rounded-xl bg-[#88C0D0] hover:bg-[#9cd4e4] px-4 py-2 text-xs font-black text-[#242933] shadow-md transition flex items-center gap-1.5 active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Agendar Horário</span>
              </a>
            </div>
          </div>
        </header>

        {/* Bloco Institucional Completo (Tier 2/3) */}
        {lojista.tipo_site === 'institucional_completo' && (
          <div>
            {/* Hero Institucional */}
            <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-[#2E3440] via-[#2E3440]/80 to-[#242933] border-b border-[#3B4252] text-center px-4">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#88C0D0_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              
              <div className="relative mx-auto max-w-3xl space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#3B4252] border border-[#4C566A] px-3.5 py-1 text-xs font-semibold text-[#88C0D0]">
                  <Sparkles className="w-3.5 h-3.5 text-[#88C0D0]" />
                  Experiência Premium & Conforto
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  Atendimento profissional com pontualidade garantida
                </h2>
                <p className="text-sm sm:text-base text-[#D8DEE9]/80 max-w-xl mx-auto leading-relaxed">
                  Trabalhamos com profissionais experientes, horários agendados sem filas e um ambiente planejado para o seu bem-estar.
                </p>
                <div className="pt-3">
                  <a 
                    href="#agendamento"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#88C0D0] hover:bg-[#9cd4e4] px-6 py-3.5 text-xs font-black text-[#242933] shadow-lg transition active:scale-95"
                  >
                    <span>Ver Horários Disponíveis</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </section>

            {/* Prova Social: Google Meu Negócio & Avaliações */}
            <section className="py-10 border-b border-[#3B4252] bg-[#2E3440]/40">
              <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#3B4252] border border-[#4C566A] shadow-inner text-2xl font-black text-[#EBCB8B]">
                    5.0
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[#EBCB8B]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1">Excelente no Google Meu Negócio</h3>
                    <p className="text-xs text-[#81A1C1]">Avaliado com satisfação máxima pelos clientes da região</p>
                  </div>
                </div>

                {lojista.google_review_url && (
                  <a
                    href={lojista.google_review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-[#4C566A] bg-[#2E3440] px-4 py-2.5 text-xs font-semibold text-[#ECEFF4] hover:bg-[#3B4252] transition shadow-sm shrink-0 flex items-center gap-2"
                  >
                    <Star className="w-3.5 h-3.5 text-[#EBCB8B]" />
                    <span>Ver Avaliações no Google Maps &rarr;</span>
                  </a>
                )}
              </div>
            </section>

            {/* Galeria de Fotos / Estrutura */}
            <section className="py-14 mx-auto max-w-5xl px-4">
              <div className="text-center max-w-xl mx-auto mb-8 space-y-1.5">
                <h3 className="text-2xl font-black text-white tracking-tight">Nosso Espaço</h3>
                <p className="text-xs text-[#81A1C1]">Ambiente climatizado, equipamentos modernos e total foco no seu conforto.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {galeriaFotos.map((item, idx) => (
                  <div key={idx} className="group relative aspect-4/3 rounded-2xl overflow-hidden shadow-md border border-[#434C5E] bg-[#2E3440]">
                    <img
                      src={item.url}
                      alt={item.titulo}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#242933]/90 via-transparent to-transparent flex items-end p-3">
                      <span className="text-[11px] font-semibold text-white drop-shadow-sm">{item.titulo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Container Principal do Agendamento */}
        <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12" id="agendamento">
          {isSuspenso ? (
            <div className="bg-[#2E3440] p-8 sm:p-12 rounded-3xl shadow-xl border border-[#BF616A]/40 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#BF616A]/20 border border-[#BF616A]/40 text-[#BF616A]">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Agendamentos Online Temporariamente Indisponíveis</h2>
              <p className="text-xs sm:text-sm text-[#D8DEE9]/80 max-w-md mx-auto leading-relaxed">
                O sistema de agendamento online deste estabelecimento está passando por ajustes. Entre em contato diretamente pelo WhatsApp para marcar seu horário.
              </p>
              {lojista.whatsapp_notificacao && (
                <div className="pt-2">
                  <a
                    href={`https://wa.me/${lojista.whatsapp_notificacao.replace(/\D/g, '')}?text=${encodeURIComponent('Olá, gostaria de agendar um horário diretamente pelo WhatsApp.')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#A3BE8C] hover:bg-[#b0c89a] px-6 py-3 text-xs font-black text-[#242933] transition shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Agendar pelo WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <AgendamentoClient 
              lojista={lojista} 
              servicos={servicos || []} 
              profissionais={profissionais || []}
            />
          )}
        </div>
      </div>

      {/* Rodapé Dinâmico White Label */}
      <footer className="w-full border-t border-[#3B4252] bg-[#242933] py-8 mt-12">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#81A1C1]">
          <div>
            &copy; {anoAtual} <strong className="text-white font-semibold">{lojista.nome_estabelecimento}</strong>. Todos os direitos reservados.
          </div>

          {mostrarBadgePlataforma ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2E3440] text-[#D8DEE9] font-medium text-[11px] border border-[#3B4252] shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-[#88C0D0]" />
              <span>Agendamento protegido e verificado via FlowAgenda</span>
            </div>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
