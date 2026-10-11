'use client';

// ==============================================================================
// BentoShowcase — A Máquina de Faturamento (Bento Grid Interativo)
// Arquivo: components/landing/BentoShowcase.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BentoShowcase() {
  // Estado para o contador de reputação (evita erro de hidratação SSR vs Client)
  const [rating, setRating] = useState('4.2');
  const [tickerIndex, setTickerIndex] = useState(0);

  // Depoimentos curtos do ticker vertical
  const testimonials = [
    { name: 'Barbearia do Zé', text: '+48 avaliações 5★ este mês' },
    { name: 'Clínica OdontoLife', text: 'Zero no-show nas sextas-feiras' },
    { name: 'Studio Bella', text: 'Agenda cheia sem secretária' },
    { name: 'Dr. Lucas Fisioterapia', text: '72% agendado fora do horário' },
  ];

  useEffect(() => {
    // Interpolação suave de 4.2 para 4.9 após montagem no cliente
    const timer = setTimeout(() => {
      setRating('4.9');
    }, 400);

    // Ticker vertical alternando depoimentos a cada 3.5 segundos
    const tickerInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % testimonials.length);
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearInterval(tickerInterval);
    };
  }, [testimonials.length]);

  // Horários do gráfico noturno (Card 4)
  const hourlyData = [
    { hour: '08h', pct: 25, isNight: false },
    { hour: '11h', pct: 40, isNight: false },
    { hour: '14h', pct: 50, isNight: false },
    { hour: '17h', pct: 45, isNight: false },
    { hour: '19h', pct: 60, isNight: false },
    { hour: '21h', pct: 95, isNight: true },
    { hour: '22h', pct: 88, isNight: true },
    { hour: '23h', pct: 78, isNight: true },
    { hour: '00h', pct: 65, isNight: true },
    { hour: '01h', pct: 45, isNight: true },
    { hour: '02h', pct: 35, isNight: true },
  ];

  return (
    <section id="motor" className="relative py-20 sm:py-28 bg-[#242933] overflow-hidden">
      {/* Background Glow sutil */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-[#88C0D0]/5 blur-[160px] pointer-events-none" 
        aria-hidden="true" 
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Cabeçalho Oficial da Seção */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#3B4252] bg-[#2E3440]/90 px-4 py-1.5 text-xs font-semibold text-[#88C0D0] mb-4 backdrop-blur-md"
          >
            <span className="h-2 w-2 rounded-full bg-[#88C0D0] animate-pulse" />
            Engrenagem de Alta Conversão
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#ECEFF4] leading-tight"
          >
            A Máquina de Faturamento{' '}
            <span className="bg-gradient-to-r from-[#88C0D0] via-[#81A1C1] to-[#A3BE8C] bg-clip-text text-transparent">
              dos Negócios Locais
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-4 text-sm sm:text-base text-[#D8DEE9]/80 max-w-2xl mx-auto"
          >
            Veja o que acontece nos bastidores para lotar sua agenda e proteger seu caixa enquanto você atende seus clientes.
          </motion.p>
        </div>

        {/* ============================================================== */}
        {/* BENTO GRID (4 Cards Assimétricos com Framer Motion 60 FPS)      */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 auto-rows-[minmax(200px,auto)]">
          
          {/* ------------------------------------------------------------ */}
          {/* CARD 1: Agenda Automatizada (md:col-span-2 md:row-span-2)     */}
          {/* ------------------------------------------------------------ */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 md:row-span-2 rounded-3xl border border-[#3B4252] bg-[#2E3440] p-6 sm:p-8 flex flex-col justify-between shadow-2xl hover:border-[#88C0D0]/50 transition-colors duration-300 relative overflow-hidden group"
          >
            {/* Glow de fundo */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-60 h-60 rounded-full bg-[#88C0D0]/10 blur-3xl group-hover:bg-[#88C0D0]/20 transition-all duration-500 pointer-events-none" />

            <div className="space-y-4 relative z-10">
              {/* Badge Superior Animada */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#A3BE8C]/40 bg-[#A3BE8C]/10 px-3.5 py-1 text-xs font-bold text-[#A3BE8C]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3BE8C] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3BE8C]" />
                </span>
                <span>✓ Horário das 14h confirmado via WhatsApp</span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#ECEFF4] leading-snug">
                  Agenda Automatizada com Trava Atômica
                </h3>
                <p className="text-xs sm:text-sm text-[#D8DEE9]/80 mt-1.5 leading-relaxed">
                  Sem concorrência de múltiplos clientes no mesmo minuto. O robô bloqueia o horário por 10 minutos, valida o PIN e atualiza a grade em tempo real.
                </p>
              </div>
            </div>

            {/* Grade de Calendário Minimalista com Blocos Deslizantes */}
            <div className="mt-6 pt-5 border-t border-[#3B4252]/80 space-y-3 relative z-10">
              <div className="flex items-center justify-between text-xs text-[#D8DEE9]/60 font-mono pb-1">
                <span>HOJE • SALA 01</span>
                <span className="text-[#88C0D0] font-bold">100% SINCRONIZADO</span>
              </div>

              {/* Slots de Horários Interativos */}
              <div className="grid grid-cols-3 gap-2.5">
                {/* Slot 1 - Desliza suavemente em #81A1C1 */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="rounded-2xl border border-[#81A1C1]/40 bg-[#81A1C1]/20 p-3 flex flex-col justify-between shadow-sm"
                >
                  <span className="text-xs font-bold text-[#ECEFF4]">10:00</span>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#81A1C1] font-medium truncate">Corte / Barba</span>
                    <span className="text-xs">🔒</span>
                  </div>
                </motion.div>

                {/* Slot 2 - Desliza suavemente em #81A1C1 */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="rounded-2xl border border-[#81A1C1]/40 bg-[#81A1C1]/20 p-3 flex flex-col justify-between shadow-sm"
                >
                  <span className="text-xs font-bold text-[#ECEFF4]">11:30</span>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#81A1C1] font-medium truncate">Consulta Odonto</span>
                    <span className="text-xs">🔒</span>
                  </div>
                </motion.div>

                {/* Slot 3 - Desliza em #A3BE8C (Confirmado via WhatsApp) */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="rounded-2xl border border-[#A3BE8C]/50 bg-[#A3BE8C]/25 p-3 flex flex-col justify-between shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#ECEFF4]">14:00</span>
                    <span className="text-[10px] font-black text-[#A3BE8C] uppercase tracking-wider bg-[#242933]/60 px-1.5 py-0.5 rounded">PIN OK</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#A3BE8C] font-black truncate">Marcos Silva</span>
                    <span className="text-xs font-bold text-[#A3BE8C]">✓✓</span>
                  </div>
                </motion.div>
              </div>

              {/* Indicadores no Rodapé do Card */}
              <div className="flex items-center justify-between pt-2 text-[11px] text-[#D8DEE9]/70 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#81A1C1]" />
                  Trava 10min
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#A3BE8C]" />
                  Validado com PIN
                </span>
                <span className="flex items-center gap-1.5 text-[#88C0D0]">
                  ⚡ Sem conflitos
                </span>
              </div>
            </div>
          </motion.div>

          {/* ------------------------------------------------------------ */}
          {/* CARD 2: Reputação Google 5 Estrelas (md:col-span-1 md:row-1)   */}
          {/* ------------------------------------------------------------ */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            whileHover={{ y: -4 }}
            className="md:col-span-1 md:row-span-1 rounded-3xl border border-[#3B4252] bg-[#2E3440] p-6 flex flex-col justify-between shadow-xl hover:border-[#88C0D0]/50 transition-colors duration-300 relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#EBCB8B]">
                  Google Reviews
                </span>
                <span className="text-[10px] font-mono text-[#D8DEE9]/50">Pós-Consulta</span>
              </div>

              {/* Contador Interpolado + Estrelas que acendem */}
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#ECEFF4] tracking-tight tabular-nums transition-all duration-500">
                  {rating}
                </span>
                <div className="flex text-[#EBCB8B] text-base tracking-tighter">
                  {['★', '★', '★', '★', '★'].map((star, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0.3, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                    >
                      {star}
                    </motion.span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[#D8DEE9]/70 mt-1">
                Disparo 2h após o atendimento concluído.
              </p>
            </div>

            {/* Ticker Vertical Alternando Depoimentos Curtos */}
            <div className="mt-4 pt-3 border-t border-[#3B4252]/80 h-14 overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tickerIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-0.5"
                >
                  <p className="text-[11px] font-bold text-[#88C0D0]">
                    {testimonials[tickerIndex].name}
                  </p>
                  <p className="text-[11px] text-[#ECEFF4] font-medium truncate">
                    &ldquo;{testimonials[tickerIndex].text}&rdquo;
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ------------------------------------------------------------ */}
          {/* CARD 3: Trava Anti-Falta (md:col-span-1 md:row-span-1)         */}
          {/* ------------------------------------------------------------ */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            whileHover={{ y: -4 }}
            className="md:col-span-1 md:row-span-1 rounded-3xl border border-[#3B4252] bg-[#2E3440] p-6 flex flex-col justify-between shadow-xl hover:border-[#88C0D0]/50 transition-colors duration-300 relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between">
                {/* Ícone de Cadeado com Microfechamento */}
                <motion.div 
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#A3BE8C]/15 border border-[#A3BE8C]/30 text-[#A3BE8C]"
                  initial={{ scale: 0.9 }}
                  whileInView={{ scale: [0.9, 1.1, 1] }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.5 }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </motion.div>

                <span className="text-[10px] font-mono font-bold text-[#A3BE8C] bg-[#A3BE8C]/10 border border-[#A3BE8C]/30 px-2 py-0.5 rounded-full">
                  Zero No-Show
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-[#ECEFF4] mt-3 leading-snug">
                Trava Anti-Falta Garantida
              </h3>

              {/* Badge de Sinal Garantido */}
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#A3BE8C]/15 border border-[#A3BE8C]/30 px-2.5 py-1 text-[11px] font-bold text-[#A3BE8C]">
                <span>✓</span>
                <span>Sinal de 20% Garantido via Pix</span>
              </div>
            </div>

            {/* Timeline com Checks de Confirmação */}
            <div className="mt-4 pt-3 border-t border-[#3B4252]/80 space-y-1.5 text-[11px] text-[#D8DEE9]/80 font-medium">
              <div className="flex items-center justify-between">
                <span>1. Reserva</span>
                <span className="text-[#A3BE8C] font-bold">✓ Slot Bloqueado</span>
              </div>
              <div className="flex items-center justify-between">
                <span>2. WhatsApp</span>
                <span className="text-[#A3BE8C] font-bold">✓ PIN Validado</span>
              </div>
              <div className="flex items-center justify-between">
                <span>3. 2h Antes</span>
                <span className="text-[#88C0D0] font-bold">✓ Lembrete Ativo</span>
              </div>
            </div>
          </motion.div>

          {/* ------------------------------------------------------------ */}
          {/* CARD 4: Atendimento 24h Autônomo (md:col-span-2 md:row-span-1)*/}
          {/* ------------------------------------------------------------ */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 md:row-span-1 rounded-3xl border border-[#3B4252] bg-[#2E3440] p-6 sm:p-7 flex flex-col justify-between shadow-xl hover:border-[#88C0D0]/50 transition-colors duration-300 relative overflow-hidden"
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

              {/* Etiqueta Destaque */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#88C0D0]/10 border border-[#88C0D0]/30 px-3 py-1 text-xs font-bold text-[#88C0D0] shrink-0 self-start sm:self-auto">
                <span className="h-2 w-2 rounded-full bg-[#88C0D0] animate-pulse" />
                <span>68% fora do expediente comercial</span>
              </div>
            </div>

            {/* Gráfico de Distribuição com Colunas Verticais em Cascata */}
            <div className="mt-6 pt-4 border-t border-[#3B4252]/80">
              <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-20 pt-2 px-1">
                {hourlyData.map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <motion.div
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ delay: 0.15 + idx * 0.04, duration: 0.5, ease: 'easeOut' }}
                      style={{ 
                        height: `${item.pct}%`,
                        transformOrigin: 'bottom',
                      }}
                      className={`w-full rounded-t-md transition-all ${
                        item.isNight 
                          ? 'bg-[#88C0D0] shadow-md shadow-[#88C0D0]/20' 
                          : 'bg-[#4C566A]/60'
                      }`}
                    />
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
