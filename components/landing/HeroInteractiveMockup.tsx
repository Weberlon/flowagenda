'use client';

import React, { useState } from 'react';

export default function HeroInteractiveMockup() {
  const [activeSegment, setActiveSegment] = useState<'agil' | 'clinicas'>('agil');
  const [selectedSlot, setSelectedSlot] = useState<string>('15:30');

  const slotsAgil = [
    { time: '09:00', status: 'livre' },
    { time: '10:30', status: 'ocupado' },
    { time: '14:00', status: 'ocupado' },
    { time: '15:30', status: 'selecionado' },
    { time: '17:00', status: 'livre' },
    { time: '18:30', status: 'ocupado' },
  ];

  return (
    <div className="w-full max-w-full overflow-hidden rounded-3xl border border-[#3B4252] bg-[#242933] text-[#ECEFF4] shadow-2xl transition-all duration-300">
      {/* Top Bar / Janela estilo MacOS */}
      <div className="border-b border-[#3B4252] bg-[#2E3440]/90 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#BF616A]/90 inline-block" />
          <span className="h-3 w-3 rounded-full bg-[#EBCB8B]/90 inline-block" />
          <span className="h-3 w-3 rounded-full bg-[#A3BE8C]/90 inline-block" />
          <span className="ml-2 text-[11px] font-mono text-[#D8DEE9]/60 hidden sm:inline-block">
            flowagenda.online/demo
          </span>
        </div>

        {/* Seletor Superior com 2 botões em pílula */}
        <div className="inline-flex rounded-full bg-[#242933] p-1 border border-[#3B4252] shadow-inner">
          <button
            type="button"
            onClick={() => setActiveSegment('agil')}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeSegment === 'agil'
                ? 'bg-[#3B4252] text-[#88C0D0] shadow-md border border-[#88C0D0]/40 font-bold'
                : 'text-[#D8DEE9]/70 hover:text-[#ECEFF4]'
            }`}
          >
            <span>⚡ Agendamento Ágil</span>
            <span className="hidden md:inline text-[10px] font-normal text-[#D8DEE9]/60">
              (Barbearias, Salões, Tatuadores e Pet Care)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('clinicas')}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeSegment === 'clinicas'
                ? 'bg-[#3B4252] text-[#88C0D0] shadow-md border border-[#88C0D0]/40 font-bold'
                : 'text-[#D8DEE9]/70 hover:text-[#ECEFF4]'
            }`}
          >
            <span>🛡️ Consultórios & Clínicas</span>
            <span className="hidden md:inline text-[10px] font-normal text-[#D8DEE9]/60">
              (Estética, Harmonização, Odonto e Saúde)
            </span>
          </button>
        </div>
      </div>

      {/* Conteúdo com Overflow Hidden para Mobile */}
      <div className="p-4 sm:p-6 lg:p-7 overflow-hidden">
        {activeSegment === 'agil' ? (
          /* MODO 1: AGENDAMENTO ÁGIL */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch overflow-hidden">
            {/* Coluna Esquerda: Google + Grade de Horários */}
            <div className="lg:col-span-7 space-y-4 overflow-hidden">
              {/* Card Google Meu Negócio */}
              <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440] p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-900 font-bold shadow-md">
                    <span className="text-xl">G</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-[#ECEFF4]">Barbearia Vintage Club</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C] font-semibold border border-[#A3BE8C]/30">
                        Top 1 da Região
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex text-[#EBCB8B] text-xs">
                        {'★'.repeat(5)}
                      </div>
                      <span className="text-xs font-bold text-[#ECEFF4]">5.0</span>
                      <span className="text-xs text-[#D8DEE9]/70 font-medium">+158 avaliações reais</span>
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 self-start sm:self-center px-2.5 py-1 rounded-lg bg-[#3B4252] text-[10px] text-[#88C0D0] font-mono border border-[#4C566A]">
                  <span className="h-2 w-2 rounded-full bg-[#A3BE8C] animate-pulse" />
                  Atendimento WhatsApp Ativo
                </div>
              </div>

              {/* Grade Semanal com Slots Ciano */}
              <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440] p-4 sm:p-5 shadow-lg space-y-3 overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#3B4252] pb-2.5">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#ECEFF4]">Grade Semanal de Agendamentos</h4>
                    <p className="text-[11px] text-[#D8DEE9]/60">Sexta-feira • Cortes & Barba (30 min)</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#242933] text-[#88C0D0] border border-[#3B4252]">
                    Slots em Tempo Real
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {slotsAgil.map((slot) => {
                    const isSelected = selectedSlot === slot.time;
                    const isOccupied = slot.status === 'ocupado';

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => !isOccupied && setSelectedSlot(slot.time)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition-all ${
                          isSelected
                            ? 'bg-[#88C0D0] text-[#242933] shadow-md shadow-[#88C0D0]/20 font-black scale-105 border border-white/20'
                            : isOccupied
                            ? 'bg-[#88C0D0]/15 text-[#88C0D0] border border-[#88C0D0]/40 font-semibold'
                            : 'bg-[#3B4252] text-[#ECEFF4] hover:border-[#88C0D0]/60 hover:text-[#88C0D0] border border-[#4C566A]'
                        }`}
                      >
                        {slot.time}
                        <span className="block text-[9px] font-normal opacity-80">
                          {isSelected ? 'Escolhido' : isOccupied ? 'Ocupado' : 'Livre'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-[#D8DEE9]/60">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#88C0D0]" /> Slot Selecionado
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#88C0D0]/40" /> Ocupado (Ciano)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#3B4252]" /> Disponível
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Balão WhatsApp com Validação de PIN */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-[#3B4252] bg-[#2E3440] p-4 sm:p-5 shadow-lg overflow-hidden">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#3B4252]">
                <div className="h-8 w-8 rounded-full bg-[#A3BE8C] flex items-center justify-center text-[#242933] font-bold text-xs">
                  💬
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#ECEFF4]">FlowAgenda WhatsApp Bot</h5>
                  <p className="text-[10px] text-[#A3BE8C]">Trava Atômica de 10 min Ativa</p>
                </div>
              </div>

              {/* Balão de Conversa & PIN Flutuante */}
              <div className="my-3 space-y-2.5 font-sans overflow-hidden">
                <div className="rounded-xl rounded-tl-none bg-[#3B4252] p-2.5 text-xs text-[#ECEFF4] border border-[#4C566A] shadow-md">
                  <p className="font-semibold text-[#88C0D0] text-[11px] mb-0.5">Barbearia Vintage Club:</p>
                  <p className="text-[11px]">
                    Olá, Marcos! Seu horário para às <span className="font-bold text-[#88C0D0]">{selectedSlot}</span> foi pré-reservado.
                  </p>
                </div>

                {/* Balão de PIN em Destaque Flutuante */}
                <div className="rounded-xl bg-gradient-to-br from-[#2E3440] to-[#242933] p-3.5 border-2 border-[#88C0D0] shadow-xl text-center space-y-1.5">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#88C0D0]/10 text-[#88C0D0] text-[10px] font-bold">
                    🔐 VALIDAÇÃO DE PIN NO WHATSAPP
                  </span>
                  <div className="text-2xl font-mono font-black tracking-widest text-[#88C0D0]">
                    7 4 2 9
                  </div>
                  <p className="text-[10px] text-[#D8DEE9]/70">
                    Digite para confirmar. Expira em <span className="font-bold text-[#EBCB8B]">09:42</span>.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center border-t border-[#3B4252]">
                <span className="text-[10px] text-[#A3BE8C] font-semibold flex items-center justify-center gap-1">
                  ✓ Sem Faltas • Agenda 100% Protegida
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* MODO 2: CONSULTÓRIOS & CLÍNICAS */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch overflow-hidden">
            {/* Coluna Esquerda: Google Maps Escuro + Depoimento */}
            <div className="lg:col-span-7 space-y-4 overflow-hidden">
              {/* Card Google Maps Escuro */}
              <div className="relative overflow-hidden rounded-2xl border border-[#3B4252] bg-[#2E3440] p-4 sm:p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-[#88C0D0]/20 text-[#88C0D0] flex items-center justify-center font-bold text-sm border border-[#88C0D0]/30">
                      📍
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#ECEFF4]">Clínica Sorriso & Estética Prime</h4>
                      <p className="text-[10px] text-[#D8DEE9]/60">Google Meu Negócio • Ficha Otimizada</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EBCB8B]/10 text-[#EBCB8B] text-[11px] font-bold border border-[#EBCB8B]/30">
                    ★ 5.0 (284 reviews)
                  </div>
                </div>

                {/* Mapa Escuro Simulado */}
                <div className="relative h-24 rounded-xl bg-[#1E232A] border border-[#3B4252] overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#88C0D0_1px,transparent_1px)] [background-size:14px_14px]" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#3B4252]" />
                  <div className="absolute top-0 bottom-0 left-1/3 w-0.5 bg-[#3B4252]" />

                  {/* Pino Pulsante */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative">
                      <span className="absolute -inset-1.5 rounded-full bg-[#88C0D0]/40 animate-ping" />
                      <div className="h-7 w-7 rounded-full bg-[#88C0D0] text-[#242933] flex items-center justify-center font-black text-xs shadow-md">
                        🏥
                      </div>
                    </div>
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-[#242933] text-[9px] font-bold text-[#88C0D0] border border-[#88C0D0]/40 shadow-sm">
                      +420 buscas por rotas / mês
                    </span>
                  </div>
                </div>
              </div>

              {/* Depoimento de Reputação & Autoridade */}
              <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440] p-4 shadow-lg space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-[#88C0D0] text-[#242933] flex items-center justify-center font-black text-xs">
                    MV
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#ECEFF4]">Dra. Mariana Vaz</h5>
                    <p className="text-[10px] text-[#88C0D0]">Diretora Clínica • CRM/CRO Ativo</p>
                  </div>
                </div>
                <blockquote className="text-[11px] text-[#D8DEE9] italic pt-1 leading-relaxed border-l-2 border-[#88C0D0] pl-2.5">
                  &ldquo;O FlowAgenda eliminou 92% das faltas sem aviso. Nossa ficha no Google agora é top 1 da região e os pacientes elogiam a confirmação pontual.&rdquo;
                </blockquote>
              </div>
            </div>

            {/* Coluna Direita: WhatsApp com Badge Anti No-Show */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-[#3B4252] bg-[#2E3440] p-4 sm:p-5 shadow-lg overflow-hidden">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#3B4252]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#A3BE8C]" />
                  <span className="text-xs font-bold text-[#ECEFF4]">Notificação Transacional</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3B4252] text-[#88C0D0] border border-[#4C566A]">
                  Oficial
                </span>
              </div>

              {/* Card WhatsApp com Badge "Presença Confirmada" */}
              <div className="my-3 space-y-2.5 font-sans overflow-hidden">
                <div className="rounded-xl bg-[#3B4252] p-2.5 text-xs text-[#ECEFF4] border border-[#4C566A] shadow-md space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#88C0D0]">Lembrete 2h Antes</span>
                    <span className="text-[9px] text-[#D8DEE9]/60">12:00</span>
                  </div>
                  <p className="text-[11px] leading-snug">
                    Olá, Dr. Ricardo! Sua consulta com <span className="font-semibold text-white">Dra. Mariana</span> está marcada para hoje às <span className="font-bold text-[#88C0D0]">14:00</span>.
                  </p>
                </div>

                {/* Badge de Presença Confirmada (Anti No-Show) */}
                <div className="rounded-xl border border-[#A3BE8C]/40 bg-[#A3BE8C]/10 p-3 text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#A3BE8C] text-[#242933] text-[11px] font-black shadow-sm">
                    ✓ Presença Confirmada (Anti No-Show)
                  </div>
                  <p className="text-[10px] text-[#ECEFF4] leading-tight">
                    Paciente respondeu e garantiu comparecimento. Horário blindado na agenda médica.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center border-t border-[#3B4252]">
                <span className="text-[10px] text-[#88C0D0] font-mono">
                  Sincronização com Prontuário & Calendário
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
