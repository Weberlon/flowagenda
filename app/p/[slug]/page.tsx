import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  CheckCircle2,
  Star,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import {
  normalizarSlugSite,
  validarSiteBlueprint,
  verificarElegibilidadeSiteLojista,
  type SiteBlueprint,
} from '@/lib/site-lojista';

export const dynamic = 'force-dynamic';

interface PaginaPublicaSiteProps {
  params: Promise<{ slug: string }> | { slug: string };
}

async function buscarSitePorSlug(slugBruto: string) {
  const slug = normalizarSlugSite(slugBruto);
  if (!slug) return null;

  const client = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();

  const { data: site, error } = await client
    .from('sites_lojistas')
    .select(
      'id, lojista_id, slug, status, liberacao_manual, dominio_proprio, blueprint'
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error || !site) return null;

  const { data: lojista } = await client
    .from('lojistas')
    .select(
      'id, nome_estabelecimento, slug_subdominio, tier, status_pagamento, is_founder, whatsapp_notificacao'
    )
    .eq('id', site.lojista_id)
    .maybeSingle();

  return { site, lojista };
}

export async function generateMetadata({
  params,
}: PaginaPublicaSiteProps): Promise<Metadata> {
  const resolved = await Promise.resolve(params);
  const resultado = await buscarSitePorSlug(resolved.slug);

  if (!resultado || resultado.site.status !== 'publicado') {
    return {
      title: 'Página Institucional | FlowAgenda',
      description: 'Agendamento online inteligente para negócios locais.',
    };
  }

  const validacao = validarSiteBlueprint(resultado.site.blueprint);
  if (!validacao.valido) {
    return {
      title: resultado.lojista?.nome_estabelecimento || 'Agendamento Online',
    };
  }

  return {
    title: `${validacao.blueprint.nome} | ${validacao.blueprint.nicho}`,
    description: validacao.blueprint.hero.subtitulo,
  };
}

