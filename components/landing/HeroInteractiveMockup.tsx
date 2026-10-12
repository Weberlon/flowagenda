'use client';

// ==============================================================================
// HeroInteractiveMockup — Painel Central em Vidro (Simulador em Loop de 8s)
// Arquivo: components/landing/HeroInteractiveMockup.tsx
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HeroInteractiveMockup() {
  const [mounted, setMounted] = useState(false);
  const [activeSegment, setActiveSegment] = useState<'agil' | 'clinicas'>('agil');
  
  // Loop Coordenado de 8 segundos (0s -> 2s -> 4s -> 6s -> 8s)
  // Step 0: Mensagem do cliente entra
  // Step 1: Reação do Bot WhatsApp (feixe de luz + badge pulsando)
  // Step 2: Trava do slot 15:30 na grade (Pré-reservado + cadeado)
  // Step 3: Revelação sequencial do PIN + contagem regressiva
  const [simStep, setSimStep] = useState<number>(0);
  const [countdownSecs, setCountdownSecs] = useState<number>(582); // 09:42

  useEffect(() => {
    setMounted(true);

    const stepInterval = setInterval(() => {
      setSimStep((prev) => (prev + 1) % 4);
    }, 2000);

    const countdownInterval = setInterval(() => {
      setCountdownSecs((prev) => (prev > 0 ? prev - 1 : 582));
    }, 1000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const pinDigits = ['8', '4', '9', '2'];

  return (
    <div className="w-full max-w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#2E3440]/90 text-[#ECEFF4] shadow-2xl shadow-black/50 hover:border-[#88C0D0]/40 hover:shadow-[#88C0D0]/5 backdrop-blur-xl transition-all duration-500">
      
      {/* Top Bar / Janela estilo MacOS com Glassmorphism */}
      <div className="border-b border-white/[0.08] bg-[#242933]/95 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#BF616A]/90 inline-block shadow-xs" />
          <span className="h-3 w-3 rounded-full bg-[#EBCB8B]/90 inline-block shadow-xs" />
          <span className="h-3 w-3 rounded-full bg-[#A3BE8C]/90 inline-block shadow-xs" />
          <span className="ml-2 text-[11px] font-mono text-[#D8DEE9]/50 hidden sm:inline-block">
            sistema.flowagenda.online/live-sync
          </span>
        </div>

        {/* Seletor Superior com Pílulas Elegantes */}
        <div className="inline-flex rounded-full bg-[#1E232A]/90 p-1 border border-white/[0.06] shadow-inner">
          <button
            type="button"
            onClick={() => setActiveSegment('agil')}
            className={`flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1 text-xs font-semibold transition-all duration-300 ${
              activeSegment === 'agil'
                ? 'bg-[#3B4252] text-[#88C0D0] shadow-sm border border-[#88C0D0]/30 font-bold'
                : 'text-[#D8DEE9]/60 hover:text-[#ECEFF4]'
            }`}
          >
            <span>⚡ Serviços Locais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('clinicas')}
            className={`flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1 text-xs font-semibold transition-all duration-300 ${
              activeSegment === 'clinicas'
                ? 'bg-[#3B4252] text-[#88C0D0] shadow-sm border border-[#88C0D0]/30 font-bold'
                : 'text-[#D8DEE9]/60 hover:text-[#ECEFF4]'
            }`}
          >
            <span>🛡️ Clínicas & Saúde</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal do Simulador */}
      <div className="p-4 sm:p-6 lg:p-7 space-y-5">
        
        {/* Header do Estabelecimento com Status em Tempo Real */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#88C0D0] to-[#81A1C1] text-[#242933] font-black text-sm shadow-md">
              {activeSegment === 'agil' ? 'VC' : 'CL'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-[#ECEFF4]">
                  {activeSegment === 'agil' ? 'Barbearia Vintage Club' : 'Clínica OdontoLife'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A3BE8C]/15 text-[#A3BE8C] font-semibold border border-[#A3BE8C]/30">
                  Google 5.0 ★
                </span>
              </div>
              <p className="text-xs text-[#D8DEE9]/60 font-mono">
                {activeSegment === 'agil' ? 'vintageclub.flowagenda.online' : 'odontolife.com.br'}
              </p>
            </div>
          </div>

          {/* Badge Reativo (Step >= 1 emite pulso) */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border transition-all duration-500 self-start sm:self-auto ${
            simStep >= 1
              ? 'bg-[#A3BE8C]/15 text-[#A3BE8C] border-[#A3BE8C]/40 ring-2 ring-[#A3BE8C]/20'
              : 'bg-[#2E3440] text-[#D8DEE9]/70 border-white/[0.08]'
          }`}>
            <span className={`h-2 w-2 rounded-full ${simStep >= 1 ? 'bg-[#A3BE8C] animate-pulse' : 'bg-[#D8DEE9]/40'}`} />
            <span className="font-semibold">
              {simStep >= 1 ? 'Atendimento WhatsApp Ativo' : 'Aguardando Mensagem'}
            </span>
          </div>
        </div>

        {/* Grid Dividido: Grade de Horários (Esquerda) vs Balão WhatsApp & Trava PIN (Direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* ============================================================== */}
          {/* COLUNA ESQUERDA: Grade da Agenda com Slot das 15:30            */}
          {/* ============================================================== */}
          <div className="lg:col-span-7 rounded-2xl border border-white/[0.06] bg-[#242933]/90 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-inner">
            <div className="flex items-center justify-between text-xs font-mono text-[#D8DEE9]/70">
              <span className="font-bold uppercase tracking-wider text-[#ECEFF4]">Grade de Horários • Hoje</span>
              <span className="text-[#88C0D0]">Tempo Real</span>
            </div>

            {/* Grid com 6 Slots de Horário */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* 10:00 - Ocupado */}
              <div className="rounded-xl border border-white/[0.05] bg-[#2E3440]/60 p-2.5 text-center text-[#D8DEE9]/50">
                <span className="font-mono block">10:00</span>
                <span className="text-[10px] text-[#BF616A] font-semibold mt-0.5 block">Ocupado</span>
              </div>

              {/* 11:30 - Ocupado */}
              <div className="rounded-xl border border-white/[0.05] bg-[#2E3440]/60 p-2.5 text-center text-[#D8DEE9]/50">
                <span className="font-mono block">11:30</span>
                <span className="text-[10px] text-[#BF616A] font-semibold mt-0.5 block">Ocupado</span>
              </div>

              {/* 14:00 - Livre */}
              <div className="rounded-xl border border-[#3B4252] bg-[#2E3440] p-2.5 text-center text-[#ECEFF4]">
                <span className="font-mono block">14:00</span>
                <span className="text-[10px] text-[#A3BE8C] font-semibold mt-0.5 block">Disponível</span>
              </div>

              {/* 15:30 - O SLOT ALVO QUE MUDA DE ESTADO (Step 2 e 3) */}
              <motion.div 
                animate={{
                  borderColor: simStep >= 2 ? '#88C0D0' : '#3B4252',
                  backgroundColor: simStep >= 2 ? 'rgba(136, 192, 208, 0.15)' : 'rgba(46, 52, 64, 1)',
                  scale: simStep >= 2 ? [1, 1.03, 1] : 1,
                }}
                transition={{ duration: 0.4 }}
                className={`rounded-xl border p-2.5 text-center transition-all ${
                  simStep >= 2
                    ? 'border-[#88C0D0] ring-2 ring-[#88C0D0]/30 shadow-lg shadow-[#88C0D0]/10'
                    : 'border-[#3B4252] bg-[#2E3440]'
                }`}
              >
                <div className="flex items-center justify-center gap-1 font-mono font-bold text-[#ECEFF4]">
                  <span>15:30</span>
                  {simStep >= 2 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-[#88C0D0] text-[11px]"
                    >
                      🔒
                    </motion.span>
                  )}
                </div>
                <span className={`text-[10px] font-bold mt-0.5 block transition-colors ${
                  simStep >= 2 ? 'text-[#88C0D0]' : 'text-[#A3BE8C]'
                }`}>
                  {simStep >= 2 ? 'Pré-reservado' : 'Disponível'}
                </span>
              </motion.div>

              {/* 17:00 - Disponível */}
              <div className="rounded-xl border border-[#3B4252] bg-[#2E3440] p-2.5 text-center text-[#ECEFF4]">
                <span className="font-mono block">17:00</span>
                <span className="text-[10px] text-[#A3BE8C] font-semibold mt-0.5 block">Disponível</span>
              </div>

              {/* 18:30 - Ocupado */}
              <div className="rounded-xl border border-white/[0.05] bg-[#2E3440]/60 p-2.5 text-center text-[#D8DEE9]/50">
                <span className="font-mono block">18:30</span>
                <span className="text-[10px] text-[#BF616A] font-semibold mt-0.5 block">Ocupado</span>
              </div>
            </div>

            {/* Rodapé da Grade com Status da Trava */}
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#D8DEE9]/70 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#88C0D0]" />
                Trava Atômica: 10 min
              </span>
              <span className="text-[#A3BE8C] font-bold">
                {simStep >= 2 ? '✓ Slot Bloqueado' : 'Pronto para Reserva'}
              </span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* COLUNA DIREITA: Simulação WhatsApp + Revelação do PIN          */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            
            {/* Balão 1: Mensagem do Cliente (Step 0+) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-white/[0.08] bg-[#242933] p-3.5 space-y-1 shadow-md self-end max-w-[90%]"
            >
              <div className="flex items-center justify-between text-[10px] text-[#D8DEE9]/50">
                <span className="font-bold text-[#88C0D0]">Cliente</span>
                <span className="font-mono">15:29</span>
              </div>
              <p className="text-xs text-[#ECEFF4] leading-relaxed">
                &ldquo;Olá! Gostaria de agendar para amanhã às 15h30.&rdquo;
              </p>
            </motion.div>

            {/* Balão 2: Resposta do Robô + Feixe de Luz (Step 1+) */}
            <motion.div
              animate={{
                borderColor: simStep >= 1 ? 'rgba(136, 192, 208, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                boxShadow: simStep >= 1 ? '0 0 20px -3px rgba(136, 192, 208, 0.2)' : 'none',
              }}
              transition={{ duration: 0.5 }}
              className={`rounded-2xl border bg-[#2E3440] p-3.5 space-y-2 shadow-md relative overflow-hidden transition-all ${
                simStep >= 1 ? 'ring-2 ring-[#88C0D0]/30' : ''
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-[#D8DEE9]/60">
                <span className="font-bold text-[#A3BE8C] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#A3BE8C]" />
                  FlowAgenda Robô 24/7
                </span>
                <span className="font-mono text-[#88C0D0]">Agora</span>
              </div>

              <p className="text-xs text-[#ECEFF4] leading-relaxed">
                {simStep >= 2
                  ? '🔒 Horário pré-reservado com sucesso! Digite o código PIN abaixo para confirmar sua presença:'
                  : '🤖 Identificando horários vagos e preparando seu link seguro...'}
              </p>

              {/* Revelação Escalonada do PIN de 4 dígitos (Step 3) */}
              {simStep >= 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="mt-2 rounded-xl border border-[#88C0D0]/40 bg-[#242933] p-2.5 space-y-2 text-center"
                >
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#88C0D0]">
                    Código PIN de Confirmação
                  </span>

                  {/* 4 Dígitos revelados sequencialmente */}
                  <div className="flex items-center justify-center gap-2">
                    {pinDigits.map((digit, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.12, duration: 0.3 }}
                        className="h-9 w-9 rounded-lg border border-[#88C0D0]/50 bg-[#2E3440] flex items-center justify-center font-mono font-black text-base text-[#ECEFF4] shadow-sm"
                      >
                        {digit}
                      </motion.div>
                    ))}
                  </div>

                  {/* Contagem regressiva ativa */}
                  <div className="flex items-center justify-between pt-1 px-1 text-[10px] font-mono">
                    <span className="text-[#EBCB8B] font-semibold">
                      ⏱️ Expira em {mounted ? formatCountdown(countdownSecs) : '09:42'}
                    </span>
                    <span className="text-[#A3BE8C] font-bold">
                      ✓ Canal Seguro
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Barra de Progresso do Loop de 8 segundos */}
            <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-[#D8DEE9]/50">
              <span>Sincronização Ativa</span>
              <span className="text-[#88C0D0]">Loop Coordenado (8s)</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
