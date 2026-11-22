'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CheckCircle2,
  User,
  Lock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Scissors,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

interface ServicoDemo {
  id: string;
  nome: string;
  duracaoMinutos: 15 | 30 | 45 | 60;
  preco: string;
}

const SERVICOS_DEMO: ServicoDemo[] = [
  { id: 'corte', nome: 'Corte Masculino Clássico', duracaoMinutos: 30, preco: 'R$ 55,00' },
  { id: 'barba', nome: 'Barba & Navalha Terapêutica', duracaoMinutos: 30, preco: 'R$ 45,00' },
  { id: 'combo', nome: 'Combo Corte + Barba', duracaoMinutos: 60, preco: 'R$ 90,00' },
  { id: 'pezinho', nome: 'Acabamento Rápido', duracaoMinutos: 15, preco: 'R$ 30,00' },
];

const PROFISSIONAIS_DEMO = [
  { id: 'qualquer', nome: 'Qualquer profissional disponível' },
  { id: 'carlos', nome: 'Carlos Henrique' },
  { id: 'felipe', nome: 'Felipe Duarte' },
];

const HORARIOS_DEMO = ['09:30', '10:30', '14:00', '15:30', '17:00', '18:30'];

export function DemoAgendamentoClient() {
  const [servicoId, setServicoId] = useState<string>(SERVICOS_DEMO[0].id);
  const [profissionalId, setProfissionalId] = useState<string>(PROFISSIONAIS_DEMO[0].id);
  const [horario, setHorario] = useState<string>('15:30');
  const [nomeCliente, setNomeCliente] = useState<string>('João Silva');
  const [etapa, setEtapa] = useState<'selecao' | 'pin' | 'confirmado'>('selecao');
  const [pinDigitado, setPinDigitado] = useState<string>('849210');
  const [segundosLock, setSegundosLock] = useState<number>(598);

  const servicoAtual = SERVICOS_DEMO.find((s) => s.id === servicoId) || SERVICOS_DEMO[0];
  const profissionalAtual =
    PROFISSIONAIS_DEMO.find((p) => p.id === profissionalId) || PROFISSIONAIS_DEMO[0];

  useEffect(() => {
    if (etapa !== 'pin') return;
    const timer = setInterval(() => {
      setSegundosLock((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [etapa]);

  const formatarTempo = (total: number) => {
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#242933] text-[#ECEFF4] font-sans">
      {/* Faixa informativa do modo demonstração */}
      <div className="border-b border-[#88C0D0]/30 bg-[#2E3440] px-4 py-2.5 text-center text-xs text-[#D8DEE9]">
        <span className="font-semibold text-[#88C0D0]">Modo Demonstração Interativa</span> — Simule um agendamento completo sem gravar dados reais no banco.
      </div>

      {/* Cabeçalho */}
      <header className="border-b border-[#3B4252] bg-[#242933]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#3B4252] bg-[#2E3440] px-3 py-1.5 text-xs font-semibold text-[#D8DEE9] hover:bg-[#3B4252] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar ao site</span>
            </Link>
            <BrandLogo variant="sm" showText={false} />
          </div>

          <Link
            href="/#planos"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#88C0D0] px-4 py-2 text-xs font-black text-[#242933] hover:bg-[#88C0D0]/90 transition-colors"
          >
            <span>Ativar no Meu Negócio</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
        {/* Cartão do estabelecimento fictício */}
        <div className="rounded-3xl border border-[#3B4252] bg-[#2E3440] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3B4252] pb-5">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-[#88C0D0] text-[#242933] flex items-center justify-center font-black text-base shadow-md">
                <Scissors className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-[#ECEFF4]">
                    Barbearia Vintage Club (Demo)
                  </h1>
                  <span className="rounded-full bg-[#A3BE8C]/15 border border-[#A3BE8C]/35 px-2.5 py-0.5 text-[10px] font-bold text-[#A3BE8C]">
                    5.0 ★ Google
                  </span>
                </div>
                <p className="text-xs text-[#D8DEE9]/70 mt-0.5">
                  Agendamento online com trava de 10 minutos e validação por PIN
                </p>
              </div>
            </div>
          </div>

          {etapa === 'selecao' && (
            <div className="space-y-6">
              {/* 1. Serviço */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
                  1. Escolha o serviço
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SERVICOS_DEMO.map((s) => {
                    const ativo = s.id === servicoId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setServicoId(s.id)}
                        className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${
                          ativo
                            ? 'border-[#88C0D0] bg-[#3B4252] shadow-md'
                            : 'border-[#3B4252] bg-[#242933]/80 hover:bg-[#3B4252]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-[#ECEFF4]">{s.nome}</span>
                          <span className="text-xs font-mono font-bold text-[#A3BE8C]">
                            {s.preco}
                          </span>
                        </div>
                        <p className="text-xs text-[#D8DEE9]/70 mt-1">
                          Duração: {s.duracaoMinutos} min
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Profissional */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
                  2. Profissional
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PROFISSIONAIS_DEMO.map((p) => {
                    const ativo = p.id === profissionalId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProfissionalId(p.id)}
                        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                          ativo
                            ? 'border-[#88C0D0] bg-[#3B4252] text-[#ECEFF4]'
                            : 'border-[#3B4252] bg-[#242933]/80 text-[#D8DEE9]/80 hover:bg-[#3B4252]/60'
                        }`}
                      >
                        <User className="h-3.5 w-3.5 text-[#88C0D0] shrink-0" />
                        <span className="truncate">{p.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Horário */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
                  3. Horário disponível hoje
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {HORARIOS_DEMO.map((h) => {
                    const ativo = h === horario;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHorario(h)}
                        className={`rounded-xl border py-2.5 text-xs font-mono font-bold transition-colors cursor-pointer ${
                          ativo
                            ? 'border-[#88C0D0] bg-[#88C0D0] text-[#242933]'
                            : 'border-[#3B4252] bg-[#242933] text-[#ECEFF4] hover:bg-[#3B4252]'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Nome */}
              <div className="space-y-2">
                <label
                  htmlFor="demo-nome-cliente"
                  className="block text-xs font-bold uppercase tracking-wider text-[#88C0D0]"
                >
                  4. Seu nome
                </label>
                <input
                  id="demo-nome-cliente"
                  type="text"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  className="w-full rounded-xl border border-[#4C566A] bg-[#242933] px-4 py-2.5 text-sm text-[#ECEFF4] focus:outline-none focus:ring-2 focus:ring-[#88C0D0]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSegundosLock(598);
                  setEtapa('pin');
                }}
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#88C0D0] px-6 py-3.5 text-sm font-black text-[#242933] hover:bg-[#88C0D0]/90 transition-colors cursor-pointer shadow-lg shadow-[#88C0D0]/20"
              >
                <Calendar className="h-4 w-4" />
                <span>Pré-reservar horário ({horario})</span>
              </button>
            </div>
          )}

          {etapa === 'pin' && (
            <div className="space-y-5 rounded-2xl border border-[#88C0D0]/40 bg-[#242933] p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#88C0D0]/15 text-[#88C0D0]">
                <Lock className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-black text-[#ECEFF4]">
                  Horário pré-reservado por 10 minutos
                </h2>
                <p className="text-xs text-[#D8DEE9]/80">
                  {servicoAtual.nome} às <strong>{horario}</strong> com{' '}
                  <strong>{profissionalAtual.nome}</strong>.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-[#EBCB8B]/40 bg-[#EBCB8B]/10 px-4 py-1.5 text-xs font-mono font-bold text-[#EBCB8B]">
                <Clock className="h-3.5 w-3.5" />
                <span>Expira em {formatarTempo(segundosLock)}</span>
              </div>

              <div className="max-w-xs mx-auto space-y-2">
                <label
                  htmlFor="demo-pin-input"
                  className="block text-xs font-semibold text-[#D8DEE9]"
                >
                  Código PIN enviado no WhatsApp (simulação: 849210)
                </label>
                <input
                  id="demo-pin-input"
                  type="text"
                  maxLength={6}
                  value={pinDigitado}
                  onChange={(e) => setPinDigitado(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl border border-[#88C0D0]/50 bg-[#2E3440] px-4 py-3 text-center font-mono text-lg font-black tracking-[0.35em] text-[#ECEFF4] focus:outline-none focus:ring-2 focus:ring-[#88C0D0]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setEtapa('selecao')}
                  className="rounded-xl border border-[#4C566A] bg-[#3B4252] px-5 py-2.5 text-xs font-bold text-[#ECEFF4] hover:bg-[#434C5E] transition-colors cursor-pointer"
                >
                  Alterar horário
                </button>
                <button
                  type="button"
                  onClick={() => setEtapa('confirmado')}
                  className="rounded-xl bg-[#A3BE8C] px-6 py-2.5 text-xs font-black text-[#242933] hover:bg-[#A3BE8C]/90 transition-colors cursor-pointer"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </div>
          )}

          {etapa === 'confirmado' && (
            <div className="space-y-5 rounded-2xl border border-[#A3BE8C]/40 bg-[#A3BE8C]/10 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C]">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-[#ECEFF4]">
                  Agendamento Confirmado!
                </h2>
                <p className="text-xs sm:text-sm text-[#D8DEE9]/90">
                  {nomeCliente || 'Cliente'}, seu horário de <strong>{servicoAtual.nome}</strong> às{' '}
                  <strong>{horario}</strong> está garantido. Na vida real, o cliente recebe o lembrete automático 2h antes e o pedido de avaliação 5★ após o atendimento.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setEtapa('selecao')}
                  className="rounded-xl border border-[#4C566A] bg-[#2E3440] px-5 py-2.5 text-xs font-bold text-[#ECEFF4] hover:bg-[#3B4252] transition-colors cursor-pointer"
                >
                  Testar novamente
                </button>
                <Link
                  href="/#planos"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#88C0D0] px-6 py-2.5 text-xs font-black text-[#242933] hover:bg-[#88C0D0]/90 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Quero isso no meu negócio</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
