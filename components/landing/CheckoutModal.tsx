'use client';

import React, { useState, useEffect } from 'react';

export type CheckoutTierId = 'tier_1' | 'tier_2' | 'tier_3';
export type CheckoutCycleId = 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY';

interface PlanoResumo {
  nome: string;
  MONTHLY: number;
  SEMIANNUALLY: number;
  YEARLY: number;
  mensalEquivalente: {
    MONTHLY: number;
    SEMIANNUALLY: number;
    YEARLY: number;
  };
  taxaSetup: {
    MONTHLY: number;
    SEMIANNUALLY: number;
    YEARLY: number;
  };
}

const PLANOS_CHECKOUT: Record<CheckoutTierId, PlanoResumo> = {
  tier_1: {
    nome: 'FlowAgenda Essencial',
    MONTHLY: 59.90,
    SEMIANNUALLY: 329.40,
    YEARLY: 598.80,
    mensalEquivalente: { MONTHLY: 59.90, SEMIANNUALLY: 54.90, YEARLY: 49.90 },
    taxaSetup: { MONTHLY: 99.90, SEMIANNUALLY: 49.90, YEARLY: 0 },
  },
  tier_2: {
    nome: 'FlowAgenda Profissional',
    MONTHLY: 99.90,
    SEMIANNUALLY: 539.40,
    YEARLY: 1018.80,
    mensalEquivalente: { MONTHLY: 99.90, SEMIANNUALLY: 89.90, YEARLY: 84.90 },
    taxaSetup: { MONTHLY: 149.90, SEMIANNUALLY: 74.90, YEARLY: 0 },
  },
  tier_3: {
    nome: 'FlowAgenda Autoridade',
    MONTHLY: 189.90,
    SEMIANNUALLY: 1019.40,
    YEARLY: 1918.80,
    mensalEquivalente: { MONTHLY: 189.90, SEMIANNUALLY: 169.90, YEARLY: 159.90 },
    taxaSetup: { MONTHLY: 349.90, SEMIANNUALLY: 174.90, YEARLY: 0 },
  },
};

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
}

