// ==============================================================================
// Tipos, validação e regras de elegibilidade para Sites e Landing Pages
// Arquivo: lib/site-lojista.ts
// ==============================================================================

export type StatusSiteLojista = 'rascunho' | 'publicado';

export type TipoSiteBlueprint = 'landing_page' | 'institucional_completo';

export interface ServicoDestaqueSite {
  nome: string;
  descricao?: string;
  preco?: string;
  duracaoMinutos?: 15 | 30 | 45 | 60;
}

export interface DepoimentoSite {
  autor: string;
  texto: string;
  nota?: number;
}

export interface SiteBlueprint {
  nome: string;
  nicho: string;
  tipoSite?: TipoSiteBlueprint;
  logoUrl?: string | null;
  fotoCapaUrl?: string | null;
  corPrimaria: string;
  corSecundaria: string;
  corFundo: string;
  corTexto: string;
  hero: {
    selo?: string;
    titulo: string;
    subtitulo: string;
    ctaTexto: string;
  };
  servicos: ServicoDestaqueSite[];
  sobre: {
    titulo: string;
    texto: string;
    diferenciais: string[];
  };
  contato: {
    horarioAtendimento: string;
    endereco: string;
    whatsapp: string;
    instagram?: string;
  };
  galeriaUrls?: string[];
  depoimentos?: DepoimentoSite[];
  dominioProprio?: string | null;
}

export interface SiteConfigLojista {
  id?: string;
  lojistaId: string;
  slug: string;
  status: StatusSiteLojista;
  liberacaoManual: boolean;
  dominioProprio?: string | null;
  blueprint: SiteBlueprint;
  atualizadoEm?: string;
}

export interface LojistaElegibilidadeInput {
  tier?: string | null;
  is_founder?: boolean | null;
  status_pagamento?: string | null;
  liberacaoManual?: boolean | null;
}

export interface ResultadoElegibilidadeSite {
  elegivelPlano: boolean;
  ativoFinanceiro: boolean;
  podePublicar: boolean;
  rotuloPlano: string;
  motivo: string;
}

const PLANOS_COM_SITE = new Set([
  'tier_2',
  'tier_3',
  'tier_3_institucional',
  'profissional',
  'autoridade',
]);

const DURACOES_VALIDAS = new Set([15, 30, 45, 60]);

export function obterRotuloPlano(tier?: string | null): string {
  switch (tier) {
    case 'tier_2':
    case 'profissional':
      return 'Profissional';
    case 'tier_3':
    case 'tier_3_institucional':
    case 'autoridade':
      return 'Autoridade';
    case 'tier_1':
    case 'essencial':
    default:
      return 'Essencial';
  }
}

export function verificarElegibilidadeSiteLojista(
  lojista: LojistaElegibilidadeInput
): ResultadoElegibilidadeSite {
  const tier = (lojista.tier || 'tier_1').trim().toLowerCase();
  const isFounder = Boolean(lojista.is_founder);
  const liberacaoManual = Boolean(lojista.liberacaoManual);
  const statusPagamento = (lojista.status_pagamento || 'pendente').trim().toLowerCase();

  const elegivelPlano = PLANOS_COM_SITE.has(tier) || isFounder || liberacaoManual;
  const ativoFinanceiro = isFounder || statusPagamento === 'ativo';
  const podePublicar = elegivelPlano && ativoFinanceiro;
  const rotuloPlano = obterRotuloPlano(tier);

  if (isFounder) {
    return {
      elegivelPlano: true,
      ativoFinanceiro: true,
      podePublicar: true,
      rotuloPlano,
      motivo: 'Conta Fundador com liberação vitalícia para publicação.',
    };
  }

  if (!elegivelPlano) {
    return {
      elegivelPlano: false,
      ativoFinanceiro,
      podePublicar: false,
      rotuloPlano,
      motivo: `O plano ${rotuloPlano} não inclui site dedicado por padrão. Ative a liberação manual ou faça upgrade para Profissional/Autoridade.`,
    };
  }

  if (!ativoFinanceiro) {
    return {
      elegivelPlano: true,
      ativoFinanceiro: false,
      podePublicar: false,
      rotuloPlano,
      motivo: `Plano ${rotuloPlano} elegível, porém a assinatura está com status "${statusPagamento}".`,
    };
  }

  return {
    elegivelPlano: true,
    ativoFinanceiro: true,
    podePublicar: true,
    rotuloPlano,
    motivo: liberacaoManual && !PLANOS_COM_SITE.has(tier)
      ? `Liberado manualmente pelo Super Admin (plano ${rotuloPlano} ativo).`
      : `Habilitado no plano ${rotuloPlano}.`,
  };
}

