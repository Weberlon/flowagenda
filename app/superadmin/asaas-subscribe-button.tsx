'use client';

import { useState } from 'react';

type AsaasCycle = 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY';

interface PlanoModalConfig {
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

// Sincronizado 100% com components/landing/PricingTiers.tsx e /api/admin/asaas/subscribe
const PLANOS_MODAL_CONFIG: Record<string, PlanoModalConfig> = {
  tier_1: {
    nome: 'FlowAgenda Essencial',
    MONTHLY: 59.90,
    SEMIANNUALLY: 329.40,
    YEARLY: 598.80,
    mensalEquivalente: {
      MONTHLY: 59.90,
      SEMIANNUALLY: 54.90,
      YEARLY: 49.90,
    },
    taxaSetup: {
      MONTHLY: 99.90,
      SEMIANNUALLY: 49.90,
      YEARLY: 0,
    },
  },
  tier_2: {
    nome: 'FlowAgenda Profissional',
    MONTHLY: 99.90,
    SEMIANNUALLY: 539.40,
    YEARLY: 1018.80,
    mensalEquivalente: {
      MONTHLY: 99.90,
      SEMIANNUALLY: 89.90,
      YEARLY: 84.90,
    },
    taxaSetup: {
      MONTHLY: 149.90,
      SEMIANNUALLY: 74.90,
      YEARLY: 0,
    },
  },
  tier_3: {
    nome: 'FlowAgenda Autoridade',
    MONTHLY: 189.90,
    SEMIANNUALLY: 1019.40,
    YEARLY: 1918.80,
    mensalEquivalente: {
      MONTHLY: 189.90,
      SEMIANNUALLY: 169.90,
      YEARLY: 159.90,
    },
    taxaSetup: {
      MONTHLY: 349.90,
      SEMIANNUALLY: 174.90,
      YEARLY: 0,
    },
  },
  tier_3_institucional: {
    nome: 'FlowAgenda Autoridade',
    MONTHLY: 189.90,
    SEMIANNUALLY: 1019.40,
    YEARLY: 1918.80,
    mensalEquivalente: {
      MONTHLY: 189.90,
      SEMIANNUALLY: 169.90,
      YEARLY: 159.90,
    },
    taxaSetup: {
      MONTHLY: 349.90,
      SEMIANNUALLY: 174.90,
      YEARLY: 0,
    },
  },
};

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

interface AsaasSubscribeButtonProps {
  lojista: any;
}

export function AsaasSubscribeButton({ lojista }: AsaasSubscribeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cycle, setCycle] = useState<AsaasCycle>('YEARLY');
  const [incluirSetup, setIncluirSetup] = useState<boolean>(false);
  const [cpfCnpj, setCpfCnpj] = useState<string>(lojista?.cpf_cnpj || '');
  const [loadingSubId, setLoadingSubId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showNewChargeForm, setShowNewChargeForm] = useState<boolean>(false);
  const [loadingExistingInvoice, setLoadingExistingInvoice] = useState<boolean>(false);
  const [existingInvoiceUrl, setExistingInvoiceUrl] = useState<string | null>(null);
  const [copiedExisting, setCopiedExisting] = useState<boolean>(false);
  const [resultData, setResultData] = useState<{
    invoiceUrl: string | null;
    setupInvoiceUrl: string | null;
    copied: boolean;
  } | null>(null);

  const tierKey = lojista?.tier || 'tier_1';
  const plano = PLANOS_MODAL_CONFIG[tierKey] || PLANOS_MODAL_CONFIG.tier_1;
  const hasExistingSubscription = Boolean(lojista?.asaas_subscription_id);

  const hasValidCustomerId = Boolean(
    lojista?.asaas_customer_id &&
      !String(lojista.asaas_customer_id).startsWith('cus_mock_')
  );

