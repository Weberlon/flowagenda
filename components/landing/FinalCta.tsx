'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import { CONTACT_CONFIG } from '@/config/contact';

interface FinalCtaProps {
  whatsappConsultorUrl?: string;
}

export default function FinalCta({ whatsappConsultorUrl }: FinalCtaProps) {
  const consultorUrl =
    whatsappConsultorUrl ||
    CONTACT_CONFIG.getUrl(CONTACT_CONFIG.getActivationMessage());

  return (
    <section className="relative py-20 sm:py-28 bg-gradient-to-b from-[#242933] to-[#1E232A] overflow-hidden border-t border-[#3B4252]/60">
      {/* Luz Aurora Difusa no Fundo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[#88C0D0]/[0.08] blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-[#4C566A]/60 bg-[#2E3440]/90 p-8 sm:p-14 lg:p-16 shadow-2xl backdrop-blur-xl space-y-6"
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#88C0D0]/10 text-[#88C0D0] text-xs font-bold border border-[#88C0D0]/30">
            <Zap className="h-3.5 w-3.5" />
            Ativação Rápida em Minutos
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#ECEFF4] tracking-tight leading-tight">
            Pronto para lotar sua agenda e parar de{' '}
            <span className="text-[#88C0D0]">perder clientes no WhatsApp</span>?
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-[#D8DEE9]/80 max-w-2xl mx-auto leading-relaxed">
            Junte-se a centenas de negócios locais de alta performance que automatizaram o atendimento, reduziram as faltas e aumentaram seu faturamento mensal com o FlowAgenda.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#planos"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#88C0D0] px-8 py-4 text-sm font-black text-[#242933] shadow-lg shadow-[#88C0D0]/20 hover:bg-[#88C0D0]/90 transition-all hover:scale-102"
            >
              <span>Escolher Meu Plano & Ativar Agora</span>
              <ArrowRight className="h-4 w-4" />
            </a>

            <a
              href={consultorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#4C566A] bg-[#3B4252] px-6 py-4 text-sm font-bold text-[#ECEFF4] hover:bg-[#434C5E] transition-all"
            >
              <MessageSquare className="h-4 w-4 text-[#88C0D0]" />
              <span>Falar com Consultor no WhatsApp</span>
            </a>
          </div>

          <div className="pt-6 border-t border-[#3B4252]/60 flex flex-wrap items-center justify-center gap-6 text-xs text-[#D8DEE9]/70">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#A3BE8C]" />
              <span>Garantia de 7 dias ou seu dinheiro de volta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#88C0D0]" />
              <span>Sem fidelidade forçada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A3BE8C]" />
              <span>Setup assistido incluso</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}