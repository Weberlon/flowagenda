'use client';

import React, { useMemo, useState } from 'react';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  Copy,
  FileCode2,
  Upload,
  ExternalLink,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  criarModeloSiteBlueprint,
  normalizarSlugSite,
  validarSiteBlueprint,
  verificarElegibilidadeSiteLojista,
  type SiteBlueprint,
  type StatusSiteLojista,
} from '@/lib/site-lojista';

export interface LojistaResumoSite {
  id: string;
  nome_estabelecimento: string;
  slug_subdominio: string;
  tier?: string | null;
  status_pagamento?: string | null;
  is_founder?: boolean | null;
}

export interface SiteLojistaRegistro {
  id: string;
  lojista_id: string;
  slug: string;
  status: StatusSiteLojista;
  liberacao_manual: boolean;
  dominio_proprio?: string | null;
  blueprint: SiteBlueprint;
  updated_at?: string;
}

interface SiteLojistaPanelProps {
  lojistas: LojistaResumoSite[];
  sitesIniciais: SiteLojistaRegistro[];
}

export function SiteLojistaPanel({
  lojistas,
  sitesIniciais,
}: SiteLojistaPanelProps) {
  const [sitesPorLojista, setSitesPorLojista] = useState<
    Record<string, SiteLojistaRegistro>
  >(() => {
    const mapa: Record<string, SiteLojistaRegistro> = {};
    for (const site of sitesIniciais) {
      mapa[site.lojista_id] = site;
    }
    return mapa;
  });

  const primeiroLojistaId = lojistas[0]?.id || '';
  const [lojistaIdSelecionado, setLojistaIdSelecionado] =
    useState<string>(primeiroLojistaId);

  const lojistaAtual = useMemo(
    () => lojistas.find((l) => l.id === lojistaIdSelecionado) || null,
    [lojistas, lojistaIdSelecionado]
  );

  const registroInicial = sitesPorLojista[primeiroLojistaId];
  const [slug, setSlug] = useState<string>(
    registroInicial?.slug ||
      normalizarSlugSite(lojistas[0]?.slug_subdominio || lojistas[0]?.nome_estabelecimento || '')
  );
  const [status, setStatus] = useState<StatusSiteLojista>(
    registroInicial?.status || 'rascunho'
  );
  const [liberacaoManual, setLiberacaoManual] = useState<boolean>(
    Boolean(registroInicial?.liberacao_manual)
  );
  const [dominioProprio, setDominioProprio] = useState<string>(
    registroInicial?.dominio_proprio || ''
  );
  const [jsonTexto, setJsonTexto] = useState<string>(() =>
    JSON.stringify(
      registroInicial?.blueprint ||
        criarModeloSiteBlueprint(lojistas[0]?.nome_estabelecimento || 'Sua Marca'),
      null,
      2
    )
  );

  const [salvando, setSalvando] = useState(false);
  const [copiadoModelo, setCopiadoModelo] = useState(false);
  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'aviso';
    texto: string;
  } | null>(null);

  const aoTrocarLojista = (novoId: string) => {
    setLojistaIdSelecionado(novoId);
    setFeedback(null);

    const alvo = lojistas.find((l) => l.id === novoId);
    const existente = sitesPorLojista[novoId];

    if (existente) {
      setSlug(existente.slug);
      setStatus(existente.status);
      setLiberacaoManual(Boolean(existente.liberacao_manual));
      setDominioProprio(existente.dominio_proprio || '');
      setJsonTexto(JSON.stringify(existente.blueprint, null, 2));
    } else {
      setSlug(
        normalizarSlugSite(alvo?.slug_subdominio || alvo?.nome_estabelecimento || '')
      );
      setStatus('rascunho');
      setLiberacaoManual(false);
      setDominioProprio('');
      setJsonTexto(
        JSON.stringify(
          criarModeloSiteBlueprint(alvo?.nome_estabelecimento || 'Sua Marca'),
          null,
          2
        )
      );
    }
  };

  const elegibilidade = useMemo(() => {
    if (!lojistaAtual) return null;
    return verificarElegibilidadeSiteLojista({
      tier: lojistaAtual.tier,
      is_founder: lojistaAtual.is_founder,
      status_pagamento: lojistaAtual.status_pagamento,
      liberacaoManual,
    });
  }, [lojistaAtual, liberacaoManual]);

  const slugNormalizado = normalizarSlugSite(slug);
  const urlPublica = `https://www.flowagenda.online/p/${slugNormalizado || 'seu-slug'}`;

  const copiarJsonModelo = async () => {
    const modelo = criarModeloSiteBlueprint(
      lojistaAtual?.nome_estabelecimento || 'Clínica Exemplo'
    );
    const texto = JSON.stringify(modelo, null, 2);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoModelo(true);
      setTimeout(() => setCopiadoModelo(false), 2500);
    } catch {
      setJsonTexto(texto);
      setFeedback({
        tipo: 'aviso',
        texto: 'Modelo carregado diretamente no editor de JSON.',
      });
    }
  };

  const carregarModeloNoEditor = () => {
    const modelo = criarModeloSiteBlueprint(
      lojistaAtual?.nome_estabelecimento || 'Clínica Exemplo'
    );
    setJsonTexto(JSON.stringify(modelo, null, 2));
    setFeedback({
      tipo: 'aviso',
      texto: 'JSON modelo carregado no editor. Ajuste os dados e clique em Salvar / Publicar.',
    });
  };

  const formatarEValidarJson = () => {
    try {
      const parsed = JSON.parse(jsonTexto);
      const validacao = validarSiteBlueprint(parsed);
      if (!validacao.valido) {
        setFeedback({ tipo: 'erro', texto: validacao.erro });
        return;
      }
      setJsonTexto(JSON.stringify(validacao.blueprint, null, 2));
      setFeedback({
        tipo: 'sucesso',
        texto: 'JSON validado e formatado com sucesso. Pronto para salvar ou publicar.',
      });
    } catch {
      setFeedback({
        tipo: 'erro',
        texto: 'Sintaxe JSON inválida. Verifique vírgulas, chaves e aspas antes de continuar.',
      });
    }
  };

  const aoCarregarArquivoJson = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    try {
      const conteudo = await arquivo.text();
      const parsed = JSON.parse(conteudo);
      const validacao = validarSiteBlueprint(parsed);
      if (!validacao.valido) {
        setFeedback({ tipo: 'erro', texto: validacao.erro });
        return;
      }
      setJsonTexto(JSON.stringify(validacao.blueprint, null, 2));
      setFeedback({
        tipo: 'sucesso',
        texto: `Arquivo "${arquivo.name}" carregado e validado com sucesso.`,
      });
    } catch {
      setFeedback({
        tipo: 'erro',
        texto: 'Não foi possível ler o arquivo selecionado. Confirme se é um JSON válido.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const salvarSite = async () => {
    if (!lojistaIdSelecionado) {
      setFeedback({ tipo: 'erro', texto: 'Selecione um lojista.' });
      return;
    }

    let blueprintObj: unknown;
    try {
      blueprintObj = JSON.parse(jsonTexto);
    } catch {
      setFeedback({
        tipo: 'erro',
        texto: 'O conteúdo do editor não é um JSON válido.',
      });
      return;
    }

    setSalvando(true);
    setFeedback(null);

    try {
      const resposta = await fetch('/api/admin/site-lojista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lojistaId: lojistaIdSelecionado,
          slug: slugNormalizado,
          status,
          liberacaoManual,
          dominioProprio: dominioProprio.trim() || null,
          blueprint: blueprintObj,
        }),
      });

      const dados = await resposta.json();
      if (!resposta.ok) {
        setFeedback({
          tipo: 'erro',
          texto: dados?.error || 'Erro ao salvar configuração do site.',
        });
        return;
      }

      if (dados.site) {
        setSitesPorLojista((prev) => ({
          ...prev,
          [lojistaIdSelecionado]: dados.site,
        }));
      }

      setFeedback({
        tipo: 'sucesso',
        texto: dados.mensagem || 'Configuração salva com sucesso.',
      });
    } catch {
      setFeedback({
        tipo: 'erro',
        texto: 'Falha de comunicação com a API administrativa.',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#4C566A] bg-[#2E3440] p-6 shadow-xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#4C566A]/60 pb-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B4252] border border-[#4C566A] text-[#88C0D0]">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[#ECEFF4]">
                Sites e Landing Pages
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#B48EAD]/15 border border-[#B48EAD]/35 px-2.5 py-0.5 text-[11px] font-semibold text-[#B48EAD]">
                <Sparkles className="h-3 w-3" />
                Publicação por Lojista
              </span>
            </div>
            <p className="text-xs text-[#ECEFF4]/75 mt-1">
              Vincule o JSON estruturado (SiteBlueprint) gerado para o cliente e publique em{' '}
              <span className="font-mono text-[#88C0D0]">/p/&lt;slug&gt;</span> sem alterar o sistema principal.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copiarJsonModelo}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#4C566A] bg-[#3B4252] px-3 py-2 text-xs font-semibold text-[#ECEFF4] hover:bg-[#434C5E] transition-colors cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-[#88C0D0]" />
            <span>{copiadoModelo ? 'Modelo copiado!' : 'Copiar JSON modelo'}</span>
          </button>

          <button
            type="button"
            onClick={carregarModeloNoEditor}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#4C566A] bg-[#3B4252] px-3 py-2 text-xs font-semibold text-[#ECEFF4] hover:bg-[#434C5E] transition-colors cursor-pointer"
          >
            <FileCode2 className="h-3.5 w-3.5 text-[#A3BE8C]" />
            <span>Carregar modelo</span>
          </button>
        </div>
      </div>

      {/* Seleção de Lojista + Elegibilidade */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-[#4C566A] bg-[#3B4252] p-4 space-y-4">
            <div>
              <label
                htmlFor="seletor-lojista-site"
                className="block text-xs font-semibold text-[#ECEFF4] mb-1.5"
              >
                1. Selecionar Lojista
              </label>
              <select
                id="seletor-lojista-site"
                value={lojistaIdSelecionado}
                onChange={(e) => aoTrocarLojista(e.target.value)}
                className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2.5 text-xs text-[#ECEFF4] focus:outline-none focus:ring-2 focus:ring-[#88C0D0]"
              >
                {lojistas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome_estabelecimento} ({l.tier || 'tier_1'} • {l.status_pagamento || 'pendente'})
                  </option>
                ))}
              </select>
            </div>

            {elegibilidade && lojistaAtual && (
              <div
                className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                  elegibilidade.podePublicar
                    ? 'border-[#A3BE8C]/40 bg-[#A3BE8C]/10 text-[#ECEFF4]'
                    : 'border-[#EBCB8B]/40 bg-[#EBCB8B]/10 text-[#ECEFF4]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold flex items-center gap-1.5">
                    {elegibilidade.podePublicar ? (
                      <CheckCircle2 className="h-4 w-4 text-[#A3BE8C]" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-[#EBCB8B]" />
                    )}
                    Plano {elegibilidade.rotuloPlano}
                    {lojistaAtual.is_founder ? ' • Fundador' : ''}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                      elegibilidade.podePublicar
                        ? 'bg-[#A3BE8C]/20 text-[#A3BE8C]'
                        : 'bg-[#EBCB8B]/20 text-[#EBCB8B]'
                    }`}
                  >
                    {elegibilidade.podePublicar ? 'Elegível' : 'Restrito'}
                  </span>
                </div>
                <p className="text-[11px] text-[#ECEFF4]/80 leading-relaxed">
                  {elegibilidade.motivo}
                </p>
              </div>
            )}

            <label className="flex items-start gap-2.5 rounded-xl border border-[#4C566A] bg-[#2E3440]/80 p-3 cursor-pointer hover:bg-[#434C5E]/50 transition-colors">
              <input
                type="checkbox"
                checked={liberacaoManual}
                onChange={(e) => setLiberacaoManual(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#4C566A] accent-[#88C0D0]"
              />
              <span className="text-xs text-[#ECEFF4]">
                <strong className="block font-semibold">
                  Liberação manual pelo Super Admin
                </strong>
                <span className="text-[11px] text-[#ECEFF4]/70">
                  Permite publicar o site mesmo em planos iniciais (desde que a conta esteja ativa ou seja Fundador).
                </span>
              </span>
            </label>
          </div>

          <div className="rounded-xl border border-[#4C566A] bg-[#3B4252] p-4 space-y-4">
            <div>
              <label
                htmlFor="campo-slug-site"
                className="block text-xs font-semibold text-[#ECEFF4] mb-1.5"
              >
                2. Slug da Página Pública
              </label>
              <input
                id="campo-slug-site"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={() => setSlug(normalizarSlugSite(slug))}
                placeholder="ex.: clinica-sorriso"
                className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2.5 text-xs font-mono text-[#ECEFF4] placeholder-[#ECEFF4]/40 focus:outline-none focus:ring-2 focus:ring-[#88C0D0]"
              />
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-[#2E3440] px-3 py-2 border border-[#4C566A]/60">
                <span className="text-[11px] font-mono text-[#88C0D0] truncate">
                  {urlPublica}
                </span>
                {slugNormalizado && (
                  <a
                    href={`/p/${slugNormalizado}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#A3BE8C] hover:underline"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="seletor-status-site"
                  className="block text-xs font-semibold text-[#ECEFF4] mb-1.5"
                >
                  Status de Publicação
                </label>
                <select
                  id="seletor-status-site"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value === 'publicado' ? 'publicado' : 'rascunho')
                  }
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2.5 text-xs font-semibold text-[#ECEFF4] focus:outline-none focus:ring-2 focus:ring-[#88C0D0]"
                >
                  <option value="rascunho">Rascunho (oculto)</option>
                  <option value="publicado">Publicado (online)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="campo-dominio-proprio"
                  className="block text-xs font-semibold text-[#ECEFF4] mb-1.5"
                >
                  Domínio próprio (opcional)
                </label>
                <input
                  id="campo-dominio-proprio"
                  type="text"
                  value={dominioProprio}
                  onChange={(e) => setDominioProprio(e.target.value)}
                  placeholder="ex.: clinicasorriso.com.br"
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2.5 text-xs font-mono text-[#ECEFF4] placeholder-[#ECEFF4]/40 focus:outline-none focus:ring-2 focus:ring-[#88C0D0]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Editor JSON do SiteBlueprint */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-[#4C566A] bg-[#3B4252] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="editor-json-site"
              className="text-xs font-semibold text-[#ECEFF4]"
            >
              3. JSON Estruturado do Site (SiteBlueprint)
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#4C566A] bg-[#2E3440] px-2.5 py-1.5 text-[11px] font-semibold text-[#ECEFF4] hover:bg-[#434C5E] transition-colors cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-[#88C0D0]" />
                <span>Importar .json</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={aoCarregarArquivoJson}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={formatarEValidarJson}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#4C566A] bg-[#2E3440] px-2.5 py-1.5 text-[11px] font-semibold text-[#88C0D0] hover:bg-[#434C5E] transition-colors cursor-pointer"
              >
                Formatar e Validar JSON
              </button>
            </div>
          </div>

          <textarea
            id="editor-json-site"
            value={jsonTexto}
            onChange={(e) => setJsonTexto(e.target.value)}
            rows={16}
            spellCheck={false}
            className="w-full flex-1 rounded-xl border border-[#4C566A] bg-[#2E3440] p-3.5 font-mono text-xs text-[#ECEFF4] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#88C0D0]"
          />

          {feedback && (
            <div
              role="status"
              className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                feedback.tipo === 'sucesso'
                  ? 'border-[#A3BE8C]/45 bg-[#A3BE8C]/15 text-[#A3BE8C]'
                  : feedback.tipo === 'erro'
                  ? 'border-[#BF616A]/45 bg-[#BF616A]/15 text-[#BF616A]'
                  : 'border-[#EBCB8B]/45 bg-[#EBCB8B]/15 text-[#EBCB8B]'
              }`}
            >
              {feedback.texto}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <p className="text-[11px] text-[#ECEFF4]/70">
              O botão de agendamento da página pública redirecionará para{' '}
              <span className="font-mono text-[#88C0D0]">
                /tenant/{lojistaAtual?.slug_subdominio || 'slug'}
              </span>
              .
            </p>

            <button
              type="button"
              disabled={salvando || !lojistaIdSelecionado}
              onClick={salvarSite}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#88C0D0] px-5 py-2.5 text-xs font-bold text-[#2E3440] hover:bg-[#88C0D0]/90 disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>
                {salvando
                  ? 'Salvando...'
                  : status === 'publicado'
                  ? 'Salvar e Publicar Site'
                  : 'Salvar Rascunho'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
