'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export interface SuperAdminAnalyticsProps {
  kpis: {
    mrrEstimado: number;
    arrEstimado: number;
    totalLojistas: number;
    lojistasAtivos: number;
    lojistasPendentes: number;
    lojistasInadimplentes: number;
    totalAgendamentos: number;
    totalInteracoesIA: number;
  };
  distribuicaoPlanos: Array<{
    name: string;
    key: string;
    value: number;
    mrr: number;
    color: string;
  }>;
  novosCadastrosMes: Array<{
    mes: string;
    cadastros: number;
    receita: number;
  }>;
  estabelecimentosMaisAtivos: Array<{
    nome: string;
    slug: string;
    agendamentos: number;
    status: string;
    tier: string;
  }>;
}

const NordTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-[#4C566A] bg-[#2E3440] p-3 text-xs shadow-2xl backdrop-blur-md">
        <p className="font-semibold text-[#ECEFF4] mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="flex items-center gap-1.5" style={{ color: entry.color || '#88C0D0' }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || '#88C0D0' }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-[#ECEFF4]">
                {typeof entry.value === 'number'
                  ? entry.dataKey === 'receita' || entry.name.toLowerCase().includes('mrr')
                    ? `R$ ${entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : entry.value
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function SuperAdminAnalytics({
  kpis,
  distribuicaoPlanos,
  novosCadastrosMes,
  estabelecimentosMaisAtivos,
}: SuperAdminAnalyticsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalPlanos = distribuicaoPlanos.reduce((acc, p) => acc + p.value, 0);

  return (
    <div className="space-y-6">
      {/* 1. TOP 4 KPI CARDS SAAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: MRR Estimado */}
        <div className="relative overflow-hidden rounded-2xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] to-[#2E3440]/80 p-5 shadow-lg transition-all hover:border-[#4C566A] hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D8DEE9]/70">
              MRR Recorrente (Mensal)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A3BE8C]/10 border border-[#A3BE8C]/30 text-[#A3BE8C] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#ECEFF4]">
              R$ {kpis.mrrEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[#D8DEE9]/70">
              <span className="inline-flex items-center rounded-full bg-[#A3BE8C]/15 border border-[#A3BE8C]/30 px-2 py-0.5 text-[10px] font-bold text-[#A3BE8C]">
                ARR R$ {kpis.arrEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span>• {kpis.lojistasAtivos} assinaturas pagantes</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Lojistas Ativos vs Pendentes/Inadimplentes */}
        <div className="relative overflow-hidden rounded-2xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] to-[#2E3440]/80 p-5 shadow-lg transition-all hover:border-[#4C566A] hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D8DEE9]/70">
              Base de Lojistas
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#88C0D0]/10 border border-[#88C0D0]/30 text-[#88C0D0] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#ECEFF4]">
              {kpis.totalLojistas}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center rounded-full bg-[#A3BE8C]/15 border border-[#A3BE8C]/30 px-2 py-0.5 font-bold text-[#A3BE8C]">
                {kpis.lojistasAtivos} Ativos
              </span>
              <span className="inline-flex items-center rounded-full bg-[#EBCB8B]/15 border border-[#EBCB8B]/30 px-2 py-0.5 font-bold text-[#EBCB8B]">
                {kpis.lojistasPendentes} Pendentes
              </span>
              {kpis.lojistasInadimplentes > 0 && (
                <span className="inline-flex items-center rounded-full bg-[#BF616A]/15 border border-[#BF616A]/30 px-2 py-0.5 font-bold text-[#BF616A]">
                  {kpis.lojistasInadimplentes} Inadimpl.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 3: Total de Agendamentos na Plataforma */}
        <div className="relative overflow-hidden rounded-2xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] to-[#2E3440]/80 p-5 shadow-lg transition-all hover:border-[#4C566A] hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D8DEE9]/70">
              Total de Agendamentos
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#81A1C1]/10 border border-[#81A1C1]/30 text-[#81A1C1] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#ECEFF4]">
              {kpis.totalAgendamentos}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#D8DEE9]/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#81A1C1]" />
              <span>Volume transacionado em todos os tenants</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Total de Interações IA */}
        <div className="relative overflow-hidden rounded-2xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] to-[#2E3440]/80 p-5 shadow-lg transition-all hover:border-[#4C566A] hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D8DEE9]/70">
              Interações de IA
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B48EAD]/10 border border-[#B48EAD]/30 text-[#B48EAD] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#ECEFF4]">
              {kpis.totalInteracoesIA}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#D8DEE9]/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#B48EAD]" />
              <span>Fila DeepSeek & Webhooks Evolution API</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LINHA ANALÍTICA (3 COLUNAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Gráfico de Rosca/Donut de Planos */}
        <div className="lg:col-span-4 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#ECEFF4]">
              Distribuição por Plano
            </h2>
            <p className="text-xs text-[#D8DEE9]/70">
              Divisão de lojistas por assinatura
            </p>
          </div>

          <div className="relative flex items-center justify-center my-3 h-48">
            {mounted ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={totalPlanos > 0 ? distribuicaoPlanos : [{ name: 'Sem lojistas', value: 1, color: '#3B4252' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(totalPlanos > 0 ? distribuicaoPlanos : [{ name: 'Sem lojistas', value: 1, color: '#3B4252' }]).map(
                        (entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#2E3440" strokeWidth={2} />
                        )
                      )}
                    </Pie>
                    <Tooltip content={<NordTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold font-mono text-[#ECEFF4] leading-none">
                    {totalPlanos}
                  </span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-[#D8DEE9]/70 mt-1">
                    Lojistas
                  </span>
                </div>
              </>
            ) : (
              <div className="h-36 w-36 rounded-full bg-[#3B4252]/40 animate-pulse mx-auto" />
            )}
          </div>

          <div className="space-y-2 border-t border-[#3B4252] pt-3 text-xs">
            {distribuicaoPlanos.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-[#ECEFF4]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-xs text-[#D8DEE9]">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{p.value}</span>
                  <span className="text-[11px] font-mono text-[#88C0D0]">
                    R$ {p.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 2: Gráfico de Barras (Novos Cadastros / Mês) */}
        <div className="lg:col-span-4 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#ECEFF4]">
                Crescimento Recente
              </h2>
              <p className="text-xs text-[#D8DEE9]/70">
                Novos lojistas cadastrados por mês
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-[#88C0D0]">
              <span className="h-2 w-2 rounded-full bg-[#88C0D0]" />
              Novos Lojistas
            </span>
          </div>

          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={novosCadastrosMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="mes"
                    stroke="#4C566A"
                    tick={{ fill: '#D8DEE9', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#3B4252' }}
                  />
                  <YAxis
                    stroke="#4C566A"
                    tick={{ fill: '#D8DEE9', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#3B4252' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<NordTooltip />} />
                  <Bar
                    dataKey="cadastros"
                    name="Novos Lojistas"
                    fill="#88C0D0"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-xl bg-[#3B4252]/40 animate-pulse" />
            )}
          </div>
        </div>

        {/* Coluna 3: Barras Horizontais (Estabelecimentos Mais Ativos) */}
        <div className="lg:col-span-4 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#ECEFF4]">
              Top Estabelecimentos
            </h2>
            <p className="text-xs text-[#D8DEE9]/70">
              Mais ativos por volume de agendamentos
            </p>
          </div>

          <div className="my-3 space-y-3.5 flex-1">
            {estabelecimentosMaisAtivos.length > 0 ? (
              estabelecimentosMaisAtivos.map((est, idx) => {
                const maxCount = Math.max(...estabelecimentosMaisAtivos.map((x) => x.agendamentos), 1);
                const barWidth = Math.round((est.agendamentos / maxCount) * 100);

                return (
                  <div key={est.slug} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#ECEFF4] flex items-center gap-2 truncate max-w-[180px]">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3B4252] text-[10px] font-mono text-[#88C0D0]">
                          {idx + 1}
                        </span>
                        {est.nome}
                      </span>
                      <span className="font-mono font-bold text-[#88C0D0]">
                        {est.agendamentos} {est.agendamentos === 1 ? 'agendamento' : 'agendamentos'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#242933] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#88C0D0] to-[#A3BE8C] transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[#3B4252] bg-[#242933]/50 text-xs text-[#D8DEE9]/60">
                Nenhum agendamento registrado ainda.
              </div>
            )}
          </div>

          <div className="border-t border-[#3B4252] pt-2.5 text-[11px] text-[#D8DEE9]/70 flex items-center justify-between">
            <span>Ranking atualizado em tempo real</span>
            <span className="font-mono text-[#88C0D0]">Top 5</span>
          </div>
        </div>
      </div>
    </div>
  );
}