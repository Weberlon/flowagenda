'use client';

// ==============================================================================
// BentoShowcase — A Máquina de Faturamento (Bento Grid Elite SaaS)
// Estética: Nord Dark, Glassmorphism, Border Glow & Aceleração por Hardware
// Arquivo: components/landing/BentoShowcase.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BentoShowcase() {
  const [mounted, setMounted] = useState(false);
  const [rating, setRating] = useState('4.2');
  const [tickerIndex, setTickerIndex] = useState(0);

  // Depoimentos curtos do ticker vertical (alterna a cada 6 segundos)
  const testimonials = [
    { author: 'Barbearia do Zé', role: 'Barbearia & Navalha', text: '+48 avaliações 5★ coletadas no Google este mês' },
    { author: 'Dra. Camila Meireles', role: 'Clínica Odontológica', text: 'Zero faltas nas sextas-feiras com a trava de PIN' },
    { author: 'Studio Bella Arte', role: 'Salão & Estética', text: 'Agenda lotada 24/7 sem precisar pagar secretária' },
    { author: 'Dr. Lucas Fisioterapia', role: 'Consultório Especializado', text: '72% dos pacientes agendam após as 21h da noite' },
  ];

  useEffect(() => {
    setMounted(true);

    // Odometer: Interpolação suave de 4.2 para 4.9 após montagem no cliente
    const timer = setTimeout(() => {
      setRating('4.9');
    }, 450);

    // Ticker vertical alternando depoimentos a cada 6 segundos
    const tickerInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);

    return () => {
      clearTimeout(timer);
      clearInterval(tickerInterval);
    };
  }, [testimonials.length]);

  // Dados do gráfico de distribuição noturna
  const hourlyData = [
    { hour: '08h', pct: 24, isNight: false },
    { hour: '11h', pct: 38, isNight: false },
    { hour: '14h', pct: 48, isNight: false },
    { hour: '17h', pct: 42, isNight: false },
    { hour: '19h', pct: 58, isNight: false },
    { hour: '21h', pct: 96, isNight: true },
    { hour: '22h', pct: 90, isNight: true },
    { hour: '23h', pct: 82, isNight: true },
    { hour: '00h', pct: 68, isNight: true },
    { hour: '01h', pct: 48, isNight: true },
    { hour: '02h', pct: 36, isNight: true },
  ];

  // Dias da grade semanal minimalista do Card 1
  const weekDays = [
    { day: 'SEG', num: '14' },
    { day: 'TER', num: '15' },
    { day: 'QUA', num: '16', isToday: true },
    { day: 'QUI', num: '17' },
    { day: 'SEX', num: '18' },
  ];

  return (
    <section id="motor" className="relative py-20 sm:py-28 bg-[#242933] overflow-hidden">
      
      {/* ================================================================ */}
      {/* AURORA MESH GRADIENT DIFUSO (EFEITO LUXO / ALTO VALOR)           */}
      {/* ================================================================ */}
      <div 
        className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#81A1C1]/[0.07] blur-[120px] animate-pulse pointer-events-none" 
        style={{ animationDuration: '8s' }}
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-1/4 right-1/4 translate-x-1/3 translate-y-1/3 h-[550px] w-[550px] rounded-full bg-[#88C0D0]/[0.08] blur-[120px] animate-pulse pointer-events-none" 
        style={{ animationDuration: '8s', animationDelay: '4s' }}
        aria-hidden="true" 
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#2E3440]/90 px-4 py-1.5 text-xs font-semibold text-[#88C0D0] mb-4 backdrop-blur-xl shadow-sm"
          >
            <span className="h-2 w-2 rounded-full bg-[#88C0D0] animate-pulse" />
            Engrenagem de Alta Conversão
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#ECEFF4] leading-tight"
          >
            A Máquina de Faturamento{' '}
            <span className="bg-gradient-to-r from-[#88C0D0] via-[#81A1C1] to-[#A3BE8C] bg-clip-text text-transparent">
              dos Negócios Locais
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-4 text-sm sm:text-base text-[#D8DEE9]/80 max-w-2xl mx-auto font-normal"
          >
            Sincronização de missão crítica entre WhatsApp, Google Meu Negócio e grade de horários com zero atrito para o cliente.
          </motion.p>
        </div>

        {/* ============================================================== */}
        {/* BENTO GRID (4 Cards Assimétricos com Hardware Acceleration)    */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 auto-rows-[minmax(210px,auto)]">
          
          {/* ============================================================== */}
          {/* CARD 1: Agenda com Trava Atômica (md:col-span-2 md:row-span-2) */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 md:row-span-2 rounded-3xl border border-white/[0.08] bg-[#2E3440]/90 p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-black/40 hover:border-[#88C0D0]/40 hover:shadow-[#88C0D0]/5 backdrop-blur-xl transition-all duration-500 relative overflow-hidden group"
          >
            {/* Glow sutil no hover */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-[#88C0D0]/10 blur-3xl group-hover:bg-[#88C0D0]/20 transition-all duration-700 pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#A3BE8C]/30 bg-[#A3BE8C]/10 px-3.5 py-1 text-xs font-bold text-[#A3BE8C]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3BE8C] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3BE8C]" />
                  </span>
                  <span>Trava Atômica de 10 min</span>
                </span>
                
                {/* Selo 100% Sincronizado com Brilho Verde */}
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#A3BE8C] bg-[#A3BE8C]/15 border border-[#A3BE8C]/30 px-2.5 py-0.5 rounded-full shadow-xs shadow-[#A3BE8C]/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#A3BE8C]" />
                  100% Sincronizado
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#ECEFF4] leading-snug">
                  Agenda com Trava Atômica & Sincronização em Tempo Real
                </h3>
                <p className="text-xs sm:text-sm text-[#D8DEE9]/80 mt-1.5 leading-relaxed">
                  Elimine concorrência de múltiplos clientes no mesmo slot. Quando a reserva inicia, o horário é isolado imediatamente e validado via PIN no WhatsApp.
                </p>
              </div>
            </div>

            {/* Grade Semanal Minimalista com Slot Deslizante */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-3.5 relative z-10">
              
              {/* Navegação Semanal */}
              <div className="flex items-center justify-between gap-1.5">
                {weekDays.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`flex-1 py-1.5 px-2 rounded-xl text-center border transition-all ${
                      item.isToday 
                        ? 'border-[#88C0D0]/50 bg-[#88C0D0]/15 text-[#ECEFF4] font-bold shadow-xs' 
                        : 'border-white/[0.04] bg-[#242933]/60 text-[#D8DEE9]/50'
                    }`}
                  >
                    <span className="text-[10px] block font-mono leading-none">{item.day}</span>
                    <span className="text-xs font-bold leading-tight mt-0.5 block">{item.num}</span>
                  </div>
                ))}
              </div>

              {/* Slots de Horários */}
              <div className="space-y-2 pt-1">
                {/* Slot Anterior: Isolamento com Cadeado */}
                <div className="rounded-2xl border border-white/[0.05] bg-[#242933]/70 p-3 flex items-center justify-between text-xs text-[#D8DEE9]/60">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[#D8DEE9]/80 font-bold">10:30</span>
                    <span className="text-xs text-[#D8DEE9]/50">Atendimento Concluído</span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-[#81A1C1]">
                    <span>🔒</span>
                    <span>Isolado</span>
                  </span>
                </div>

                {/* Slot em Destaque: "14:00 - Marcos Silva" deslizando com Spring Physics */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                  className="rounded-2xl border border-[#A3BE8C]/50 bg-[#A3BE8C]/15 p-3.5 flex items-center justify-between shadow-lg shadow-[#A3BE8C]/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-[#ECEFF4]">14:00</span>
                    <div>
                      <p className="text-xs font-bold text-[#ECEFF4]">Marcos Silva</p>
                      <p className="text-[10px] text-[#A3BE8C] font-mono">PIN Validado • Confirmado WhatsApp</p>
                    </div>
                  </div>
                  <span className="h-7 px-2.5 rounded-lg bg-[#A3BE8C] text-[#242933] font-black text-xs inline-flex items-center justify-center shadow-sm">
                    ✓ Presença OK
                  </span>
                </motion.div>

                {/* Slot Seguinte: Disponível */}
                <div className="rounded-2xl border border-white/[0.05] bg-[#242933]/70 p-3 flex items-center justify-between text-xs text-[#D8DEE9]/60">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[#D8DEE9]/80 font-bold">16:30</span>
                    <span className="text-xs text-[#A3BE8C] font-semibold">Disponível para Agendamento</span>
                  </div>
                  <span className="text-[11px] text-[#88C0D0] font-mono font-bold">⚡ Slot Livre</span>
                </div>
              </div>

            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* CARD 2: Odometer de Reputação Google 5★ (md:col-span-1)       */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            whileHover={{ y: -4 }}
            className="md:col-span-1 md:row-span-1 rounded-3xl border border-white/[0.08] bg-[#2E3440]/90 p-6 flex flex-col justify-between shadow-2xl shadow-black/40 hover:border-[#88C0D0]/40 hover:shadow-[#88C0D0]/5 backdrop-blur-xl transition-all duration-500 relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#EBCB8B]">
                  Google Reviews
                </span>
                <span className="text-[10px] font-mono text-[#D8DEE9]/50">2h Pós-Consulta</span>
              </div>

              {/* Contador Odometer Interpolado Seguro + 5 Estrelas Vetoriais */}
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#ECEFF4] tracking-tight tabular-nums">
                  {mounted ? rating : '4.2'}
                </span>

                <div className="flex text-[#EBCB8B] text-base tracking-tighter">
                  {[1, 2, 3, 4, 5].map((starIdx) => (
                    <motion.svg
                      key={starIdx}
                      className="h-4 w-4 fill-[#EBCB8B] text-[#EBCB8B]"
                      viewBox="0 0 20 20"
                      initial={{ opacity: 0.4, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ delay: 0.2 + starIdx * 0.08, duration: 0.3 }}
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </motion.svg>
                  ))}
                </div>
              </div>

              <p className="text-xs text-[#D8DEE9]/70 mt-1">
                Disparo automatizado nos momentos de satisfação.
              </p>
            </div>

            {/* Ticker Vertical Alternando Depoimentos (6s) */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] h-14 overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tickerIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-0.5"
                >
                  <p className="text-[11px] font-bold text-[#88C0D0]">
                    {testimonials[tickerIndex].author}
                  </p>
                  <p className="text-[11px] text-[#ECEFF4] font-medium truncate">
                    &ldquo;{testimonials[tickerIndex].text}&rdquo;
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* CARD 3: Trava Anti-Falta / Proteção de Receita (md:col-span-1) */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            whileHover={{ y: -4 }}
            className="md:col-span-1 md:row-span-1 rounded-3xl border border-white/[0.08] bg-[#2E3440]/90 p-6 flex flex-col justify-between shadow-2xl shadow-black/40 hover:border-[#88C0D0]/40 hover:shadow-[#88C0D0]/5 backdrop-blur-xl transition-all duration-500 relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between">
                {/* Ícone de Escudo/Cadeado com Microfechamento Limpo */}
                <motion.div 
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#A3BE8C]/15 border border-[#A3BE8C]/30 text-[#A3BE8C] shadow-sm"
                  initial={{ scale: 0.85 }}
                  whileInView={{ scale: [0.85, 1.1, 1] }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </motion.div>

                <span className="text-[10px] font-mono font-bold text-[#A3BE8C] bg-[#A3BE8C]/10 border border-[#A3BE8C]/30 px-2 py-0.5 rounded-full">
                  Zero No-Show
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-[#ECEFF4] mt-3 leading-snug">
                Trava Anti-Falta & Proteção de Receita
              </h3>

              {/* Badge em Verde-Aurora */}
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#A3BE8C]/15 border border-[#A3BE8C]/30 px-2.5 py-1 text-[11px] font-bold text-[#A3BE8C]">
                <span>✓</span>
                <span>Sinal de 20% Garantido via Pix</span>
              </div>
            </div>

            {/* Barra de Progresso Sequencial em 3 Etapas com Checks Animados */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-1.5 text-[11px] text-[#D8DEE9]/80 font-medium">
              <motion.div 
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <span>1. Slot Bloqueado</span>
                <span className="text-[#A3BE8C] font-bold">✓ Trava 10min</span>
              </motion.div>

              <motion.div 
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: 0.42, duration: 0.4 }}
              >
                <span>2. PIN Validado</span>
                <span className="text-[#A3BE8C] font-bold">✓ WhatsApp</span>
              </motion.div>

              <motion.div 
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: 0.54, duration: 0.4 }}
              >
                <span>3. Lembrete Ativo</span>
                <span className="text-[#88C0D0] font-bold">✓ 2h Antes</span>
              </motion.div>
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* CARD 4: Atendimento 24h Autônomo (md:col-span-2 md:row-span-1)*/}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 md:row-span-1 rounded-3xl border border-white/[0.08] bg-[#2E3440]/90 p-6 sm:p-7 flex flex-col justify-between shadow-2xl shadow-black/40 hover:border-[#88C0D0]/40 hover:shadow-[#88C0D0]/5 backdrop-blur-xl transition-all duration-500 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
                  Comportamento do Consumidor
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#ECEFF4] mt-0.5">
                  Atendimento 24h Autônomo no WhatsApp
                </h3>
              </div>

              {/* Badge em Destaque */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#88C0D0]/10 border border-[#88C0D0]/30 px-3 py-1 text-xs font-bold text-[#88C0D0] shrink-0 self-start sm:self-auto shadow-xs">
                <span className="h-2 w-2 rounded-full bg-[#88C0D0] animate-pulse" />
                <span>68% dos agendamentos ocorrem fora do expediente comercial</span>
              </div>
            </div>

            {/* Gráfico de Colunas Verticais em Cascata com Feixe Luminoso no Topo */}
            <div className="mt-6 pt-4 border-t border-white/[0.06]">
              <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-20 pt-2 px-1">
                {hourlyData.map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <motion.div
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ delay: 0.15 + idx * 0.04, duration: 0.5, ease: 'easeOut' }}
                      style={{ 
                        height: `${item.pct}%`,
                        transformOrigin: 'bottom',
                      }}
                      className={`w-full rounded-t-md relative transition-all ${
                        item.isNight 
                          ? 'bg-[#88C0D0] shadow-md shadow-[#88C0D0]/30' 
                          : 'bg-[#4C566A]/60'
                      }`}
                    >
                      {/* Feixe Luminoso no Topo das Colunas Noturnas */}
                      {item.isNight && (
                        <span className="absolute top-0 left-0 right-0 h-1 bg-white/80 rounded-t-md shadow-xs shadow-white/60" />
                      )}
                    </motion.div>
                    
                    <span className={`text-[10px] font-mono leading-none ${
                      item.isNight ? 'text-[#88C0D0] font-bold' : 'text-[#D8DEE9]/40'
                    }`}>
                      {item.hour}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-[#D8DEE9]/60 font-medium">
                <span>Expediente Comercial (08h às 18h)</span>
                <span className="text-[#88C0D0] font-bold">Pico Noturno: 21h às 02h da madrugada (FlowAgenda Bot ativo)</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
