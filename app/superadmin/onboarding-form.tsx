'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTenantAction } from '@/app/actions/tenant';

type InitialAsaasAction = 'NONE' | 'MONTHLY' | 'SEMIANNUALLY' | 'YEARLY';

const PLANOS_PREVIEW: Record<
  string,
  {
    nome: string;
    MONTHLY: number;
    SEMIANNUALLY: number;
    YEARLY: number;
    taxaSetup: { MONTHLY: number; SEMIANNUALLY: number; YEARLY: number };
  }
> = {
  tier_1: {
    nome: 'Essencial',
    MONTHLY: 59.90,
    SEMIANNUALLY: 329.40,
    YEARLY: 598.80,
    taxaSetup: { MONTHLY: 99.90, SEMIANNUALLY: 49.90, YEARLY: 0 },
  },
  tier_2: {
    nome: 'Profissional',
    MONTHLY: 99.90,
    SEMIANNUALLY: 539.40,
    YEARLY: 1018.80,
    taxaSetup: { MONTHLY: 149.90, SEMIANNUALLY: 74.90, YEARLY: 0 },
  },
  tier_3_institucional: {
    nome: 'Autoridade',
    MONTHLY: 189.90,
    SEMIANNUALLY: 1019.40,
    YEARLY: 1918.80,
    taxaSetup: { MONTHLY: 349.90, SEMIANNUALLY: 174.90, YEARLY: 0 },
  },
};

