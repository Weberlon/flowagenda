'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Sparkles, HeartPulse, Stethoscope, Dog, PenTool, CheckCircle2 } from 'lucide-react';

interface NicheItem {
  id: string;
  name: string;
  shortName: string;
  icon: any;
  headline: string;
  description: string;
  whatsappMessage: string;
  botAnswer: string;
  benefits: string[];
  metrics: string;
}

export default function NicheShowcase() {
  const niches: NicheItem[] = [
    {
      id: 'barbearia',
      name: 'Barbearias & Navalha',
      shortName: 'Barbearias',
      icon: Scissors,
      headline: 'Atendimento veloz para clientes que querem cortar sem esperar',
      description:
        'Homens agendam na sexta e sábado com pressa. O robô libera horários de barba, corte degradê e química em segundos, com lembrete 2h antes para ninguém furar o horário.',
      whatsappMessage: 'Fala meu amigo, tem horário pra barba e cabelo hoje às 18h?',
      botAnswer: 'Opa, tudo bem? Tenho às 18h30 com o Mestre Carlos ou 19h com o Felipe. Acesse o link para travar seu horário agora: [link]',
      benefits: ['Prevenção de furos nas sextas-feiras', 'Escolha do barbeiro preferido', 'Lembrete automático com 2h de antecedência'],
      metrics: 'Zero tempo perdido no WhatsApp enquanto você segura a tesoura',
    },
    {
      id: 'salao',
      name: 'Salões de Beleza & Cabelo',
      shortName: 'Salões',
      icon: Sparkles,
      headline: 'Gestão de múltiplos procedimentos e tempos de pausa na cadeira',
      description:
        'Cortes, mechas, escovas e manicure. Calcule o intervalo correto para coloração sem sobrecarregar sua equipe e com confirmação com PIN de segurança.',
      whatsappMessage: 'Boa tarde! Quanto fica mechas com escova e tem horário pra sábado?',
      botAnswer: 'Olá, querida! O pacote mechas + escova sai a partir de R$ 280. Para sábado temos vagas às 09h e às 14h. Qual prefere?',
      benefits: ['Controle de intervalos químicos e pausas', 'Confirmação antecipada com código PIN', 'Catálogo completo de procedimentos com fotos'],
      metrics: '+42% de faturamento em horários que ficavam vazios',
    },
    {
      id: 'estetica',
      name: 'Clínicas de Estética & Biomedicina',
      shortName: 'Estética',
      icon: HeartPulse,
      headline: 'Triagem qualificada para Botox, Preenchimento e Lasers',
      description:
        'A secretária IA esclarece dúvidas frequentes sobre pré-requisitos, pós-procedimento e orientações de avaliação antes de registrar o agendamento.',
      whatsappMessage: 'Gostaria de saber como funciona a avaliação de harmonização facial.',
      botAnswer: 'Olá! A consulta avaliativa inclui análise digital de proporções. Temos horários disponíveis com a Dra. Letícia esta semana:',
      benefits: ['Orientações automáticas de preparo pré-procedimento', 'Bloqueio de grade exclusivo com buffer time', 'Histórico e prontuário integrado do paciente'],
      metrics: 'Alta percepção de valor e acolhimento humanizado',
    },
    {
      id: 'odonto',
      name: 'Consultórios Odontológicos',
      shortName: 'Odontologia',
      icon: Stethoscope,
      headline: 'Pontualidade britânica e eliminação total de faltas na cadeira',
      description:
        'Consultas de rotina, profilaxia, clareamento e ortodontia. Reduza o no-show a quase zero com lembretes programados e confirmação direta no WhatsApp.',
      whatsappMessage: 'Preciso marcar uma limpeza e avaliação de aparelho pro meu filho.',
      botAnswer: 'Perfeito! Para limpeza e ortodontia atendemos de segunda a sexta. Escolha o melhor dia e horário no link seguro da clínica:',
      benefits: ['Lembretes 24h e 2h antes com confirmação ativa', 'Cadastro completo de pacientes com histórico', 'Total conformidade com sigilo e ética médica'],
      metrics: '-85% de faltas com lembretes automáticos transacionais',
    },
    {
      id: 'pet',
      name: 'Pet Shops & Banho e Tosa',
      shortName: 'Pet Shops',
      icon: Dog,
      headline: 'Controle de porte, raça e serviço de busca & entrega',
      description:
        'Evite congestionamento na secagem. Organize os pets por porte e tempo de banho, garantindo que o tutor saiba exatamente a hora de buscar o bichinho.',
      whatsappMessage: 'Vocês têm vaga pra tosa de Golden Retriever amanhã de manhã?',
      botAnswer: 'Oi! Temos sim! Para porte grande amanhã temos às 09h30 com nossa especialista em tosa na tesoura. Garanta o horário do seu pet:',
      benefits: ['Diferenciação por porte e tipo de tosa', 'Avisos automáticos de pet pronto para retirada', 'Aumento de recorrência semanal e quinzenal'],
      metrics: 'Fluxo contínuo de atendimento sem estresse para os pets',
    },
    {
      id: 'tatuagem',
      name: 'Estúdios de Tatuagem & Piercing',
      shortName: 'Tatuagem',
      icon: PenTool,
      headline: 'Agendamento de sessões longas e triagem de ideias e referências',
      description:
        'Receba a ideia do cliente, explique os cuidados de cicatrização e reserve sessões de horas com sinal de garantia via Pix automático.',
      whatsappMessage: 'Salve! Quero tatuar o antebraço estilo oriental, como faço?',
      botAnswer: 'Opa! Que projeto massa. Nossas sessões para fechamento de antebraço têm duração de 4h. Veja os dias livres do tatuador no link:',
      benefits: ['Reserva de sessões longas sem risco de sobreposição', 'Possibilidade de cobrança de sinal Pix no ato', 'Orientações pós-tattoo automatizadas'],
      metrics: '70% dos orçamentos fechados fora do horário comercial',
    },
  ];

  const [activeNiche, setActiveNiche] = useState<NicheItem>(niches[0]);

  return (
    <section id="nichos" className="py-16 sm:py-24 bg-[#2E3440] border-t border-[#3B4252]/60 overflow-x-clip">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho Minimalista */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#ECEFF4] tracking-tight">
            Adaptado para o{' '}
            <span className="text-[#88C0D0]">seu tipo de negócio</span>
          </h2>
          <p className="text-sm sm:text-base text-[#D8DEE9]/80 mt-3 leading-relaxed">
            De um corte rápido de 20 min a uma sessão de 2 horas, a IA entende seus serviços, durações e regras.
          </p>
        </div>

        {/* Seletor Minimalista em Grade (sem barra de rolagem, 100% visível) */}
        <div
          role="tablist"
          aria-label="Segmentos atendidos pelo FlowAgenda"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-8"
        >
          {niches.map((niche) => {
            const Icon = niche.icon;
            const isSelected = activeNiche.id === niche.id;
            return (
              <button
                key={niche.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveNiche(niche)}
                className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#88C0D0] ${
                  isSelected
                    ? 'bg-[#88C0D0] text-[#242933] shadow-md shadow-[#88C0D0]/20'
                    : 'bg-[#242933]/90 text-[#D8DEE9] hover:bg-[#3B4252] border border-[#3B4252]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{niche.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Card Dinâmico do Nicho Selecionado */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeNiche.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28 }}
            className="rounded-3xl border border-[#3B4252] bg-[#242933]/95 p-6 sm:p-8 lg:p-10 shadow-2xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Coluna Esquerda: Benefícios */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-xl bg-[#3B4252] px-3 py-1 text-xs font-bold text-[#88C0D0] border border-[#4C566A]/60">
                  <activeNiche.icon className="h-4 w-4" />
                  <span>Solução Especializada para {activeNiche.name}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#ECEFF4] tracking-tight leading-snug">
                  {activeNiche.headline}
                </h3>

                <p className="text-sm sm:text-base text-[#D8DEE9]/90 leading-relaxed font-normal">
                  {activeNiche.description}
                </p>

                <div className="space-y-3 pt-2">
                  {activeNiche.benefits.map((b) => (
                    <div key={b} className="flex items-center gap-3 text-xs sm:text-sm text-[#ECEFF4]">
                      <CheckCircle2 className="h-4 w-4 text-[#A3BE8C] shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#3B4252] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#A3BE8C]">
                    <span>✦ Impacto medido:</span>
                    <span className="text-[#ECEFF4] font-normal">{activeNiche.metrics}</span>
                  </div>
                  <a
                    href="#planos"
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#88C0D0] px-4 py-2 text-xs font-black text-[#242933] hover:bg-[#88C0D0]/90 transition-colors"
                  >
                    Ativar no meu negócio →
                  </a>
                </div>
              </div>

              {/* Coluna Direita: Mockup Realista de Mensagem no WhatsApp */}
              <div className="lg:col-span-5 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#3B4252]">
                  <div className="h-3 w-3 rounded-full bg-[#A3BE8C] animate-pulse" />
                  <span className="text-xs font-bold text-[#ECEFF4] font-mono">
                    WhatsApp Oficial • {activeNiche.shortName}
                  </span>
                </div>

                {/* Mensagem do Cliente */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-[#434C5E] p-3.5 text-xs text-[#ECEFF4] shadow-sm leading-relaxed">
                    <p>{activeNiche.whatsappMessage}</p>
                    <span className="block text-right text-[10px] text-[#D8DEE9]/60 mt-1">14:32</span>
                  </div>
                </div>

                {/* Resposta do Robô FlowAgenda */}
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl rounded-tl-none bg-[#242933] border border-[#88C0D0]/30 p-3.5 text-xs text-[#ECEFF4] shadow-md space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#88C0D0]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#88C0D0]" />
                      Secretária IA FlowAgenda
                    </div>
                    <p className="leading-relaxed">{activeNiche.botAnswer}</p>
                    <span className="block text-[10px] text-[#D8DEE9]/60 mt-1">14:32 • Resposta instantânea</span>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <span className="text-[11px] font-mono text-[#D8DEE9]/70">
                    ⚡ Tempo de resposta: <strong>1.8 segundos</strong>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}