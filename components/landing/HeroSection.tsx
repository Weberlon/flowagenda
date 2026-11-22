'use client';

// ==============================================================================
// HeroSection — Dark SaaS Nord com Microinterações e Aurora Mesh Gradient
// Arquivo: components/landing/HeroSection.tsx
// ==============================================================================

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Eye, ShieldCheck, CheckCircle2, Star, Lock } from 'lucide-react';
import HeroInteractiveMockup from './HeroInteractiveMockup';
import { CONTACT_CONFIG } from '@/config/contact';

interface HeroSectionProps {
  whatsappConsultorUrl?: string;
}

export default function HeroSection({
  whatsappConsultorUrl,
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Planos independentes de profundidade (respeitando prefers-reduced-motion)
  const bgY = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : 48]);
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : -28]);
  const fgY = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : -52]);

  const consultorUrl =
    whatsappConsultorUrl ||
    CONTACT_CONFIG.getUrl(CONTACT_CONFIG.getActivationMessage());

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-16 lg:pb-28"
    >
      {/* Plano 0 (Fundo): Grade sutil + Aurora Mesh em movimento lento */}
      <motion.div
        style={{ y: bgY }}
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(136, 192, 208, 0.35) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 h-[550px] w-[550px] rounded-full bg-[#88C0D0]/[0.08] blur-[130px] animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute top-1/3 right-1/4 translate-x-1/3 h-[500px] w-[500px] rounded-full bg-[#81A1C1]/[0.07] blur-[130px] animate-pulse"
          style={{ animationDuration: '8s', animationDelay: '4s' }}
        />
      </motion.div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Coluna Esquerda: Copywriting de Alto Impacto */}
          <motion.div 
            className="lg:col-span-6 min-w-0 space-y-6 text-center lg:text-left"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Badge Animado de Status com Prova Social */}
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
                Secretária IA 24h no WhatsApp • <strong className="text-[#88C0D0] font-mono">Evolution API v2</strong>
              </span>
            </motion.div>

            {/* Headline Principal */}
            <motion.h1 
              className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight text-[#ECEFF4] leading-[1.12]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              A Secretária IA que lota a sua agenda no WhatsApp.{' '}
              <span className="bg-gradient-to-r from-[#ECEFF4] via-[#88C0D0] to-[#81A1C1] bg-clip-text text-transparent">
                24 horas por dia, sem você parar de trabalhar.
              </span>
            </motion.h1>

            {/* Subtítulo com os Nichos Principais */}
            <motion.p 
              className="text-sm sm:text-base lg:text-lg text-[#D8DEE9]/90 leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Projetado sob medida para <strong>Barbearias, Salões de Beleza, Clínicas de Estética, Odontologia, Pet Shops e Estúdios de Tatuagem</strong>. O robô atende imediatamente, valida horários com código PIN e dispara lembretes que eliminam as faltas.
            </motion.p>

            {/* CTAs com Estilo Pill e Efeitos de Hover */}
            <motion.div 
              className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <motion.a
                href="#planos"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-[#88C0D0] px-8 py-4 text-xs sm:text-sm font-black text-[#242933] shadow-xl shadow-[#88C0D0]/20 hover:bg-[#88C0D0]/90 transition-colors text-center cursor-pointer"
              >
                <span>Começar Agora</span>
                <ArrowRight className="h-4 w-4" />
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
                  <Eye className="h-4 w-4 text-[#88C0D0]" />
                  <span>Ver Demonstração ao Vivo</span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Prova Social Rápida */}
            <motion.div 
              className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-[#D8DEE9]/80 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#A3BE8C]" />
                <span>+140.000 agendamentos concluídos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex text-[#EBCB8B]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-[#EBCB8B]" />
                  ))}
                </div>
                <span>4.9★ por donos de negócios</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#88C0D0]" />
                <span>Confiado por estabelecimentos de alta performance</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Coluna Direita: Plano Médio (Simulador) + Plano Frontal (Selo de Trava) */}
          <motion.div
            style={{ y: mockupY }}
            className="lg:col-span-6 w-full min-w-0 max-w-full flex flex-col items-center relative pb-4 sm:pb-6"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroInteractiveMockup />

            <motion.div
              style={{ y: fgY }}
              className="hidden sm:flex items-center gap-2.5 rounded-2xl border border-[#88C0D0]/30 bg-[#242933]/95 px-4 py-2.5 shadow-xl shadow-black/50 backdrop-blur-xl self-start mt-3 sm:mt-0 sm:absolute sm:bottom-0 sm:left-2 lg:left-0 pointer-events-none"
              aria-hidden="true"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#A3BE8C]/15 text-[#A3BE8C] border border-[#A3BE8C]/30">
                <Lock className="h-3.5 w-3.5" />
              </span>
              <div className="leading-tight">
                <p className="text-[11px] font-bold text-[#ECEFF4]">Trava de 10 min ativa</p>
                <p className="text-[10px] font-mono text-[#88C0D0]">Validação por PIN no WhatsApp</p>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}