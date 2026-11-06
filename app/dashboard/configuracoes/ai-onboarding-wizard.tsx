'use client';

import { useState, useTransition } from 'react';
import { saveAiOnboardingSetupAction } from '@/app/actions/configuracoes';

interface AiOnboardingWizardProps {
  lojistaId: string;
  nomeEstabelecimento: string;
  initialBusinessNiche?: string | null;
  initialUseAiAgent?: boolean | null;
  initialKnowledgeBase?: string | null;
  initialAiCredits?: number | null;
  initialOnboardingConfig?: {
    business_niche?: string;
    tone_of_voice?: string;
    horario_funcionamento?: string;
    tolerancia_atraso?: string;
    regras_cancelamento?: string;
    formas_pagamento?: string;
    exige_sinal?: boolean;
    detalhes_sinal?: string;
    instrucoes_adicionais?: string;
  } | null;
}

const NICHOS_DISPONIVEIS = [
  { id: 'Barbearia', label: 'Barbearia', icon: '💈', desc: 'Cortes, barba terapia e estética masculina' },
  { id: 'Clínica / Dentista', label: 'Clínica / Dentista', icon: '🦷', desc: 'Consultório odontológico e saúde' },
  { id: 'Salão de Beleza', label: 'Salão de Beleza', icon: '💇‍♀️', desc: 'Cabelo, manicure, maquiagem e químicas' },
  { id: 'Estética & Spa', label: 'Estética & Spa', icon: '✨', desc: 'Procedimentos faciais, corporais e laser' },
  { id: 'Oficina / Estética Automotiva', label: 'Oficina / Automotivo', icon: '🚗', desc: 'Revisão, lavagem detalhada e polimento' },
  { id: 'Outro Serviço Local', label: 'Outro Serviço', icon: '🏢', desc: 'Atendimento geral com hora marcada' },
];

const TONS_DE_VOZ = [
  {
    id: 'Amigável, acolhedor e descontraído',
    label: 'Amigável e Descontraído',
    desc: 'Próximo e simpático, usa emojis com moderação e cria conexão rápida.',
  },
  {
    id: 'Formal, clínico e direto ao ponto',
    label: 'Formal e Direto',
    desc: 'Postura executiva/clínica, linguagem polida, foco em precisão e agilidade.',
  },
  {
    id: 'Consultivo e especialista premium',
    label: 'Consultivo Premium',
    desc: 'Valoriza os diferenciais do espaço, transmite exclusividade e segurança.',
  },
];