export function normalizarSlugSite(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizarCorHex(valor: unknown, padrao: string): string {
  if (typeof valor !== 'string') return padrao;
  const limpo = valor.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(limpo) ? limpo : padrao;
}

function textoSeguro(valor: unknown, padrao = ''): string {
  return typeof valor === 'string' && valor.trim().length > 0 ? valor.trim() : padrao;
}

export function criarModeloSiteBlueprint(nomeEstabelecimento = 'Clínica Sorriso Prime'): SiteBlueprint {
  return {
    nome: nomeEstabelecimento,
    nicho: 'Odontologia e Estética Facial',
    tipoSite: 'institucional_completo',
    logoUrl: null,
    fotoCapaUrl: null,
    corPrimaria: '#88C0D0',
    corSecundaria: '#A3BE8C',
    corFundo: '#1E242E',
    corTexto: '#ECEFF4',
    hero: {
      selo: 'Atendimento humanizado com hora marcada',
      titulo: `${nomeEstabelecimento}: cuidado técnico e agenda sem espera.`,
      subtitulo:
        'Escolha seu procedimento, veja os horários disponíveis em tempo real e confirme seu atendimento em segundos.',
      ctaTexto: 'Agendar horário agora',
    },
    servicos: [
      {
        nome: 'Avaliação Diagnóstica Completa',
        descricao: 'Consulta inicial detalhada com plano de atendimento personalizado.',
        preco: 'R$ 150,00',
        duracaoMinutos: 30,
      },
      {
        nome: 'Profilaxia e Limpeza Preventiva',
        descricao: 'Remoção de placa e polimento com orientação preventiva.',
        preco: 'R$ 220,00',
        duracaoMinutos: 45,
      },
      {
        nome: 'Clareamento Supervisionado',
        descricao: 'Protocolo seguro para resultados naturais e acompanhamento clínico.',
        preco: 'Sob consulta',
        duracaoMinutos: 60,
      },
    ],
    sobre: {
      titulo: 'Estrutura preparada para o seu conforto',
      texto:
        'Unimos pontualidade, protocolos atualizados e confirmação automática pelo WhatsApp para garantir tranquilidade do agendamento ao pós-atendimento.',
      diferenciais: [
        'Confirmação automática com código PIN de segurança',
        'Lembretes prévios para evitar atrasos e imprevistos',
        'Equipe especializada e ambiente climatizado',
      ],
    },
    contato: {
      horarioAtendimento: 'Segunda a sexta, das 08h30 às 19h00 • Sábado das 08h30 às 13h00',
      endereco: 'Av. Paulista, 1000 — Conjunto 42, Bela Vista',
      whatsapp: '5531984139736',
      instagram: '@clinicasorrisoprime',
    },
    galeriaUrls: [],
    depoimentos: [
      {
        autor: 'Mariana Almeida',
        texto: 'Atendimento pontual e super fácil de marcar pelo celular sem precisar esperar resposta.',
        nota: 5,
      },
      {
        autor: 'Carlos Eduardo',
        texto: 'Ambiente organizado, equipe atenciosa e lembrete no WhatsApp antes da consulta.',
        nota: 5,
      },
    ],
    dominioProprio: null,
  };
}

export function validarSiteBlueprint(
  entrada: unknown
): { valido: true; blueprint: SiteBlueprint } | { valido: false; erro: string } {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return {
      valido: false,
      erro: 'O JSON do site deve ser um objeto estruturado válido.',
    };
  }

  const obj = entrada as Record<string, unknown>;
  const nome = textoSeguro(obj.nome);
  if (!nome) {
    return {
      valido: false,
      erro: 'O campo "nome" da marca é obrigatório no JSON.',
    };
  }

  const heroRaw =
    obj.hero && typeof obj.hero === 'object' && !Array.isArray(obj.hero)
      ? (obj.hero as Record<string, unknown>)
      : null;

  const tituloHero = textoSeguro(heroRaw?.titulo);
  if (!tituloHero) {
    return {
      valido: false,
      erro: 'O campo "hero.titulo" é obrigatório no JSON.',
    };
  }

  const servicosRaw = Array.isArray(obj.servicos) ? obj.servicos : [];
  const servicos: ServicoDestaqueSite[] = servicosRaw
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => {
      const s = item as Record<string, unknown>;
      const duracaoNum = Number(s.duracaoMinutos);
      const duracaoValida = DURACOES_VALIDAS.has(duracaoNum)
        ? (duracaoNum as 15 | 30 | 45 | 60)
        : undefined;
      return {
        nome: textoSeguro(s.nome, 'Atendimento'),
        descricao: textoSeguro(s.descricao) || undefined,
        preco: textoSeguro(s.preco) || undefined,
        duracaoMinutos: duracaoValida,
      };
    })
    .filter((s) => Boolean(s.nome));

  const sobreRaw =
    obj.sobre && typeof obj.sobre === 'object' && !Array.isArray(obj.sobre)
      ? (obj.sobre as Record<string, unknown>)
      : {};

  const diferenciais = Array.isArray(sobreRaw.diferenciais)
    ? sobreRaw.diferenciais
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        .map((d) => d.trim())
    : [];

  const contatoRaw =
    obj.contato && typeof obj.contato === 'object' && !Array.isArray(obj.contato)
      ? (obj.contato as Record<string, unknown>)
      : {};

  const galeriaUrls = Array.isArray(obj.galeriaUrls)
    ? obj.galeriaUrls
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .map((u) => u.trim())
    : [];

  const depoimentos = Array.isArray(obj.depoimentos)
    ? depoimentosNormalizados(obj.depoimentos)
    : [];

  const tipoSite: TipoSiteBlueprint =
    obj.tipoSite === 'landing_page' ? 'landing_page' : 'institucional_completo';

  const blueprint: SiteBlueprint = {
    nome,
    nicho: textoSeguro(obj.nicho, 'Serviços e Agendamentos'),
    tipoSite,
    logoUrl: textoSeguro(obj.logoUrl) || null,
    fotoCapaUrl: textoSeguro(obj.fotoCapaUrl) || null,
    corPrimaria: normalizarCorHex(obj.corPrimaria, '#88C0D0'),
    corSecundaria: normalizarCorHex(obj.corSecundaria, '#A3BE8C'),
    corFundo: normalizarCorHex(obj.corFundo, '#1E242E'),
    corTexto: normalizarCorHex(obj.corTexto, '#ECEFF4'),
    hero: {
      selo: textoSeguro(heroRaw?.selo) || undefined,
      titulo: tituloHero,
      subtitulo: textoSeguro(
        heroRaw?.subtitulo,
        'Agende seu horário online de forma rápida, segura e sem filas.'
      ),
      ctaTexto: textoSeguro(heroRaw?.ctaTexto, 'Agendar horário'),
    },
    servicos,
    sobre: {
      titulo: textoSeguro(sobreRaw.titulo, `Sobre ${nome}`),
      texto: textoSeguro(
        sobreRaw.texto,
        'Atendimento focado em qualidade, pontualidade e experiência acolhedora.'
      ),
      diferenciais,
    },
    contato: {
      horarioAtendimento: textoSeguro(
        contatoRaw.horarioAtendimento,
        'Consulte os horários disponíveis na agenda online.'
      ),
      endereco: textoSeguro(contatoRaw.endereco, 'Atendimento presencial com hora marcada.'),
      whatsapp: textoSeguro(contatoRaw.whatsapp).replace(/\D/g, ''),
      instagram: textoSeguro(contatoRaw.instagram) || undefined,
    },
    galeriaUrls,
    depoimentos,
    dominioProprio: textoSeguro(obj.dominioProprio) || null,
  };

  return { valido: true, blueprint };
}

function depoimentosNormalizados(itens: unknown[]): DepoimentoSite[] {
  return itens
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => {
      const d = item as Record<string, unknown>;
      const notaNum = Number(d.nota);
      return {
        autor: textoSeguro(d.autor, 'Cliente verificado'),
        texto: textoSeguro(d.texto),
        nota: notaNum >= 1 && notaNum <= 5 ? Math.round(notaNum) : 5,
      };
    })
    .filter((d) => Boolean(d.texto));
}
