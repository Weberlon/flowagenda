import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import AgendamentoClient from './agendamento-client';

export default async function TenantPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  // 1. Buscar dados do lojista
  const { data: lojista } = await supabase
    .from('lojistas')
    .select('id, nome_estabelecimento, whatsapp_notificacao, cor_primaria, logo_url, tipo_site')
    .eq('slug_subdominio', params.slug)
    .single();

  if (!lojista) {
    notFound();
  }

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
        <AgendamentoClient 
          lojista={lojista} 
          servicos={servicos || []} 
        />
      </div>
    </main>
  );
}