function formatarCpfCnpj(value: string): string {
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

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('tier_1');
  const [cpfCnpj, setCpfCnpj] = useState<string>('');
  const [asaasAction, setAsaasAction] = useState<InitialAsaasAction>('NONE');
  const [incluirSetup, setIncluirSetup] = useState<boolean>(true);
  const [isFounder, setIsFounder] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    isError: boolean;
    invoiceUrl?: string | null;
    setupInvoiceUrl?: string | null;
    copied?: boolean;
  } | null>(null);

  const planoAtual = PLANOS_PREVIEW[selectedTier] || PLANOS_PREVIEW.tier_1;
  const showSetupCheckbox = asaasAction === 'MONTHLY' || asaasAction === 'SEMIANNUALLY';
  const valorSetupCiclo =
    asaasAction === 'MONTHLY'
      ? planoAtual.taxaSetup.MONTHLY
      : asaasAction === 'SEMIANNUALLY'
      ? planoAtual.taxaSetup.SEMIANNUALLY
      : 0;

  const handleAsaasActionChange = (newAction: InitialAsaasAction) => {
    setAsaasAction(newAction);
    if (newAction !== 'NONE') {
      setIsFounder(false);
    }
    if (newAction === 'MONTHLY' || newAction === 'SEMIANNUALLY') {
      setIncluirSetup(true);
    } else {
      setIncluirSetup(false);
    }
  };

  const handleToggleFounder = (checked: boolean) => {
    setIsFounder(checked);
    if (checked) {
      setAsaasAction('NONE');
      setIncluirSetup(false);
    }
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setFeedback(null);

    const docDigits = cpfCnpj.replace(/\D/g, '');
    if (!isFounder && asaasAction !== 'NONE' && docDigits.length < 11) {
      setFeedback({
        text: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para gerar a assinatura inicial no Asaas.',
        isError: true,
      });
      setLoading(false);
      return;
    }

    // Garante envio explícito dos estados controlados no FormData
    formData.set('cpf_cnpj', isFounder ? '' : docDigits);
    formData.set('asaas_initial_action', isFounder ? 'NONE' : asaasAction);
    formData.set('incluir_setup', !isFounder && showSetupCheckbox && incluirSetup ? 'true' : 'false');
    formData.set('is_founder', isFounder ? 'true' : 'false');

    try {
      const result = await createTenantAction(formData);
      if (result.success) {
        let copied = false;
        const links: string[] = [];
        if (result.invoiceUrl) {
          links.push(
            result.setupInvoiceUrl
              ? `Assinatura (${planoAtual.nome}): ${result.invoiceUrl}`
              : result.invoiceUrl
          );
        }
        if (result.setupInvoiceUrl) {
          links.push(`Taxa de Implantação (Setup): ${result.setupInvoiceUrl}`);
        }

        if (links.length > 0) {
          try {
            await navigator.clipboard.writeText(links.join('\n'));
            copied = true;
          } catch {
            copied = false;
          }
        }

        if (result.invoiceUrl) {
          try {
            window.open(result.invoiceUrl, '_blank', 'noopener,noreferrer');
          } catch {
            // Popup bloqueado pelo navegador: botões diretos ficam em destaque abaixo
          }
        }

        setFeedback({
          text: result.message || 'Lojista cadastrado com sucesso!',
          isError: Boolean(result.asaasWarning),
          invoiceUrl: result.invoiceUrl || null,
          setupInvoiceUrl: result.setupInvoiceUrl || null,
          copied,
        });

        router.refresh();
      } else {
        setFeedback({
          text: result.error || 'Ocorreu um erro ao cadastrar.',
          isError: true,
        });
      }
    } catch (error: any) {
      setFeedback({
        text: error.message || 'Falha de comunicação com o servidor.',
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      action={handleSubmit}
      className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border border-[#3B4252] bg-[#242933] p-6 md:p-8 text-[#ECEFF4] shadow-xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#3B4252] pb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-[#ECEFF4]">Novo Lojista</h2>
          <p className="text-xs sm:text-sm text-[#D8DEE9]/70">
            Cadastro automatizado no Supabase, Evolution API v2 e Asaas.
          </p>
        </div>
        <span className="inline-flex items-center self-start sm:self-center rounded-lg bg-[#2E3440] px-3 py-1 text-xs font-mono font-semibold text-[#88C0D0] border border-[#3B4252]">
          Gestão Centralizada
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Nome do Estabelecimento */}
        <div className="space-y-1.5">
          <label htmlFor="nome_estabelecimento" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
            Nome do Estabelecimento *
          </label>
          <input
            id="nome_estabelecimento"
            name="nome_estabelecimento"
            required
            placeholder="Ex: Barbearia do Zé"
            className="flex h-10 w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2 text-sm text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
          />
        </div>

        {/* Subdomínio (Slug) */}
        <div className="space-y-1.5">
          <label htmlFor="slug_subdominio" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
            Subdomínio (Slug) *
          </label>
          <div className="flex items-center rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 focus-within:border-[#88C0D0]">
            <input
              id="slug_subdominio"
              name="slug_subdominio"
              required
              placeholder="barbeariadoze"
              className="flex h-10 w-full bg-transparent py-2 text-sm text-[#ECEFF4] outline-none placeholder:text-[#D8DEE9]/40"
            />
            <span className="text-xs font-mono text-[#88C0D0]">.flowagenda.online</span>
          </div>
        </div>

        {/* CPF ou CNPJ (Formatado / Opcional se sem cobrança imediata, desabilitado se is_founder) */}
        <div className="space-y-1.5">
          <label htmlFor="cpf_cnpj" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
            CPF ou CNPJ (Asaas){' '}
            <span className="text-[#D8DEE9]/50 font-normal normal-case">
              {isFounder
                ? '(Isento p/ Fundador)'
                : asaasAction === 'NONE'
                ? '(Opcional)'
                : '(Obrigatório p/ assinatura)'}
            </span>
          </label>
          <input
            id="cpf_cnpj"
            name="cpf_cnpj"
            value={isFounder ? '' : cpfCnpj}
            disabled={isFounder}
            onChange={(e) => setCpfCnpj(formatarCpfCnpj(e.target.value))}
            required={!isFounder && asaasAction !== 'NONE'}
            placeholder={isFounder ? 'Desabilitado (Membro Fundador)' : '000.000.000-00 ou 00.000.000/0001-00'}
            className="flex h-10 w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2 text-sm font-mono text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* WhatsApp do Lojista */}
        <div className="space-y-1.5">
          <label htmlFor="whatsapp_notificacao" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
            WhatsApp do Lojista
          </label>
          <input
            id="whatsapp_notificacao"
            name="whatsapp_notificacao"
            placeholder="5511999999999"
            className="flex h-10 w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2 text-sm font-mono text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
          />
        </div>

        {/* Nicho do Negócio */}
        <div className="space-y-1.5">
          <label htmlFor="business_niche" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
            Nicho do Negócio (Dicionário CRM & IA)
          </label>
          <select
            id="business_niche"
            name="business_niche"
            defaultValue="barbearia"
            className="flex h-10 w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2 text-sm text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
          >
            <option value="barbearia">Barbearia (barbearia)</option>
            <option value="salao_beleza">Salão de Beleza (salao_beleza)</option>
            <option value="clinica_estetica">Clínica de Estética / Spa (clinica_estetica)</option>
            <option value="dentista">Dentista / Odontologia (dentista)</option>
            <option value="pet_shop">Pet Shop / Veterinária (pet_shop)</option>
            <option value="psicologia">Psicologia / Terapia (psicologia)</option>
            <option value="tatuagem">Estúdio de Tatuagem / Piercing (tatuagem)</option>
          </select>
        </div>

        {/* Ticket Médio Padrão */}
        <div className="space-y-1.5">
          <label htmlFor="ticket_medio_padrao" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
            Ticket Médio Padrão (R$)
          </label>
          <input
            id="ticket_medio_padrao"
            name="ticket_medio_padrao"
            type="number"
            step="0.01"
            min="1"
            defaultValue="65.00"
            placeholder="65.00"
            className="flex h-10 w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2 text-sm font-mono text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
          />
        </div>

        {/* Plano (Tier) */}
        <div className="space-y-1.5">
          <label htmlFor="tier" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
            Plano (Tier) *
          </label>
          <select
            id="tier"
            name="tier"
            required
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2 text-sm text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
          >
            <option value="tier_1">Tier 1 — Essencial (R$ 49,90 a R$ 59,90/mês)</option>
            <option value="tier_2">Tier 2 — Profissional (R$ 84,90 a R$ 99,90/mês)</option>
            <option value="tier_3_institucional">Tier 3 — Autoridade (R$ 159,90 a R$ 189,90/mês)</option>
          </select>
        </div>

        {/* Tipo de Site */}
        <div className="space-y-1.5">
          <label htmlFor="tipo_site" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
            Tipo de Site *
          </label>
          <select
            id="tipo_site"
            name="tipo_site"
            required
            className="flex h-10 w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2 text-sm text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
          >
            <option value="landing_page">Landing Page (Compacta)</option>
            <option value="institucional_completo">Site Institucional Completo</option>
          </select>
        </div>

        {/* Domínio Próprio */}
        <div className="space-y-1.5">
          <label htmlFor="dominio_proprio" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
            Domínio Próprio <span className="text-[#D8DEE9]/50 font-normal normal-case">(Opcional)</span>
          </label>
          <input
            id="dominio_proprio"
            name="dominio_proprio"
            placeholder="Ex: barbeariadoze.com.br"
            className="flex h-10 w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2 text-sm text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
          />
        </div>

        {/* Link Avaliação Google Meu Negócio */}
        <div className="space-y-1.5">
          <label htmlFor="google_review_url" className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
            Link Avaliação Google Meu Negócio <span className="text-[#D8DEE9]/50 font-normal normal-case">(Opcional)</span>
          </label>
          <input
            id="google_review_url"
            name="google_review_url"
            placeholder="https://g.page/r/.../review"
            className="flex h-10 w-full rounded-xl border border-[#3B4252] bg-[#2E3440] px-3.5 py-2 text-sm text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
          />
        </div>

        {/* Seção: Ação de Cobrança Inicial (Asaas) */}
        <div
          className={`space-y-3 md:col-span-2 rounded-xl border border-[#3B4252] bg-[#2E3440] p-4 transition-opacity ${
            isFounder ? 'opacity-60' : ''
          }`}
        >
          <div className="space-y-1.5">
            <label htmlFor="asaas_initial_action" className="block text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
              💳 Ação de Cobrança Inicial (Asaas)
            </label>
            <select
              id="asaas_initial_action"
              name="asaas_initial_action"
              value={isFounder ? 'NONE' : asaasAction}
              disabled={isFounder}
              onChange={(e) => handleAsaasActionChange(e.target.value as InitialAsaasAction)}
              className="flex h-10 w-full rounded-xl border border-[#3B4252] bg-[#242933] px-3.5 py-2 text-sm font-medium text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="NONE">
                Apenas cadastrar cliente (sem cobrança agora)
              </option>
              <option value="MONTHLY">
                Gerar Assinatura Mensal — {formatBRL(planoAtual.MONTHLY)}/mês
              </option>
              <option value="SEMIANNUALLY">
                Gerar Assinatura Semestral — {formatBRL(planoAtual.SEMIANNUALLY)}/semestre
              </option>
              <option value="YEARLY">
                Gerar Assinatura Anual — {formatBRL(planoAtual.YEARLY)}/ano (Setup 100% Grátis)
              </option>
            </select>
          </div>

          {!isFounder && showSetupCheckbox && (
            <label className="flex items-center justify-between gap-3 rounded-lg border border-[#3B4252] bg-[#242933] px-3.5 py-2.5 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  name="incluir_setup"
                  checked={incluirSetup}
                  onChange={(e) => setIncluirSetup(e.target.checked)}
                  className="h-4 w-4 rounded border-[#4C566A] bg-[#2E3440] text-[#88C0D0] focus:ring-[#88C0D0]"
                />
                <span className="text-xs font-semibold text-[#ECEFF4]">
                  Incluir Taxa de Implantação (Setup) avulsa no vencimento de hoje
                </span>
              </div>
              <span className="rounded bg-[#EBCB8B]/20 px-2 py-0.5 text-xs font-mono font-bold text-[#EBCB8B]">
                + {formatBRL(valorSetupCiclo)}
              </span>
            </label>
          )}

          {!isFounder && asaasAction === 'YEARLY' && (
            <div className="flex items-center justify-between rounded-lg border border-[#A3BE8C]/30 bg-[#A3BE8C]/10 px-3.5 py-2 text-xs text-[#A3BE8C]">
              <span>✓ Ciclo Anual selecionado: Taxa de Implantação (Setup) isenta automaticamente.</span>
              <span className="font-mono font-bold">R$ 0,00</span>
            </div>
          )}

          <p className="text-[11px] text-[#D8DEE9]/60">
            {isFounder
              ? 'Modo Membro Fundador ativo: cobrança inicial desabilitada e conta criada com status_pagamento = "ativo".'
              : asaasAction === 'NONE'
              ? 'A conta será criada com status_pagamento = "pendente". Se o CPF/CNPJ for preenchido, o cliente já será vinculado no Asaas sem cobrança imediata.'
              : 'Ao concluir o cadastro, a assinatura será gerada no Asaas (status_pagamento = "pendente") e o link da fatura será copiado automaticamente.'}
          </p>
        </div>

        {/* Configuração IA & Membro Fundador */}
        <div className="space-y-2 md:col-span-2 rounded-xl border border-[#3B4252] bg-[#2E3440] p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#ECEFF4] cursor-pointer">
                <input
                  type="checkbox"
                  name="use_ai_agent"
                  defaultChecked={true}
                  className="h-4 w-4 rounded border-[#4C566A] bg-[#242933] text-[#88C0D0] focus:ring-[#88C0D0]"
                />
                <span>Ativar Secretária IA (DeepSeek)</span>
              </label>

              <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#ECEFF4] cursor-pointer">
                <input
                  type="checkbox"
                  name="is_founder"
                  checked={isFounder}
                  onChange={(e) => handleToggleFounder(e.target.checked)}
                  className="h-4 w-4 rounded border-[#4C566A] bg-[#242933] text-[#88C0D0] focus:ring-[#88C0D0]"
                />
                <span>Membro Fundador (is_founder - acesso vitalício/isento)</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="ai_credits" className="text-xs font-semibold text-[#D8DEE9]/80 whitespace-nowrap">
                Franquia Inicial IA:
              </label>
              <input
                id="ai_credits"
                name="ai_credits"
                type="number"
                defaultValue={200}
                min={0}
                className="h-8 w-24 rounded-lg border border-[#3B4252] bg-[#242933] px-2.5 py-1 text-xs font-mono text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[11px] text-[#D8DEE9]/60 mt-1.5">
            Provisiona automaticamente a instância <code className="font-mono text-[#88C0D0]">flowagenda_[slug]</code> na Evolution API v2 com Webhook configurado.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 focus:outline-none disabled:pointer-events-none disabled:opacity-50 shadow-md cursor-pointer"
      >
        {loading
          ? 'Cadastrando e Sincronizando...'
          : asaasAction === 'NONE'
          ? 'Cadastrar Lojista'
          : 'Cadastrar Lojista & Gerar Assinatura Asaas'}
      </button>

      {feedback && (
        <div
          className={`mt-4 rounded-2xl p-5 text-xs sm:text-sm border space-y-4 shadow-lg ${
            feedback.isError
              ? 'bg-[#BF616A]/15 text-[#ECEFF4] border-[#BF616A]/50'
              : 'bg-[#2E3440] text-[#ECEFF4] border-[#A3BE8C]/60'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="font-bold text-sm text-[#ECEFF4]">
              {feedback.isError ? '⚠️ ' : '✓ '}
              {feedback.text}
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs text-[#D8DEE9]/60 hover:text-[#ECEFF4] cursor-pointer"
              aria-label="Fechar aviso"
            >
              ✕
            </button>
          </div>

          {feedback.copied && (
            <p className="text-xs text-[#A3BE8C] font-medium">
              📋 Link da fatura copiado automaticamente para a área de transferência!
            </p>
          )}

          {feedback.invoiceUrl && (
            <div className="rounded-xl border border-[#3B4252] bg-[#242933] p-4 space-y-3">
              <span className="block text-xs font-bold text-[#88C0D0]">
                Fatura da Assinatura Pronta para Pagamento:
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={feedback.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#A3BE8C] px-4 py-2.5 text-xs font-black text-[#242933] hover:bg-[#A3BE8C]/90 transition shadow-sm"
                >
                  <span>💳 Abrir Fatura / Checkout Agora</span>
                  <span>↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(feedback.invoiceUrl!)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#4C566A] bg-[#3B4252] px-4 py-2.5 text-xs font-semibold text-[#ECEFF4] hover:bg-[#434C5E] transition cursor-pointer"
                >
                  Copiar Link da Fatura
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={feedback.invoiceUrl}
                className="w-full rounded-lg border border-[#3B4252] bg-[#2E3440] px-3 py-1.5 text-[11px] font-mono text-[#D8DEE9]/80"
              />
            </div>
          )}

          {feedback.setupInvoiceUrl && (
            <div className="rounded-xl border border-[#3B4252] bg-[#242933] p-4 space-y-3">
              <span className="block text-xs font-bold text-[#EBCB8B]">
                Fatura da Taxa de Implantação (Setup):
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={feedback.setupInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#EBCB8B] px-4 py-2 text-xs font-black text-[#242933] hover:bg-[#EBCB8B]/90 transition"
                >
                  <span>Abrir Fatura Setup Agora ↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(feedback.setupInvoiceUrl!)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#4C566A] bg-[#3B4252] px-4 py-2 text-xs font-semibold text-[#ECEFF4] hover:bg-[#434C5E] transition cursor-pointer"
                >
                  Copiar Link Setup
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