function AvisoEstadoSite({
  titulo,
  descricao,
  corDestaque = '#88C0D0',
}: {
  titulo: string;
  descricao: string;
  corDestaque?: string;
}) {
  return (
    <main className="min-h-screen bg-[#2E3440] text-[#ECEFF4] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-[#4C566A] bg-[#3B4252] p-8 text-center shadow-2xl space-y-4">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#4C566A] bg-[#2E3440]"
          style={{ color: corDestaque }}
        >
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-[#ECEFF4]">{titulo}</h1>
        <p className="text-sm text-[#ECEFF4]/80 leading-relaxed">{descricao}</p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#88C0D0] px-5 py-2.5 text-xs font-bold text-[#2E3440] hover:bg-[#88C0D0]/90 transition-colors"
          >
            <span>Conhecer o FlowAgenda</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function PaginaPublicaLojista({
  params,
}: PaginaPublicaSiteProps) {
  const resolved = await Promise.resolve(params);
  const resultado = await buscarSitePorSlug(resolved.slug);

  if (!resultado || !resultado.lojista) {
    return (
      <AvisoEstadoSite
        titulo="Site não encontrado"
        descricao="O endereço informado não corresponde a nenhuma página institucional cadastrada no momento."
        corDestaque="#EBCB8B"
      />
    );
  }

  const { site, lojista } = resultado;

  if (site.status !== 'publicado') {
    return (
      <AvisoEstadoSite
        titulo="Site em preparação"
        descricao="Esta página institucional ainda está em modo rascunho e será liberada em breve pelo estabelecimento."
        corDestaque="#88C0D0"
      />
    );
  }

  const elegibilidade = verificarElegibilidadeSiteLojista({
    tier: lojista.tier,
    is_founder: lojista.is_founder,
    status_pagamento: lojista.status_pagamento,
    liberacaoManual: Boolean(site.liberacao_manual),
  });

  if (!elegibilidade.podePublicar) {
    return (
      <AvisoEstadoSite
        titulo="Página indisponível no momento"
        descricao="A exibição pública desta página institucional está temporariamente suspensa porque o plano ou a assinatura do estabelecimento requer regularização."
        corDestaque="#BF616A"
      />
    );
  }

  const validacao = validarSiteBlueprint(site.blueprint);
  if (!validacao.valido) {
    return (
      <AvisoEstadoSite
        titulo="Configuração de página incompleta"
        descricao="Os dados visuais desta página precisam ser revisados no painel administrativo antes da exibição."
        corDestaque="#EBCB8B"
      />
    );
  }

  const bp: SiteBlueprint = validacao.blueprint;
  const urlAgendamento = `/tenant/${lojista.slug_subdominio}`;
  const whatsappLimpo = (bp.contato.whatsapp || lojista.whatsapp_notificacao || '').replace(
    /\D/g,
    ''
  );
  const urlWhatsapp =
    whatsappLimpo.length >= 10
      ? `https://wa.me/${whatsappLimpo}?text=${encodeURIComponent(
          `Olá! Vim pelo site de ${bp.nome} e gostaria de agendar um horário.`
        )}`
      : null;

  const isInstitucionalCompleto = bp.tipoSite !== 'landing_page';

  return (
    <div
      className="min-h-screen font-sans antialiased selection:opacity-90"
      style={
        {
          '--site-primaria': bp.corPrimaria,
          '--site-secundaria': bp.corSecundaria,
          '--site-fundo': bp.corFundo,
          '--site-texto': bp.corTexto,
          backgroundColor: bp.corFundo,
          color: bp.corTexto,
        } as React.CSSProperties
      }
    >
      {/* Cabeçalho da Marca */}
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-xl bg-black/25">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {bp.logoUrl ? (
              <img
                src={bp.logoUrl}
                alt={`Logotipo de ${bp.nome}`}
                className="h-10 w-10 rounded-xl object-cover border border-white/15 shrink-0"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-md"
                style={{
                  backgroundColor: bp.corPrimaria,
                  color: bp.corFundo,
                }}
              >
                {bp.nome.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base truncate">{bp.nome}</p>
              <p className="text-[11px] opacity-75 truncate">{bp.nicho}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {urlWhatsapp && (
              <a
                href={urlWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                <MessageCircle className="h-4 w-4" style={{ color: bp.corSecundaria }} />
                <span>WhatsApp</span>
              </a>
            )}
            <Link
              href={urlAgendamento}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-md transition-opacity hover:opacity-90"
              style={{
                backgroundColor: bp.corPrimaria,
                color: bp.corFundo,
              }}
            >
              <Calendar className="h-4 w-4" />
              <span>Agendar</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero da Marca */}
      <section className="relative overflow-hidden py-14 sm:py-22 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            {bp.hero.selo && (
              <span
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold border border-white/15 bg-white/5"
                style={{ color: bp.corPrimaria }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {bp.hero.selo}
              </span>
            )}

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.12]">
              {bp.hero.titulo}
            </h1>

            <p className="text-sm sm:text-lg opacity-85 leading-relaxed max-w-2xl">
              {bp.hero.subtitulo}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href={urlAgendamento}
                className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-black shadow-xl transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: bp.corPrimaria,
                  color: bp.corFundo,
                }}
              >
                <Calendar className="h-4 w-4" />
                <span>{bp.hero.ctaTexto}</span>
              </Link>

              {urlWhatsapp && (
                <a
                  href={urlWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold hover:bg-white/10 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" style={{ color: bp.corSecundaria }} />
                  <span>Tirar dúvidas no WhatsApp</span>
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            {bp.fotoCapaUrl ? (
              <div className="overflow-hidden rounded-3xl border border-white/15 shadow-2xl aspect-[4/3] bg-black/20">
                <img
                  src={bp.fotoCapaUrl}
                  alt={`Foto de ${bp.nome}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="rounded-3xl border border-white/15 bg-white/5 p-7 shadow-2xl space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Atendimento Online
                </p>
                <h2 className="text-xl font-bold leading-snug">
                  Reserve seu horário sem esperar resposta manual
                </h2>
                <ul className="space-y-2.5 text-sm opacity-90">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: bp.corSecundaria }} />
                    <span>Horários atualizados em tempo real</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: bp.corSecundaria }} />
                    <span>Confirmação segura via código PIN</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: bp.corSecundaria }} />
                    <span>Lembrete automático no seu WhatsApp</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Serviços / Destaques */}
      {bp.servicos.length > 0 && (
        <section className="py-16 sm:py-20 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Serviços e Procedimentos
                </h2>
                <p className="text-sm opacity-75 mt-1">
                  Escolha o atendimento ideal e confirme seu horário online.
                </p>
              </div>
              <Link
                href={urlAgendamento}
                className="text-xs font-bold inline-flex items-center gap-1.5 hover:underline"
                style={{ color: bp.corPrimaria }}
              >
                <span>Ver agenda completa</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {bp.servicos.map((servico, idx) => (
                <div
                  key={`${servico.nome}-${idx}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 flex flex-col justify-between gap-4 hover:border-white/25 transition-colors"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold">{servico.nome}</h3>
                    {servico.descricao && (
                      <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
                        {servico.descricao}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold">
                    <span style={{ color: bp.corPrimaria }}>
                      {servico.preco || 'Consultar valor'}
                    </span>
                    {servico.duracaoMinutos && (
                      <span className="opacity-75">
                        {servico.duracaoMinutos} min
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sobre e Diferenciais */}
      <section className="py-16 sm:py-20 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {bp.sobre.titulo}
            </h2>
            <p className="text-sm sm:text-base opacity-85 leading-relaxed">
              {bp.sobre.texto}
            </p>
          </div>

          {bp.sobre.diferenciais.length > 0 && (
            <div className="lg:col-span-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                Diferenciais do Atendimento
              </p>
              <ul className="space-y-3">
                {bp.sobre.diferenciais.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2
                      className="h-4 w-4 mt-0.5 shrink-0"
                      style={{ color: bp.corSecundaria }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Galeria e Depoimentos para tipoSite institucional_completo */}
      {isInstitucionalCompleto && bp.galeriaUrls && bp.galeriaUrls.length > 0 && (
        <section className="py-16 sm:py-20 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Nosso Espaço e Portfólio
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bp.galeriaUrls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 aspect-[4/3]"
                >
                  <img
                    src={url}
                    alt={`${bp.nome} — foto ${idx + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {isInstitucionalCompleto && bp.depoimentos && bp.depoimentos.length > 0 && (
        <section className="py-16 sm:py-20 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Avaliações de Clientes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {bp.depoimentos.map((dep, idx) => (
                <div
                  key={`${dep.autor}-${idx}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 space-y-3"
                >
                  <div className="flex items-center gap-1" style={{ color: bp.corPrimaria }}>
                    {[...Array(dep.nota || 5)].map((_, sIdx) => (
                      <Star key={sIdx} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm opacity-90 leading-relaxed">
                    &ldquo;{dep.texto}&rdquo;
                  </p>
                  <p className="text-xs font-bold opacity-75">{dep.autor}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Horários, Endereço e Contato */}
      <footer className="py-12 sm:py-16 bg-black/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Clock className="h-4 w-4" style={{ color: bp.corPrimaria }} />
              <span>Horário de Atendimento</span>
            </div>
            <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
              {bp.contato.horarioAtendimento}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <MapPin className="h-4 w-4" style={{ color: bp.corPrimaria }} />
              <span>Endereço</span>
            </div>
            <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
              {bp.contato.endereco}
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-sm">Pronto para agendar?</p>
            <Link
              href={urlAgendamento}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold shadow-md transition-opacity hover:opacity-90"
              style={{
                backgroundColor: bp.corPrimaria,
                color: bp.corFundo,
              }}
            >
              <Calendar className="h-4 w-4" />
              <span>{bp.hero.ctaTexto}</span>
            </Link>
            {bp.contato.instagram && (
              <p className="text-xs opacity-70">Instagram: {bp.contato.instagram}</p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