function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTier: CheckoutTierId;
  initialCycle: CheckoutCycleId;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  initialTier,
  initialCycle,
}: CheckoutModalProps) {
  const [tier, setTier] = useState<CheckoutTierId>(initialTier);
  const [cycle, setCycle] = useState<CheckoutCycleId>(initialCycle);

  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('');
  const [slugCustomizado, setSlugCustomizado] = useState('');
  const [slugEditadoManualmente, setSlugEditadoManualmente] = useState(false);
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [businessNiche, setBusinessNiche] = useState('barbearia');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTier(initialTier);
      setCycle(initialCycle);
      setErrorMsg(null);
      setRedirectUrl(null);
    }
  }, [isOpen, initialTier, initialCycle]);

  const handleNomeEstabelecimentoChange = (val: string) => {
    setNomeEstabelecimento(val);
    if (!slugEditadoManualmente) {
      setSlugCustomizado(slugify(val));
    }
  };

  if (!isOpen) return null;

  const plano = PLANOS_CHECKOUT[tier] || PLANOS_CHECKOUT.tier_1;
  const valorRecorrente = plano[cycle];
  const valorSetup = plano.taxaSetup[cycle];
  const cycleLabel =
    cycle === 'MONTHLY'
      ? 'Mensal'
      : cycle === 'SEMIANNUALLY'
      ? 'Semestral (6 meses)'
      : 'Anual (12 meses)';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const slugFinal = slugify(slugCustomizado || nomeEstabelecimento);
    if (!slugFinal || slugFinal.length < 3) {
      setErrorMsg('Informe um nome válido para gerar o endereço do seu estabelecimento.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/checkout/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeEstabelecimento,
          slug: slugFinal,
          nomeResponsavel,
          whatsapp,
          email,
          cpfCnpj,
          businessNiche,
          tier,
          cycle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.field === 'slug') {
          const sufixo = Math.floor(10 + Math.random() * 89);
          setSlugCustomizado(`${slugFinal}-${sufixo}`);
          setSlugEditadoManualmente(true);
        }
        setErrorMsg(data.error || 'Não foi possível concluir sua assinatura.');
        return;
      }

      if (data.invoiceUrl) {
        setRedirectUrl(data.invoiceUrl);
        window.location.href = data.invoiceUrl;
      } else {
        setErrorMsg('Cadastro realizado, mas não foi possível abrir o link da fatura. Contate o suporte.');
      }
    } catch {
      setErrorMsg('Falha de conexão com o servidor. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto font-sans"
      onClick={() => !loading && onClose()}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl border border-[#3B4252] bg-[#242933] text-[#ECEFF4] shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-[#3B4252] bg-[#2E3440] px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#88C0D0]/15 px-3 py-0.5 text-xs font-bold text-[#88C0D0] border border-[#88C0D0]/30">
                {plano.nome}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#A3BE8C]/15 px-3 py-0.5 text-xs font-bold text-[#A3BE8C] border border-[#A3BE8C]/30">
                Ciclo {cycleLabel}
              </span>
            </div>
            <h3 className="mt-2 text-xl sm:text-2xl font-black text-[#ECEFF4]">
              Ativar Minha Conta FlowAgenda
            </h3>
            <p className="text-xs text-[#D8DEE9]/70 mt-0.5">
              Preencha os dados abaixo para criar seu ambiente e abrir sua fatura oficial (Pix, Cartão ou Boleto).
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 text-[#D8DEE9]/60 hover:bg-[#3B4252] hover:text-[#ECEFF4] transition cursor-pointer"
            aria-label="Fechar checkout"
          >
            ✕
          </button>
        </div>

        {redirectUrl ? (
          <div className="p-8 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C] border border-[#A3BE8C]/40">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-[#ECEFF4]">Ambiente Criado com Sucesso!</h4>
              <p className="text-xs sm:text-sm text-[#D8DEE9]/80 max-w-md mx-auto">
                Estamos redirecionando você automaticamente para a página segura de pagamento do Asaas...
              </p>
            </div>
            <div className="pt-2">
              <a
                href={redirectUrl}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#A3BE8C] px-6 py-3.5 text-sm font-black text-[#242933] hover:bg-[#A3BE8C]/90 transition shadow-lg"
              >
                <span>💳 Abrir Fatura de Pagamento Agora</span>
                <span>&rarr;</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Seletor Rápido de Ciclo dentro do Modal */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#2E3440] p-1.5 border border-[#3B4252]">
              <button
                type="button"
                onClick={() => setCycle('MONTHLY')}
                className={`rounded-xl py-2 px-2 text-xs font-bold transition cursor-pointer ${
                  cycle === 'MONTHLY'
                    ? 'bg-[#3B4252] text-[#88C0D0] border border-[#4C566A]'
                    : 'text-[#D8DEE9]/60 hover:text-[#ECEFF4]'
                }`}
              >
                Mensal ({formatBRL(plano.mensalEquivalente.MONTHLY)}/mês)
              </button>
              <button
                type="button"
                onClick={() => setCycle('SEMIANNUALLY')}
                className={`rounded-xl py-2 px-2 text-xs font-bold transition cursor-pointer ${
                  cycle === 'SEMIANNUALLY'
                    ? 'bg-[#3B4252] text-[#88C0D0] border border-[#4C566A]'
                    : 'text-[#D8DEE9]/60 hover:text-[#ECEFF4]'
                }`}
              >
                Semestral ({formatBRL(plano.mensalEquivalente.SEMIANNUALLY)}/mês)
              </button>
              <button
                type="button"
                onClick={() => setCycle('YEARLY')}
                className={`rounded-xl py-2 px-2 text-xs font-black transition cursor-pointer ${
                  cycle === 'YEARLY'
                    ? 'bg-[#88C0D0] text-[#242933] shadow-sm'
                    : 'text-[#D8DEE9]/60 hover:text-[#ECEFF4]'
                }`}
              >
                Anual (Setup Grátis)
              </button>
            </div>

            {/* Campos do Formulário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome do Estabelecimento */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
                  Nome do Estabelecimento *
                </label>
                <input
                  type="text"
                  required
                  value={nomeEstabelecimento}
                  onChange={(e) => handleNomeEstabelecimentoChange(e.target.value)}
                  placeholder="Ex: Barbearia Imperial"
                  className="w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2.5 text-sm text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>

              {/* Seu Nome */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
                  Seu Nome *
                </label>
                <input
                  type="text"
                  required
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                  placeholder="Ex: Carlos Mendes"
                  className="w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2.5 text-sm text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>

              {/* WhatsApp com DDD */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
                  WhatsApp (com DDD) *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2.5 text-sm font-mono text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
                  E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@suaempresa.com.br"
                  className="w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2.5 text-sm text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>

              {/* CPF ou CNPJ */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
                  CPF ou CNPJ *
                </label>
                <input
                  type="text"
                  required
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  className="w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2.5 text-sm font-mono text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>

              {/* Nicho do Negócio */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
                  Nicho do Negócio *
                </label>
                <select
                  value={businessNiche}
                  onChange={(e) => setBusinessNiche(e.target.value)}
                  className="w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2.5 text-sm text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                >
                  <option value="barbearia">Barbearia</option>
                  <option value="salao_beleza">Salão de Beleza</option>
                  <option value="clinica_estetica">Clínica de Estética / Spa</option>
                  <option value="dentista">Dentista / Consultório Odontológico</option>
                  <option value="pet_shop">Pet Shop / Clínica Veterinária</option>
                  <option value="tatuagem">Estúdio de Tatuagem / Piercing</option>
                </select>
              </div>

              {/* Preview e Ajuste do Subdomínio Gerado Automaticamente */}
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#88C0D0]">
                  Endereço Exclusivo de Agendamento (Gerado Automaticamente)
                </label>
                <div className="flex items-center rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 focus-within:border-[#88C0D0]">
                  <input
                    type="text"
                    required
                    value={slugCustomizado}
                    onChange={(e) => {
                      setSlugEditadoManualmente(true);
                      setSlugCustomizado(slugify(e.target.value));
                    }}
                    placeholder="seu-estabelecimento"
                    className="w-full bg-transparent py-2 text-xs sm:text-sm font-mono text-[#ECEFF4] outline-none placeholder:text-[#D8DEE9]/40"
                  />
                  <span className="text-xs font-mono text-[#88C0D0] shrink-0">
                    .flowagenda.online
                  </span>
                </div>
              </div>
            </div>

            {/* Resumo Financeiro Claro */}
            <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440]/90 p-4 text-xs space-y-2">
              <div className="flex items-center justify-between text-[#D8DEE9]/80">
                <span>
                  Plano <strong>{plano.nome}</strong> ({cycleLabel}):
                </span>
                <span className="font-mono font-bold text-[#ECEFF4]">
                  {formatBRL(valorRecorrente)}
                  {cycle === 'YEARLY' && (
                    <span className="text-[11px] text-[#A3BE8C] ml-1">
                      (equiv. {formatBRL(plano.mensalEquivalente.YEARLY)}/mês)
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#D8DEE9]/80">
                <span>Taxa de Implantação (Setup Inicial):</span>
                {cycle === 'YEARLY' ? (
                  <span className="rounded bg-[#A3BE8C]/20 px-2 py-0.5 text-[11px] font-mono font-black text-[#A3BE8C] border border-[#A3BE8C]/30">
                    R$ 0,00 [ISENTO NO ANUAL]
                  </span>
                ) : (
                  <span className="font-mono font-bold text-[#EBCB8B]">
                    + {formatBRL(valorSetup)} (taxa única)
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#3B4252] pt-2 text-sm font-black text-[#ECEFF4]">
                <span>Total na Fatura de Ativação:</span>
                <span className="font-mono text-[#A3BE8C]">
                  {formatBRL(valorRecorrente + valorSetup)}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-[#BF616A]/50 bg-[#BF616A]/15 p-3.5 text-xs font-medium text-[#ECEFF4]">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Rodapé / Botão de Finalizar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-[#3B4252]">
              <span className="text-[11px] text-[#D8DEE9]/60">
                🔒 Ambiente seguro integrado ao Asaas (Pix, Cartão ou Boleto).
              </span>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#88C0D0] px-6 py-3.5 text-xs sm:text-sm font-black text-[#242933] hover:bg-[#88C0D0]/90 disabled:opacity-50 transition shadow-lg cursor-pointer"
              >
                {loading ? (
                  <span>Gerando Fatura no Asaas...</span>
                ) : (
                  <>
                    <span>Finalizar e Ir para o Pagamento</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
