'use client';

// ==============================================================================
// BentoFeatures — Grade Assimétrica Bento Grid com Framer Motion (Nord Dark)
// Arquivo: components/landing/BentoFeatures.tsx
// ==============================================================================

import React from 'react';
import { motion } from 'framer-motion';

export default function BentoFeatures() {
  return (
    <section id="motor" className="relative py-20 sm:py-28 bg-nord-bg overflow-hidden">
      {/* Background Glow */}
      <div 
        className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-nord-accent/5 blur-[130px] pointer-events-none" 
        aria-hidden="true" 
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-nord-border bg-nord-surface/80 px-4 py-1.5 text-xs font-semibold text-nord-accent mb-4 backdrop-blur-md"
          >
            <span className="h-2 w-2 rounded-full bg-nord-accent animate-pulse" />
            Arquitetura de Alta Conversão
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-nord-text leading-tight"
          >
            Construído para transformar visitantes em{' '}
            <span className="bg-gradient-to-r from-nord-accent via-nord-accent-dark to-nord-success bg-clip-text text-transparent">
              clientes fiéis na sua cadeira.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-4 text-sm sm:text-base text-nord-muted/80 max-w-2xl mx-auto"
          >
            Cada engrenagem foi projetada para eliminar o trabalho manual de secretária e blindar seu estabelecimento contra horários vazios.
          </motion.p>
        </div>

        {/* Grade Bento Grid Assimétrica */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 auto-rows-[minmax(180px,auto)]">
          
          {/* ============================================================== */}
          {/* CARD 1: Automação via WhatsApp Integrada (Span 2x2 - Destaque) */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 lg:col-span-2 lg:row-span-2 rounded-3xl border border-nord-border bg-nord-surface/90 p-6 sm:p-8 flex flex-col justify-between shadow-xl hover:border-nord-accent/50 transition-all duration-300 relative overflow-hidden group"
          >
            {/* Efeito Glow Interno no Hover */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-nord-accent/10 blur-3xl group-hover:bg-nord-accent/20 transition-all duration-500 pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-nord-success/30 bg-nord-success/10 px-3 py-1 text-xs font-semibold text-nord-success">
                  <span className="h-2 w-2 rounded-full bg-nord-success animate-pulse" />
                  Evolution API v2 Conectada
                </span>
                <span className="text-[11px] font-mono text-nord-muted/60">Trava Atômica</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-nord-text leading-snug">
                Robô de WhatsApp com Trava de 10 min & Validação por PIN
              </h3>

              <p className="text-xs sm:text-sm text-nord-muted/85 leading-relaxed">
                Esqueça agendamentos fantasmas. Quando o cliente escolhe o horário, o FlowAgenda bloqueia o slot na hora, dispara um código PIN criptográfico no WhatsApp dele e confirma a presença de forma 100% autônoma.
              </p>
            </div>

            {/* Simulação Visual de Conversa WhatsApp */}
            <div className="mt-6 pt-4 border-t border-nord-border/70 space-y-3 relative z-10">
              <div className="rounded-2xl border border-nord-border bg-nord-bg/90 p-4 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between text-xs text-nord-muted/70">
                  <span className="font-bold text-nord-text">FlowAgenda Bot</span>
                  <span className="font-mono text-[10px] text-nord-accent">Agora</span>
                </div>
                <p className="text-xs text-nord-muted font-sans leading-relaxed">
                  🔐 Olá, Marcos! Seu código PIN de confirmação é <strong className="text-nord-accent font-mono tracking-wider font-black bg-nord-surface px-1.5 py-0.5 rounded border border-nord-border">849-210</strong>.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-mono text-nord-warning">⏱️ Expira em: 09:42</span>
                  <span className="text-[11px] font-bold text-nord-success flex items-center gap-1">
                    <span>✓✓</span> Entregue
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 text-[11px] text-nord-muted/60 font-medium">
                <span>✓ Sem aplicativo para baixar</span>
                <span>✓ Zero digitação de senhas</span>
              </div>
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* CARD 2: Autoridade 5★ no Google Meu Negócio (Span 2x1)         */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="md:col-span-2 lg:col-span-2 rounded-3xl border border-nord-border bg-nord-surface/90 p-6 sm:p-7 flex flex-col justify-between shadow-xl hover:border-nord-accent/50 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-nord-warning/30 bg-nord-warning/10 px-3 py-1 text-xs font-semibold text-nord-warning">
                  ★ Google Reviews 5 Estrelas
                </span>
                <span className="text-[11px] font-mono text-nord-muted/60">Cron Pós-Atendimento</span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-nord-text">
                Robô de Avaliações 5★ para o Topo do Google Local
              </h3>

              <p className="text-xs sm:text-sm text-nord-muted/85 leading-relaxed">
                2 horas após a conclusão do atendimento, o robô dispara um agradecimento caloroso no WhatsApp convidando o cliente a avaliar sua ficha no Google Maps nos momentos de maior satisfação.
              </p>
            </div>

            {/* Visual de Prova Social Google */}
            <div className="mt-4 pt-3 border-t border-nord-border/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex text-nord-warning text-sm tracking-tighter">
                  ★★★★★
                </div>
                <span className="text-xs font-bold text-nord-text">5.0</span>
                <span className="text-xs text-nord-muted/60">(+180 avaliações)</span>
              </div>
              <span className="text-[11px] font-bold text-nord-accent bg-nord-accent/10 px-2 py-0.5 rounded border border-nord-accent/30">
                1º Lugar na Região
              </span>
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* CARD 3: Zero Conflitos & Anti No-Show (Span 1x1)              */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="md:col-span-1 lg:col-span-1 rounded-3xl border border-nord-border bg-nord-surface/90 p-6 flex flex-col justify-between shadow-xl hover:border-nord-accent/50 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-nord-accent">
                <span className="text-sm">🛡️</span>
                <span>Anti No-Show</span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-nord-text leading-tight">
                Lembretes Preventivos 2h Antes
              </h3>

              <p className="text-xs text-nord-muted/80 leading-relaxed">
                Disparo preventivo com opção de confirmação ou cancelamento rápido. Reduz faltas em até 85%.
              </p>
            </div>

            {/* Mini Grid de Slots */}
            <div className="mt-4 pt-3 border-t border-nord-border/70 grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              <div className="rounded-lg bg-nord-bg p-1.5 text-center text-nord-muted/60 border border-nord-border">
                14:00 <span className="text-nord-danger block font-sans text-[9px]">Ocupado</span>
              </div>
              <div className="rounded-lg bg-nord-accent/15 p-1.5 text-center text-nord-accent font-bold border border-nord-accent/40">
                15:00 <span className="text-nord-success block font-sans text-[9px]">Lembrete 2h</span>
              </div>
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* CARD 4: White Label Total no seu Domínio (Span 1x1)            */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="md:col-span-1 lg:col-span-1 rounded-3xl border border-nord-border bg-nord-surface/90 p-6 flex flex-col justify-between shadow-xl hover:border-nord-accent/50 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-nord-accent-dark">
                <span className="text-sm">💎</span>
                <span>100% White Label</span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-nord-text leading-tight">
                Sua Marca & Domínio Próprio
              </h3>

              <p className="text-xs text-nord-muted/80 leading-relaxed">
                Sua logo, suas cores e seu domínio (ex: <code className="text-nord-accent text-[11px]">suaclinica.com.br</code>). Sem expor concorrentes.
              </p>
            </div>

            {/* Visual de Domínio e Marca */}
            <div className="mt-4 pt-3 border-t border-nord-border/70">
              <div className="rounded-lg bg-nord-bg p-2 text-center border border-nord-border font-mono text-[11px] text-nord-muted truncate">
                🔒 seu-negocio.com.br
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
