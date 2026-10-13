'use client';

// ==============================================================================
// PricingTiers — Nomenclatura Oficial & Ciclo de Faturamento Parametrizado
// Arquivo: components/landing/PricingTiers.tsx
// ==============================================================================

import React, { useState } from 'react';
import { CONTACT_CONFIG, BillingCycle } from '@/config/contact';

export default function PricingTiers() {
  const [cycle, setCycle] = useState<BillingCycle>('annual');

  const cycleLabels: Record<BillingCycle, string> = {
    monthly: 'MENSAL',
    semiannual: 'SEMESTRAL',
    annual: 'ANUAL',
  };

  const tiers = [
    {
      id: 'tier-1',
      name: 'Essencial',
      subtitle: 'Para profissionais autônomos que precisam eliminar faltas e automatizar o atendimento no WhatsApp.',
      pricing: {
        monthly: { price: '59,90', setup: '99,90 (Taxa única)', setupNote: 'Economize no plano anual' },
        semiannual: { price: '54,90', setup: '49,90 (50% OFF)', setupNote: 'Faturado semestralmente' },
        annual: { price: '49,90', yearlyTotal: '(R$ 598,80/ano)', setup: '0,00', setupNote: 'Economia total de R$ 219,90' },
      },
      isHighlight: false,
      ctaText: 'Ativar Plano Essencial',
      features: [
        'Subdomínio exclusivo (seunome.flowagenda.online)',
        'Robô de WhatsApp com validação de PIN de 6 dígitos',
        'Lembretes automáticos 2h antes (Anti-falta garantido)',
        'Página personalizada com suas cores e logo oficiais',
        'Slots de agendamento ágeis (15, 30, 45 e 60 min)',
        'Painel intuitivo com métricas de clientes',
      ],
    },
    {
      id: 'tier-2',
      name: 'Profissional',
      subtitle: 'Para negócios em expansão que exigem gestão de clientes, controle de intervalos e rotina organizada.',
      pricing: {
        monthly: { price: '99,90', setup: '149,90 (Taxa única)', setupNote: 'Economize no plano anual' },
        semiannual: { price: '89,90', setup: '74,90 (50% OFF)', setupNote: 'Faturado semestralmente' },
        annual: { price: '84,90', yearlyTotal: '(R$ 1.018,80/ano)', setup: '0,00', setupNote: 'Economia total de R$ 329,90' },
      },
      isHighlight: false,
      ctaText: 'Escolher Plano Profissional',
      features: [
        'Tudo incluído no Tier 1',
        'Página institucional premium com design focado em máxima autoridade visual',
        'CRM de clientes com histórico de retornos e visitas',
        'Intervalos inteligentes (buffer time) entre atendimentos para pontualidade da rotina',
        'Remoção de marcas externas (White Label no agendamento)',
        'Transbordo prioritário para secretária/recepção',
      ],
    },
    {
      id: 'tier-3',
      name: 'Autoridade',
      subtitle: 'Para marcas consolidadas que exigem domínio próprio, equipe sincronizada e máxima reputação.',
      pricing: {
        monthly: { price: '189,90', setup: '349,90 (Taxa única Done-For-You)', setupNote: 'Economize no plano anual' },
        semiannual: { price: '169,90', setup: '174,90 (50% OFF)', setupNote: 'Faturado semestralmente' },
        annual: { price: '159,90', yearlyTotal: '(R$ 1.918,80/ano)', setup: '0,00', setupNote: 'Economia total de R$ 709,90' },
      },
      isHighlight: true,
      badge: 'MAIS ESCOLHIDO • MÁXIMA AUTORIDADE',
      ctaText: 'Ativar Máxima Autoridade',
      features: [
        'Tudo incluído no Tier 2',
        'Marca Própria Exclusiva (domínio .com.br próprio)',
        'Checklist & Otimização do Google Meu Negócio Done-For-You',
        'Robô automatizado de coleta de avaliações 5★ no Google pós-atendimento',
        'Vitrine dinâmica de avaliações e fotos profissionais',
        'Gerente de contas dedicado e suporte VIP via WhatsApp',
      ],
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto overflow-hidden py-16 px-4 sm:px-6 lg:px-8 text-[#ECEFF4] font-sans">
      
      {/* Topo / Header da Seção */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12 overflow-hidden">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#88C0D0]/30 bg-[#88C0D0]/10 px-4 py-1.5 text-xs font-semibold text-[#88C0D0]">
          <span className="h-2 w-2 rounded-full bg-[#88C0D0] animate-pulse" />
          Previsibilidade Total • Sem Taxas Ocultas
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#ECEFF4]">
          Planos transparentes para acelerar seu negócio local
        </h2>

        <p className="text-sm sm:text-base text-[#D8DEE9]/70 leading-relaxed max-w-2xl mx-auto">
          Economize tempo no WhatsApp e elimine faltas. Escolha o ciclo ideal para sua empresa:
        </p>

        {/* 1. SELETOR DE CICLO (SEGMENTED PILL TOGGLE) */}
        <div className="pt-4 flex items-center justify-center overflow-hidden">
          <div className="inline-flex flex-wrap items-center justify-center rounded-2xl bg-[#2E3440] p-1.5 border border-[#3B4252] shadow-inner gap-1">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={`rounded-xl px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                cycle === 'monthly'
                  ? 'bg-[#3B4252] text-[#88C0D0] shadow-sm border border-[#4C566A]'
                  : 'text-[#D8DEE9]/60 hover:text-[#ECEFF4]'
              }`}
            >
              Mensal
            </button>

            <button
              type="button"
              onClick={() => setCycle('semiannual')}
              className={`rounded-xl px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                cycle === 'semiannual'
                  ? 'bg-[#3B4252] text-[#88C0D0] shadow-sm border border-[#4C566A]'
                  : 'text-[#D8DEE9]/60 hover:text-[#ECEFF4]'
              }`}
            >
              Semestral
            </button>

            <button
              type="button"
              onClick={() => setCycle('annual')}
              className={`flex items-center gap-2 rounded-xl px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold transition-all ${
                cycle === 'annual'
                  ? 'bg-[#88C0D0] text-[#242933] shadow-md font-black scale-102'
                  : 'text-[#D8DEE9]/60 hover:text-[#ECEFF4]'
              }`}
            >
              <span>Anual</span>
              <span className="rounded-full bg-[#A3BE8C] text-[#242933] px-2.5 py-0.5 text-[10px] font-black uppercase shadow-xs">
                SETUP 100% GRÁTIS + 2 MESES OFF
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Grade com 3 Cards Responsivos Fixos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch overflow-hidden">
        {tiers.map((tier) => {
          const currentPlan = tier.pricing[cycle];
          const isAnnual = cycle === 'annual';
          const whatsappUrl = CONTACT_CONFIG.getUrl(
            CONTACT_CONFIG.getPlanMessage(tier.name, cycle)
          );

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 transition-all duration-300 overflow-hidden ${
                tier.isHighlight
                  ? 'bg-[#2E3440] border-2 border-[#88C0D0] shadow-2xl shadow-[#88C0D0]/10 lg:-translate-y-2'
                  : 'bg-[#242933] border border-[#3B4252] shadow-xl hover:border-[#4C566A]'
              }`}
            >
              {/* Badge Superior para Tier 3 */}
              {tier.isHighlight && tier.badge && (
                <div className="absolute top-0 right-0 left-0 bg-[#88C0D0] py-1.5 text-center text-[10px] font-black uppercase tracking-wider text-[#242933] shadow-md">
                  {tier.badge}
                </div>
              )}

              {/* Informações Principais */}
              <div className={`space-y-4 ${tier.isHighlight ? 'pt-3' : ''}`}>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#ECEFF4]">{tier.name}</h3>
                  <p className="text-xs text-[#88C0D0] font-medium mt-1 leading-relaxed">{tier.subtitle}</p>
                </div>

                {/* Bloco de Preço Parametrizado */}
                <div className="pt-2 pb-4 border-b border-[#3B4252]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-semibold text-[#D8DEE9]/60">R$</span>
                    <span className="text-4xl sm:text-5xl font-black text-[#ECEFF4] tracking-tight">
                      {currentPlan.price}
                    </span>
                    <span className="text-xs font-semibold text-[#D8DEE9]/60">/mês</span>
                    {isAnnual && (currentPlan as any).yearlyTotal && (
                      <span className="text-[11px] font-mono text-[#A3BE8C] ml-1.5 font-bold">
                        {(currentPlan as any).yearlyTotal}
                      </span>
                    )}
                  </div>

                  {/* Ancoragem de Setup */}
                  <div className="mt-3 rounded-xl bg-[#2E3440]/80 p-3 border border-[#3B4252] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[#D8DEE9]/70">
                      <span>Taxa de Implantação / Setup:</span>
                      {isAnnual ? (
                        <span className="text-[#A3BE8C] font-black uppercase text-[11px] bg-[#A3BE8C]/20 px-2 py-0.5 rounded border border-[#A3BE8C]/30">
                          R$ 0,00 [SETUP GRÁTIS]
                        </span>
                      ) : (
                        <span className="font-mono text-[#EBCB8B] font-bold">
                          R$ {currentPlan.setup}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#D8DEE9]/50 text-right font-medium">
                      {currentPlan.setupNote}
                    </div>
                  </div>
                </div>

                {/* Lista de Recursos */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]/60">
                    O que você recebe:
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-[#D8DEE9]">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="h-5 w-5 rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Botão de Chamada para Ação (CTA) */}
              <div className="pt-8">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-xs sm:text-sm font-black transition-all duration-200 shadow-lg text-center ${
                    tier.isHighlight
                      ? 'bg-[#88C0D0] text-[#242933] hover:bg-[#88C0D0]/90 shadow-[#88C0D0]/20 hover:scale-[1.02]'
                      : 'bg-[#3B4252] text-[#ECEFF4] hover:bg-[#4C566A] hover:text-white border border-[#4C566A]'
                  }`}
                >
                  <span>{tier.ctaText}</span>
                  <span>&rarr;</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