  const handleOpenModal = async () => {
    setErrorMsg(null);
    setResultData(null);
    setCycle('YEARLY');
    setIncluirSetup(false);
    setCpfCnpj(lojista?.cpf_cnpj || '');
    setCopiedExisting(false);
    setExistingInvoiceUrl(null);
    setShowNewChargeForm(!hasExistingSubscription);
    setIsOpen(true);

    if (hasExistingSubscription) {
      setLoadingExistingInvoice(true);
      try {
        const params = new URLSearchParams();
        if (lojista.asaas_subscription_id) {
          params.set('subscriptionId', lojista.asaas_subscription_id);
        }
        if (hasValidCustomerId) {
          params.set('customerId', lojista.asaas_customer_id);
        }
        const res = await fetch(`/api/admin/asaas/subscribe?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.invoiceUrl) {
          setExistingInvoiceUrl(data.invoiceUrl);
        }
      } catch {
        // Mantém fallback sem bloquear o modal
      } finally {
        setLoadingExistingInvoice(false);
      }
    }
  };

  const handleSelectCycle = (newCycle: AsaasCycle) => {
    setCycle(newCycle);
    if (newCycle === 'YEARLY') {
      setIncluirSetup(false);
    } else {
      setIncluirSetup(true);
    }
  };

  const valorAssinaturaAtual = plano[cycle];
  const valorSetupCiclo = plano.taxaSetup[cycle];
  const valorSetupAplicado = cycle !== 'YEARLY' && incluirSetup ? valorSetupCiclo : 0;
  const totalPrimeiroVencimento = valorAssinaturaAtual + valorSetupAplicado;

  async function handleSubmitAssinatura(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const docLimpo = cpfCnpj.replace(/\D/g, '');
    if (!hasValidCustomerId && docLimpo.length < 11) {
      setErrorMsg('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para cadastrar o cliente no Asaas.');
      return;
    }

    setLoadingSubId(lojista.id);
    try {
      const res = await fetch('/api/admin/asaas/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lojistaId: lojista.id,
          cycle,
          cpfCnpj: docLimpo || undefined,
          incluirSetup: cycle !== 'YEARLY' ? incluirSetup : false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao gerar cobrança no Asaas.');
        return;
      }

      const linksToCopy: string[] = [];
      if (data.invoiceUrl) {
        linksToCopy.push(
          data.setupInvoiceUrl
            ? `Assinatura (${plano.nome}): ${data.invoiceUrl}`
            : data.invoiceUrl
        );
      }
      if (data.setupInvoiceUrl) {
        linksToCopy.push(`Taxa de Implantação (Setup): ${data.setupInvoiceUrl}`);
      }

      const clipboardText = linksToCopy.join('\n');
      let copiedOk = false;
      if (clipboardText) {
        try {
          await navigator.clipboard.writeText(clipboardText);
          copiedOk = true;
        } catch {
          copiedOk = false;
        }
      }

      setResultData({
        invoiceUrl: data.invoiceUrl || null,
        setupInvoiceUrl: data.setupInvoiceUrl || null,
        copied: copiedOk,
      });
    } catch {
      setErrorMsg('Falha de comunicação com o servidor ao gerar assinatura.');
    } finally {
      setLoadingSubId(null);
    }
  }

  const handleCloseAndReload = () => {
    setIsOpen(false);
    if (resultData) {
      window.location.reload();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={loadingSubId === lojista.id}
        title={
          hasExistingSubscription
            ? 'Ver fatura existente ou gerar nova assinatura no Asaas'
            : 'Gerar Assinatura e Copiar Link de Pagamento'
        }
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition cursor-pointer ${
          hasExistingSubscription
            ? 'bg-slate-700 hover:bg-slate-600'
            : 'bg-emerald-600 hover:bg-emerald-500'
        }`}
      >
        {loadingSubId === lojista.id
          ? 'Gerando...'
          : hasExistingSubscription
          ? 'Ver / Nova Cobrança'
          : 'Gerar Cobrança'}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 text-left whitespace-normal font-sans"
          onClick={() => !loadingSubId && handleCloseAndReload()}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[#3B4252] bg-[#242933] text-[#ECEFF4] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-start justify-between gap-4 border-b border-[#3B4252] bg-[#2E3440] px-6 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-[#88C0D0]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#88C0D0] border border-[#88C0D0]/30">
                    {plano.nome} ({tierKey})
                  </span>
                  {lojista.asaas_subscription_id && (
                    <span className="inline-flex items-center rounded-md bg-[#A3BE8C]/15 px-2 py-0.5 text-[10px] font-mono text-[#A3BE8C] border border-[#A3BE8C]/30">
                      Assinatura: {lojista.asaas_subscription_id}
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 text-lg font-bold text-[#ECEFF4]">
                  {hasExistingSubscription ? 'Cobrança Asaas' : 'Gerar Assinatura Asaas'} — {lojista.nome_estabelecimento}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseAndReload}
                disabled={loadingSubId === lojista.id}
                className="rounded-lg p-1.5 text-[#D8DEE9]/60 hover:bg-[#3B4252] hover:text-[#ECEFF4] transition cursor-pointer"
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            {resultData ? (
              <div className="p-6 space-y-5">
                <div className="rounded-xl border border-[#A3BE8C]/40 bg-[#A3BE8C]/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#A3BE8C]">
                    <span>✓ Assinatura gerada com sucesso no Asaas!</span>
                  </div>
                  <p className="text-xs text-[#D8DEE9]/90">
                    {resultData.copied
                      ? 'O(s) link(s) de pagamento já foram copiados automaticamente para sua área de transferência.'
                      : 'Copie ou abra abaixo o(s) link(s) de pagamento para enviar ao lojista:'}
                  </p>
                </div>

                {resultData.invoiceUrl && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#88C0D0]">
                      Fatura da Assinatura ({formatBRL(valorAssinaturaAtual)}):
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={resultData.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3BE8C] px-4 py-2 text-xs font-black text-[#242933] hover:bg-[#A3BE8C]/90 transition"
                      >
                        Abrir Fatura Agora ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(resultData.invoiceUrl!)}
                        className="rounded-xl bg-[#3B4252] px-4 py-2 text-xs font-semibold text-[#ECEFF4] hover:bg-[#4C566A] transition cursor-pointer"
                      >
                        Copiar Link
                      </button>
                    </div>
                  </div>
                )}

                {resultData.setupInvoiceUrl && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#EBCB8B]">
                      Fatura da Taxa de Implantação / Setup ({formatBRL(valorSetupAplicado)}):
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={resultData.setupInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#EBCB8B] px-4 py-2 text-xs font-black text-[#242933] hover:bg-[#EBCB8B]/90 transition"
                      >
                        Abrir Fatura Setup ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(resultData.setupInvoiceUrl!)}
                        className="rounded-xl bg-[#3B4252] px-4 py-2 text-xs font-semibold text-[#ECEFF4] hover:bg-[#4C566A] transition cursor-pointer"
                      >
                        Copiar Link Setup
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-[#3B4252]">
                  <button
                    type="button"
                    onClick={handleCloseAndReload}
                    className="rounded-xl bg-[#88C0D0] px-5 py-2.5 text-xs font-black text-[#242933] hover:bg-[#88C0D0]/90 transition cursor-pointer"
                  >
                    Concluir e Atualizar Painel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Aviso de Assinatura Já Existente (Evita Cobranças Duplicadas) */}
                {hasExistingSubscription && (
                  <div className="rounded-xl border border-[#EBCB8B]/40 bg-[#EBCB8B]/10 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base leading-none">⚠️</span>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#EBCB8B]">
                          Este estabelecimento já possui uma assinatura vinculada ({lojista.asaas_subscription_id})
                        </p>
                        <p className="text-[11px] text-[#D8DEE9]/80">
                          Status atual: <strong className="uppercase">{lojista.status_pagamento || 'pendente'}</strong>. Para evitar cobranças duplicadas, utilize a fatura existente ou expanda abaixo apenas se desejar trocar o plano.
                        </p>
                      </div>
                    </div>

                    {loadingExistingInvoice ? (
                      <p className="text-xs text-[#88C0D0] font-mono">
                        Consultando link da fatura existente no Asaas...
                      </p>
                    ) : existingInvoiceUrl ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <a
                          href={existingInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3BE8C] px-4 py-2 text-xs font-black text-[#242933] hover:bg-[#A3BE8C]/90 transition shadow-sm"
                        >
                          💳 Abrir Fatura Existente ↗
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(existingInvoiceUrl);
                            setCopiedExisting(true);
                            setTimeout(() => setCopiedExisting(false), 2500);
                          }}
                          className="rounded-xl border border-[#4C566A] bg-[#3B4252] px-4 py-2 text-xs font-semibold text-[#ECEFF4] hover:bg-[#434C5E] transition cursor-pointer"
                        >
                          {copiedExisting ? '✓ Link Copiado!' : 'Copiar Link da Fatura'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#D8DEE9]/60">
                        Nenhuma fatura pendente encontrada para esta assinatura no momento.
                      </p>
                    )}

                    {!showNewChargeForm && (
                      <div className="pt-2 border-t border-[#EBCB8B]/20">
                        <button
                          type="button"
                          onClick={() => setShowNewChargeForm(true)}
                          className="text-xs font-bold text-[#88C0D0] hover:underline cursor-pointer"
                        >
                          Trocar Plano / Gerar Nova Cobrança ▾
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {showNewChargeForm && (
                  <form onSubmit={handleSubmitAssinatura} className="space-y-5">
                    {/* 1. Seletor Visual de Periodicidade (Mensal, Semestral, Anual) */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#D8DEE9]/80">
                        Periodicidade da Nova Assinatura
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectCycle('MONTHLY')}
                          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                            cycle === 'MONTHLY'
                              ? 'border-[#88C0D0] bg-[#2E3440] ring-1 ring-[#88C0D0] shadow-md'
                              : 'border-[#3B4252] bg-[#2E3440]/50 hover:border-[#4C566A]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#ECEFF4]">Mensal</span>
                              {cycle === 'MONTHLY' && (
                                <span className="h-2 w-2 rounded-full bg-[#88C0D0]" />
                              )}
                            </div>
                            <p className="mt-2 text-lg font-black text-[#ECEFF4]">
                              {formatBRL(plano.MONTHLY)}
                            </p>
                            <p className="text-[11px] text-[#D8DEE9]/60">cobrado todo mês</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-[#3B4252] text-[10px] font-mono text-[#EBCB8B]">
                            Setup: {formatBRL(plano.taxaSetup.MONTHLY)}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectCycle('SEMIANNUALLY')}
                          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                            cycle === 'SEMIANNUALLY'
                              ? 'border-[#88C0D0] bg-[#2E3440] ring-1 ring-[#88C0D0] shadow-md'
                              : 'border-[#3B4252] bg-[#2E3440]/50 hover:border-[#4C566A]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#ECEFF4]">Semestral</span>
                              <span className="rounded bg-[#88C0D0]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#88C0D0]">
                                50% OFF Setup
                              </span>
                            </div>
                            <p className="mt-2 text-lg font-black text-[#ECEFF4]">
                              {formatBRL(plano.SEMIANNUALLY)}
                            </p>
                            <p className="text-[11px] text-[#D8DEE9]/60">
                              equiv. {formatBRL(plano.mensalEquivalente.SEMIANNUALLY)}/mês
                            </p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-[#3B4252] text-[10px] font-mono text-[#EBCB8B]">
                            Setup: {formatBRL(plano.taxaSetup.SEMIANNUALLY)}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectCycle('YEARLY')}
                          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                            cycle === 'YEARLY'
                              ? 'border-[#A3BE8C] bg-[#2E3440] ring-1 ring-[#A3BE8C] shadow-md'
                              : 'border-[#3B4252] bg-[#2E3440]/50 hover:border-[#4C566A]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#ECEFF4]">Anual</span>
                              <span className="rounded bg-[#A3BE8C]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#A3BE8C]">
                                2 Meses OFF
                              </span>
                            </div>
                            <p className="mt-2 text-lg font-black text-[#ECEFF4]">
                              {formatBRL(plano.YEARLY)}
                            </p>
                            <p className="text-[11px] text-[#D8DEE9]/60">
                              equiv. {formatBRL(plano.mensalEquivalente.YEARLY)}/mês
                            </p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-[#3B4252] text-[10px] font-mono font-bold text-[#A3BE8C]">
                            Setup: GRÁTIS (R$ 0,00)
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* 2. Checkbox Taxa de Implantação (Setup) */}
                    <div className="rounded-xl border border-[#3B4252] bg-[#2E3440] p-4">
                      <label
                        className={`flex items-start justify-between gap-3 ${
                          cycle === 'YEARLY' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={cycle === 'YEARLY' ? false : incluirSetup}
                            disabled={cycle === 'YEARLY'}
                            onChange={(e) => setIncluirSetup(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-[#4C566A] bg-[#242933] text-[#88C0D0] focus:ring-[#88C0D0] disabled:opacity-40"
                          />
                          <div>
                            <span className="block text-xs font-bold text-[#ECEFF4]">
                              Incluir Taxa de Implantação (Setup)
                            </span>
                            <span className="block text-[11px] text-[#D8DEE9]/70 mt-0.5">
                              {cycle === 'YEARLY'
                                ? 'Isento automaticamente no ciclo Anual (Setup 100% Grátis).'
                                : 'Gera uma cobrança avulsa adicional referente à configuração inicial da conta.'}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-mono font-bold ${
                            cycle === 'YEARLY'
                              ? 'bg-[#A3BE8C]/20 text-[#A3BE8C]'
                              : incluirSetup
                              ? 'bg-[#EBCB8B]/20 text-[#EBCB8B]'
                              : 'bg-[#3B4252] text-[#D8DEE9]/50 line-through'
                          }`}
                        >
                          {cycle === 'YEARLY' ? 'ISENTO' : formatBRL(valorSetupCiclo)}
                        </span>
                      </label>
                    </div>

                    {/* 3. Campo de CPF ou CNPJ (se ainda não possuir asaas_customer_id válido) */}
                    {!hasValidCustomerId && (
                      <div className="space-y-1.5">
                        <label htmlFor="cpf_cnpj_modal" className="block text-xs font-bold text-[#ECEFF4]">
                          CPF ou CNPJ do Lojista <span className="text-[#BF616A]">*</span>
                        </label>
                        <input
                          id="cpf_cnpj_modal"
                          type="text"
                          required
                          value={cpfCnpj}
                          onChange={(e) => setCpfCnpj(e.target.value)}
                          placeholder="Ex: 000.000.000-00 ou 00.000.000/0001-00"
                          className="w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2.5 text-xs text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                        />
                        <p className="text-[11px] text-[#D8DEE9]/60">
                          Necessário para criar o cadastro do cliente no Asaas pela primeira vez.
                        </p>
                      </div>
                    )}

                    {/* Resumo Financeiro */}
                    <div className="rounded-xl border border-[#3B4252] bg-[#242933]/80 p-3.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[#D8DEE9]/80">
                        <span>Assinatura ({cycle === 'MONTHLY' ? 'Mensal' : cycle === 'SEMIANNUALLY' ? 'Semestral' : 'Anual'}):</span>
                        <span className="font-mono font-semibold text-[#ECEFF4]">{formatBRL(valorAssinaturaAtual)}</span>
                      </div>
                      {valorSetupAplicado > 0 && (
                        <div className="flex items-center justify-between text-[#EBCB8B]">
                          <span>Taxa de Implantação (Cobrança Única):</span>
                          <span className="font-mono font-semibold">+ {formatBRL(valorSetupAplicado)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-[#3B4252] pt-1.5 font-bold text-[#ECEFF4]">
                        <span>Total no 1º Vencimento (Hoje):</span>
                        <span className="font-mono text-sm text-[#A3BE8C]">{formatBRL(totalPrimeiroVencimento)}</span>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="rounded-xl border border-[#BF616A]/50 bg-[#BF616A]/15 p-3 text-xs font-medium text-[#ECEFF4]">
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    {/* Rodapé / Botões */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#3B4252]">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        disabled={loadingSubId === lojista.id}
                        className="rounded-xl border border-[#3B4252] bg-[#2E3440] px-4 py-2.5 text-xs font-semibold text-[#D8DEE9] hover:bg-[#3B4252] transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loadingSubId === lojista.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-md cursor-pointer"
                      >
                        {loadingSubId === lojista.id
                          ? 'Gerando no Asaas...'
                          : 'Gerar Assinatura e Copiar Link'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