export function AiOnboardingWizard({
  lojistaId,
  nomeEstabelecimento,
  initialBusinessNiche,
  initialUseAiAgent,
  initialKnowledgeBase,
  initialAiCredits,
  initialOnboardingConfig,
}: AiOnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();

  // Estado dos campos do Wizard
  const [businessNiche, setBusinessNiche] = useState<string>(
    initialBusinessNiche || initialOnboardingConfig?.business_niche || 'Barbearia'
  );
  const [toneOfVoice, setToneOfVoice] = useState<string>(
    initialOnboardingConfig?.tone_of_voice || TONS_DE_VOZ[0].id
  );
  const [horarioFuncionamento, setHorarioFuncionamento] = useState<string>(
    initialOnboardingConfig?.horario_funcionamento || 'Segunda a Sábado, das 09h às 19h'
  );
  const [toleranciaAtraso, setToleranciaAtraso] = useState<string>(
    initialOnboardingConfig?.tolerancia_atraso || '15 minutos de tolerância máxima'
  );
  const [regrasCancelamento, setRegrasCancelamento] = useState<string>(
    initialOnboardingConfig?.regras_cancelamento ||
      'Cancelamentos ou reagendamentos devem ser avisados com no mínimo 2 horas de antecedência.'
  );
  const [formasPagamento, setFormasPagamento] = useState<string>(
    initialOnboardingConfig?.formas_pagamento || 'Pix, Cartão de Crédito, Cartão de Débito e Dinheiro'
  );
  const [exigeSinal, setExigeSinal] = useState<boolean>(
    initialOnboardingConfig?.exige_sinal ?? false
  );
  const [detalhesSinal, setDetalhesSinal] = useState<string>(
    initialOnboardingConfig?.detalhes_sinal || 'Sinal de 30% via Pix para travar horários de procedimentos longos.'
  );
  const [instrucoesAdicionais, setInstrucoesAdicionais] = useState<string>(
    initialOnboardingConfig?.instrucoes_adicionais ||
      'Temos estacionamento conveniado no local, ambiente climatizado e Wi-Fi gratuito para clientes.'
  );
  const [useAiAgent, setUseAiAgent] = useState<boolean>(Boolean(initialUseAiAgent));

  // Modo de edição manual do Markdown (opcional no Passo 3)
  const [modoEdicaoManual, setModoEdicaoManual] = useState<boolean>(false);
  const [customMarkdown, setCustomMarkdown] = useState<string>(initialKnowledgeBase || '');

  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Compilador em tempo real do RAG Simplificado (Markdown)
  const compiledPreview = [
    `# Base de Conhecimento Oficial — ${nomeEstabelecimento}`,
    ``,
    `## 1. Perfil e Posicionamento`,
    `- **Estabelecimento:** ${nomeEstabelecimento}`,
    `- **Nicho de Atuação:** ${businessNiche}`,
    `- **Tom de Voz do Agente:** ${toneOfVoice}`,
    ``,
    `## 2. Regras de Atendimento e Agenda`,
    `- **Horário de Funcionamento:** ${horarioFuncionamento}`,
    `- **Tolerância de Atraso:** ${toleranciaAtraso}`,
    `- **Política de Cancelamento e Reagendamento:** ${regrasCancelamento}`,
    ``,
    `## 3. Pagamentos e Política de Sinal`,
    `- **Formas de Pagamento Aceitas:** ${formasPagamento}`,
    `- **Exigência de Sinal / Reserva:** ${
      exigeSinal ? `Sim (${detalhesSinal})` : 'Não exige sinal antecipado (pagamento no local)'
    }`,
    ``,
    `## 4. Instruções Adicionais e Perguntas Frequentes (FAQ)`,
    `${instrucoesAdicionais || 'Nenhuma instrução complementar especificada.'}`,
    ``,
    `## 5. Diretrizes de Segurança e Conformidade (LGPD)`,
    `- Atuar exclusivamente na orientação de horários, serviços, preços e dúvidas operacionais do estabelecimento.`,
    `- Nunca solicitar, processar ou armazenar prontuários médicos, anamneses ou dados clínicos sensíveis.`,
  ].join('\n');

  const handleAtivarEdicaoManual = () => {
    if (!modoEdicaoManual && !customMarkdown.trim()) {
      setCustomMarkdown(compiledPreview);
    }
    setModoEdicaoManual(!modoEdicaoManual);
  };

  const handleSalvarWizard = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await saveAiOnboardingSetupAction({
        explicitLojistaId: lojistaId,
        businessNiche,
        toneOfVoice,
        horarioFuncionamento,
        toleranciaAtraso,
        regrasCancelamento,
        formasPagamento,
        exigeSinal,
        detalhesSinal,
        instrucoesAdicionais,
        useAiAgent,
        customKnowledgeBase: modoEdicaoManual ? customMarkdown : undefined,
      });

      if (res.success) {
        if (res.knowledgeBase) {
          setCustomMarkdown(res.knowledgeBase);
        }
        setFeedback({
          tipo: 'sucesso',
          texto: res.message || 'Configurações do Agente de IA salvas com sucesso!',
        });
      } else {
        setFeedback({
          tipo: 'erro',
          texto: res.error || 'Erro ao salvar as configurações do Agente de IA.',
        });
      }

      setTimeout(() => setFeedback(null), 6000);
    });
  };

  const creditosDisponiveis = typeof initialAiCredits === 'number' ? initialAiCredits : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Banner Superior estilo Nord Dark */}
      <div className="bg-[#2E3440] border-b border-[#3B4252] px-6 py-5 text-[#ECEFF4]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B4252] text-[#88C0D0] text-base font-bold border border-[#4C566A]">
                ✨
              </span>
              <h2 className="text-lg font-bold tracking-tight text-[#ECEFF4]">
                Assistente de Onboarding IA (Setup Wizard)
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                  useAiAgent
                    ? 'bg-[#A3BE8C]/20 text-[#A3BE8C] border-[#A3BE8C]/40'
                    : 'bg-[#3B4252] text-[#D8DEE9] border-[#4C566A]'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    useAiAgent ? 'bg-[#A3BE8C] animate-pulse' : 'bg-[#D8DEE9]/60'
                  }`}
                />
                {useAiAgent ? 'IA Conversacional Ativa' : 'Modo Bot Numérico Padrão'}
              </span>
            </div>
            <p className="text-xs text-[#D8DEE9]/80">
              Configure o cérebro do seu atendente virtual em 3 passos rápidos (RAG Simplificado sem latência).
            </p>
          </div>

          {/* Chave Liga / Desliga Principal (use_ai_agent) */}
          <div className="flex items-center gap-3 self-start sm:self-center rounded-xl bg-[#242933] px-4 py-2.5 border border-[#3B4252]">
            <div className="text-right">
              <span className="block text-xs font-bold text-[#ECEFF4]">
                {useAiAgent ? 'Agente IA Ligado' : 'Ativar Agente IA'}
              </span>
              <span className="block text-[10px] font-mono text-[#88C0D0]">
                Saldo: {creditosDisponiveis} créditos IA
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={useAiAgent}
              onClick={() => setUseAiAgent(!useAiAgent)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                useAiAgent ? 'bg-[#A3BE8C]' : 'bg-[#4C566A]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  useAiAgent ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Barra de Progresso dos 3 Passos */}
        <div className="mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-[#3B4252]">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${
              step === 1
                ? 'bg-[#88C0D0] text-[#242933] shadow-xs'
                : 'bg-[#3B4252]/60 text-[#D8DEE9] hover:bg-[#3B4252]'
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold">
              1
            </span>
            <span className="truncate">Nicho & Tom de Voz</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${
              step === 2
                ? 'bg-[#88C0D0] text-[#242933] shadow-xs'
                : 'bg-[#3B4252]/60 text-[#D8DEE9] hover:bg-[#3B4252]'
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold">
              2
            </span>
            <span className="truncate">Regras & Horários</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${
              step === 3
                ? 'bg-[#88C0D0] text-[#242933] shadow-xs'
                : 'bg-[#3B4252]/60 text-[#D8DEE9] hover:bg-[#3B4252]'
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold">
              3
            </span>
            <span className="truncate">Pagamentos & Base RAG</span>
          </button>
        </div>
      </div>

      {/* Corpo do Wizard */}
      <form onSubmit={handleSalvarWizard} className="p-6 space-y-6">
        {/* PASSO 1: NICHO E TOM DE VOZ */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                a) Qual é o Nicho de Atuação do Estabelecimento?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {NICHOS_DISPONIVEIS.map((item) => {
                  const selecionado = businessNiche === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBusinessNiche(item.id)}
                      className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                        selecionado
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:border-slate-300 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-lg">{item.icon}</span>
                        {selecionado && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300">
                            Selecionado
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold">{item.label}</span>
                      <span
                        className={`text-[11px] mt-0.5 leading-snug ${
                          selecionado ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                b) Escolha o Tom de Voz do Agente no WhatsApp
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {TONS_DE_VOZ.map((tom) => {
                  const selecionado = toneOfVoice === tom.id;
                  return (
                    <button
                      key={tom.id}
                      type="button"
                      onClick={() => setToneOfVoice(tom.id)}
                      className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                        selecionado
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold">{tom.label}</span>
                          {selecionado && <span className="text-xs text-emerald-400">●</span>}
                        </div>
                        <p
                          className={`text-[11px] mt-1.5 leading-relaxed ${
                            selecionado ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {tom.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
              >
                Próximo: Regras de Atendimento &rarr;
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: REGRAS DE ATENDIMENTO */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Horários de Funcionamento
                </label>
                <input
                  type="text"
                  value={horarioFuncionamento}
                  onChange={(e) => setHorarioFuncionamento(e.target.value)}
                  placeholder="Ex: Terça a Sábado, das 09h às 20h"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-[11px] text-slate-400 block">
                  Informado pelo agente quando clientes perguntam se está aberto.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Tolerância de Atraso
                </label>
                <input
                  type="text"
                  value={toleranciaAtraso}
                  onChange={(e) => setToleranciaAtraso(e.target.value)}
                  placeholder="Ex: 10 a 15 minutos de tolerância"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-[11px] text-slate-400 block">
                  Regra comunicada caso o cliente avise que vai se atrasar.
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Política de Cancelamento e Reagendamento
              </label>
              <textarea
                rows={3}
                value={regrasCancelamento}
                onChange={(e) => setRegrasCancelamento(e.target.value)}
                placeholder="Descreva com quanto tempo de antecedência o cliente pode cancelar ou remarcar..."
                className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                &larr; Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
              >
                Próximo: Pagamentos & Revisão &rarr;
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: PAGAMENTOS, FAQ E PREVIEW RAG */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Formas de Pagamento Aceitas
                </label>
                <input
                  type="text"
                  value={formasPagamento}
                  onChange={(e) => setFormasPagamento(e.target.value)}
                  placeholder="Ex: Pix, Cartões de Crédito/Débito e Dinheiro"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Política de Sinal / Reserva Antecipada
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setExigeSinal(false)}
                    className={`flex-1 rounded-lg border py-2 px-3 text-xs font-semibold transition-all ${
                      !exigeSinal
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Pagamento no Local
                  </button>
                  <button
                    type="button"
                    onClick={() => setExigeSinal(true)}
                    className={`flex-1 rounded-lg border py-2 px-3 text-xs font-semibold transition-all ${
                      exigeSinal
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Exige Sinal via Pix
                  </button>
                </div>
              </div>
            </div>

            {exigeSinal && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Detalhes do Sinal / Chave Pix
                </label>
                <input
                  type="text"
                  value={detalhesSinal}
                  onChange={(e) => setDetalhesSinal(e.target.value)}
                  placeholder="Ex: Sinal de R$ 30 via Pix para procedimentos químicos"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Instruções Adicionais e Diferenciais (Estacionamento, Endereço, Observações)
              </label>
              <textarea
                rows={3}
                value={instrucoesAdicionais}
                onChange={(e) => setInstrucoesAdicionais(e.target.value)}
                placeholder="Ex: Ficamos na Rua XV de Novembro, 500. Temos convênio com estacionamento ao lado e atendimento infantil."
                className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Bloco RAG Markdown Compilado */}
            <div className="rounded-xl border border-[#3B4252] bg-[#242933] p-4 space-y-3 text-[#ECEFF4]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-[#88C0D0] uppercase tracking-wider">
                    📄 Base de Conhecimento Compilada (RAG Markdown)
                  </span>
                  <p className="text-[11px] text-[#D8DEE9]/70">
                    Este documento estruturado alimenta o prompt de contexto da IA em cada conversa no WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAtivarEdicaoManual}
                  className="rounded-lg border border-[#4C566A] bg-[#3B4252] px-3 py-1.5 text-[11px] font-semibold text-[#ECEFF4] hover:bg-[#434C5E] transition-colors"
                >
                  {modoEdicaoManual ? 'Usar Geração Automática do Wizard' : 'Editar Markdown Manualmente'}
                </button>
              </div>

              {modoEdicaoManual ? (
                <textarea
                  rows={10}
                  value={customMarkdown}
                  onChange={(e) => setCustomMarkdown(e.target.value)}
                  className="w-full rounded-lg border border-[#4C566A] bg-[#2E3440] p-3 text-xs font-mono text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none leading-relaxed"
                />
              ) : (
                <pre className="max-h-56 overflow-y-auto rounded-lg bg-[#2E3440] p-3.5 text-[11px] font-mono text-[#D8DEE9] whitespace-pre-wrap leading-relaxed border border-[#3B4252]">
                  {compiledPreview}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                &larr; Voltar
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isPending ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Gravando Base de Conhecimento...
                  </>
                ) : (
                  'Salvar e Ativar Configuração de IA'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Toast / Notificação de Feedback Visual */}
        {feedback && (
          <div
            className={`rounded-xl p-3.5 text-xs font-semibold border flex items-center justify-between ${
              feedback.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <span>
              {feedback.tipo === 'sucesso' ? '✓ ' : '⚠️ '}
              {feedback.texto}
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100 ml-3"
            >
              ✕
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

