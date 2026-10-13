'use client';

// ==============================================================================
// HeroSection — Dark SaaS Nord com Microinterações e Aurora Mesh Gradient
// Arquivo: components/landing/HeroSection.tsx
// ==============================================================================

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import HeroInteractiveMockup from './HeroInteractiveMockup';
import { CONTACT_CONFIG } from '@/config/contact';

interface HeroSectionProps {
  whatsappConsultorUrl?: string;
}

export default function HeroSection({
  whatsappConsultorUrl,
}: HeroSectionProps) {
  const consultorUrl =
    whatsappConsultorUrl ||
    CONTACT_CONFIG.getUrl(CONTACT_CONFIG.getActivationMessage());
  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-16 lg:pb-28">
      {/* ================================================================ */}
      {/* AURORA MESH GRADIENT DIFUSO (EFEITO LUXO / ALTO VALOR)           */}
      {/* Duas camadas translúcidas com blur-[120px] e opacidade sutil     */}
      {/* ================================================================ */}
      <div 
        className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 h-[550px] w-[550px] rounded-full bg-[#88C0D0]/[0.07] blur-[120px] animate-pulse pointer-events-none" 
        style={{ animationDuration: '8s' }}
        aria-hidden="true"
      />
      <div 
        className="absolute top-1/3 right-1/4 translate-x-1/3 h-[500px] w-[500px] rounded-full bg-[#81A1C1]/[0.06] blur-[120px] animate-pulse pointer-events-none" 
        style={{ animationDuration: '8s', animationDelay: '4s' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Coluna Esquerda: Copywriting com Animações Fluidas */}
          <motion.div 
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Badge Animado de Status com Border Glow */}
            <motion.div 
              className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#2E3440]/90 px-4 py-1.5 text-xs font-semibold text-[#ECEFF4] shadow-sm backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3BE8C] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#A3BE8C]" />
              </span>
              <span className="text-[#D8DEE9] text-[11px] sm:text-xs">
                Automação WhatsApp Ativa <span className="text-[#88C0D0] font-mono font-bold">(Evolution API v2)</span>
              </span>
            </motion.div>

            {/* Headline com Gradiente Nord */}
            <motion.h1 
              className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight text-[#ECEFF4] leading-[1.12]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Sua agenda cheia e seu negócio no topo do Google.{' '}
              <span className="bg-gradient-to-r from-[#ECEFF4] via-[#88C0D0] to-[#81A1C1] bg-clip-text text-transparent">
                Sem você perder horas no WhatsApp.
              </span>
            </motion.h1>

            {/* Subtítulo com Contraste Otimizado */}
            <motion.p 
              className="text-sm sm:text-base lg:text-lg text-[#D8DEE9]/90 leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              O robô do FlowAgenda atende 24h por dia no seu WhatsApp oficial, valida o número do cliente com código PIN em tempo real, elimina faltas com lembretes automáticos e posiciona seu estabelecimento em 1º lugar nas buscas locais.
            </motion.p>

            {/* CTAs com Estilo Pill e Efeitos de Hover */}
            <motion.div 
              className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <motion.a
                href={consultorUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-[#88C0D0] px-8 py-4 text-xs sm:text-sm font-black text-[#242933] shadow-xl shadow-[#88C0D0]/20 hover:bg-[#88C0D0]/90 transition-colors text-center cursor-pointer"
              >
                <span>Ativar Estabelecimento</span>
                <span className="text-base font-bold">&rarr;</span>
              </motion.a>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/tenant/barbeariamodelo"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-[#2E3440]/80 px-7 py-4 text-xs sm:text-sm font-bold text-[#ECEFF4] hover:border-[#88C0D0]/40 hover:bg-[#2E3440] transition-all text-center backdrop-blur-xl"
                >
                  <svg className="h-4 w-4 text-[#88C0D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Ver Demonstração ao Vivo</span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Micro Prova Social */}
            <motion.div 
              className="pt-2 flex items-center justify-center lg:justify-start gap-4 text-xs text-[#D8DEE9]/70 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[#A3BE8C] font-bold">✓</span>
                <span>Sem taxa de adesão no anual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#A3BE8C] font-bold">✓</span>
                <span>Setup em menos de 15 min</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Coluna Direita: Simulador Central em Vidro */}
          <motion.div 
            className="lg:col-span-6 w-full flex justify-center"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroInteractiveMockup />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
