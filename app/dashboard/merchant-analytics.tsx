'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { createDashboardAgendamentoAction } from '@/app/actions/dashboard';
import { getNicheDictionary } from '@/lib/niche-dictionary';
import { Pet } from '@/types/niche';
import { Plus, X, PawPrint, CalendarPlus, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export interface MerchantAnalyticsProps {
  lojista: {
    id: string;
    nome_estabelecimento: string;
    slug_subdominio?: string;
    ticket_medio_padrao: number;
    tier: string;
    business_niche?: string | null;
  };
  whatsappStatus: {
    state?: string;
    qrcode?: string | null;
    instanceName?: string;
  } | null;
  kpis: {
    faturamentoPrevistoMes: number;
    agendamentosMes: number;
    variacaoPercentual: number;
    fechadosSecretariaIa: number;
    taxaComparecimento: number;
    ticketMedio: number;
  };
  evolucao14Dias: Array<{
    data: string;
    label: string;
    faturamento: number;
    agendamentos: number;
  }>;
  canais: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  ocupacao: {
    percentual: number;
    horasAgendadas: number;
    capacidadeHoras: number;
  };
  topServicos: Array<{
    nome: string;
    quantidade: number;
    receita: number;
  }>;
  topProfissionais: Array<{
    nome: string;
    agendamentos: number;
  }>;
  agendamentosHoje: Array<{
    id: string;
    horaInicio: string;
    horaFim: string;
    clienteNome: string;
    clienteTelefone: string;
    servicoNome: string;
    servicoDuracao: number;
    servicoPreco: number;
    profissionalNome: string;
    status: string;
    petNome?: string | null;
    petDetalhes?: string | null;
    triagemResumo?: string | null;
  }>;
  servicos?: Array<{
    id: string;
    nome_servico: string;
    duracao_minutos: number;
    preco: number;
  }>;
  profissionais?: Array<{
    id: string;
    nome: string;
  }>;
  clientes?: Array<{
    id: string;
    nome: string;
    telefone: string;
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
                  ? entry.dataKey === 'faturamento' || entry.name.toLowerCase().includes('receita')
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

export function MerchantAnalytics({
  lojista,
  whatsappStatus,
  kpis,
  evolucao14Dias,
  canais,
  ocupacao,
  topServicos,
  topProfissionais,
  agendamentosHoje,
  servicos = [],
  profissionais = [],
  clientes = [],
}: MerchantAnalyticsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const dict = useMemo(() => getNicheDictionary(lojista.business_niche), [lojista.business_niche]);

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [selectedServicoId, setSelectedServicoId] = useState('');
  const [selectedProfissionalId, setSelectedProfissionalId] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('09:00');
  const [clientePets, setClientePets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isPendingBooking, startTransitionBooking] = useTransition();

  useEffect(() => {
    if (!dict.features.hasPets || !selectedClienteId || !isNewBookingOpen) {
      setClientePets([]);
      setSelectedPetId('');
      return;
    }

    let cancelled = false;
    setLoadingPets(true);
    setSelectedPetId('');

    supabase
      .from('pets')
      .select('*')
      .eq('lojista_id', lojista.id)
      .eq('cliente_id', selectedClienteId)
      .order('nome', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setClientePets(data as Pet[]);
        } else {
          setClientePets([]);
        }
        setLoadingPets(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dict.features.hasPets, selectedClienteId, isNewBookingOpen, lojista.id, supabase]);

  const handleOpenNewBooking = () => {
    setBookingError(null);
    setSelectedClienteId(clientes[0]?.id || '');
    setSelectedServicoId(servicos[0]?.id || '');
    setSelectedProfissionalId(profissionais[0]?.id || '');
    setSelectedPetId('');
    setIsNewBookingOpen(true);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    startTransitionBooking(async () => {
      const res = await createDashboardAgendamentoAction({
        clienteId: selectedClienteId,
        servicoId: selectedServicoId,
        profissionalId: selectedProfissionalId,
        dataYmd: bookingDate,
        horaHm: bookingTime,
        petId: dict.features.hasPets && selectedPetId ? selectedPetId : null,
      });

      if (!res.success) {
        setBookingError(res.error || 'Não foi possível criar o agendamento.');
        return;
      }

      setIsNewBookingOpen(false);
      router.refresh();
    });
  };
  const [mounted, setMounted] = useState(false);
  const [rankingTab, setRankingTab] = useState<'servicos' | 'profissionais'>('servicos');

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCanais = canais.reduce((acc, c) => acc + c.value, 0);
  const isZapConnected = whatsappStatus?.state === 'open';

  // Cores do medidor semicircular de acordo com a meta
  const gaugeColor =
    ocupacao.percentual >= 85
      ? '#EBCB8B' // Alta ocupação (alerta positivo)
      : ocupacao.percentual >= 50
        ? '#A3BE8C' // Saudável
        : '#88C0D0'; // Capacidade disponível

  const gaugeData = [
    { name: 'Ocupado', value: Math.max(ocupacao.percentual, 1) },
    { name: 'Disponível', value: Math.max(100 - ocupacao.percentual, 0) },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de Contexto Executivo & Status WhatsApp */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-[#3B4252] bg-[#2E3440]/90 p-5 shadow-lg backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ECEFF4]">
              Painel de Gestão • {lojista.nome_estabelecimento}
            </h1>
            <span className="hidden sm:inline-flex items-center rounded-full bg-[#88C0D0]/10 border border-[#88C0D0]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#88C0D0]">
              Plano {lojista.tier.toUpperCase().replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-[#D8DEE9]/80 mt-1">
            Visão consolidada em tempo real com inteligência de secretária IA e ocupação da grade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isZapConnected ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#A3BE8C]/30 bg-[#A3BE8C]/10 px-3.5 py-2 text-xs font-medium text-[#A3BE8C]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3BE8C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#A3BE8C]"></span>
              </span>
              <span>WhatsApp Conectado (IA Ativa)</span>
            </div>
          ) : (
            <Link
              href="/dashboard/configuracoes"
              className="flex items-center gap-2 rounded-xl border border-[#EBCB8B]/40 bg-[#EBCB8B]/10 px-3.5 py-2 text-xs font-semibold text-[#EBCB8B] hover:bg-[#EBCB8B]/20 transition-colors shadow-sm"
            >
              <span className="h-2 w-2 rounded-full bg-[#EBCB8B] animate-pulse" />
              <span>WhatsApp Desconectado • Ler QR Code &rarr;</span>
            </Link>
          )}

          {lojista.slug_subdominio && (
            <a
              href={`https://${lojista.slug_subdominio}.flowagenda.online`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-[#4C566A] bg-[#3B4252] px-3.5 py-2 text-xs font-semibold text-[#ECEFF4] hover:bg-[#434C5E] transition-colors"
              title="Abrir página de agendamento online do cliente"
            >
              <span>Ver Página Pública</span>
              <svg className="h-3.5 w-3.5 text-[#88C0D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* QR Code Banner quando desconectado */}
      {!isZapConnected && whatsappStatus?.qrcode && (
        <div className="rounded-2xl border border-[#EBCB8B]/30 bg-[#2E3440] p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="rounded-xl border-2 border-dashed border-[#4C566A] bg-[#242933] p-3 shadow-inner">
              <img
                src={whatsappStatus.qrcode}
                alt="QR Code WhatsApp"
                className="h-44 w-44 object-contain rounded-lg"
              />
            </div>
            <div className="space-y-3 flex-1 text-center md:text-left">
              <span className="inline-flex items-center rounded-full bg-[#EBCB8B]/15 border border-[#EBCB8B]/40 px-3 py-0.5 text-xs font-bold text-[#EBCB8B]">
                Aguardando Conexão do Robô
              </span>
              <h2 className="text-xl font-bold text-[#ECEFF4]">
                Conecte a Secretária IA ao seu WhatsApp
              </h2>
              <p className="text-sm text-[#D8DEE9]/80 max-w-xl">
                Abra o WhatsApp no seu celular, vá em <strong>Aparelhos Conectados &gt; Conectar um aparelho</strong> e aponte a câmera para o QR Code ao lado. Suas respostas de agendamento serão automatizadas 24 horas por dia.
              </p>
              <div className="pt-1">
                <Link
                  href="/dashboard/configuracoes"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#88C0D0] px-4 py-2 text-xs font-bold text-[#242933] hover:bg-[#88C0D0]/90 transition-colors shadow-md"
                >
                  <span>Gerenciar Robô & Configurações de Mensagens</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP 4 KPI CARDS MODERNOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Faturamento Previsto no Mês */}
        <div className="relative overflow-hidden rounded-2xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] to-[#2E3440]/80 p-5 shadow-lg transition-all hover:border-[#4C566A] hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D8DEE9]/70">
              Faturamento Previsto
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#88C0D0]/10 border border-[#88C0D0]/30 text-[#88C0D0] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#ECEFF4]">
              R$ {kpis.faturamentoPrevistoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#D8DEE9]/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#88C0D0]" />
              <span>Ticket médio padrão: R$ {kpis.ticketMedio.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Agendamentos do Mês */}
        <div className="relative overflow-hidden rounded-2xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] to-[#2E3440]/80 p-5 shadow-lg transition-all hover:border-[#4C566A] hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D8DEE9]/70">
              Agendamentos no Mês
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#81A1C1]/10 border border-[#81A1C1]/30 text-[#81A1C1] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#ECEFF4]">
                {kpis.agendamentosMes}
              </p>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${kpis.variacaoPercentual >= 0
                    ? 'bg-[#A3BE8C]/15 text-[#A3BE8C] border border-[#A3BE8C]/30'
                    : 'bg-[#BF616A]/15 text-[#BF616A] border border-[#BF616A]/30'
                  }`}
              >
                {kpis.variacaoPercentual >= 0 ? `+${kpis.variacaoPercentual}%` : `${kpis.variacaoPercentual}%`}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#D8DEE9]/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#81A1C1]" />
              <span>Comparado ao mês anterior</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Fechados pela Secretária IA */}
        <div className="relative overflow-hidden rounded-2xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] to-[#2E3440]/80 p-5 shadow-lg transition-all hover:border-[#4C566A] hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D8DEE9]/70">
              Fechados pela IA
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#A3BE8C]/10 border border-[#A3BE8C]/30 text-[#A3BE8C] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#ECEFF4]">
                {kpis.fechadosSecretariaIa}
              </p>
              <span className="inline-flex items-center rounded-full bg-[#A3BE8C]/15 border border-[#A3BE8C]/30 px-2 py-0.5 text-[11px] font-bold text-[#A3BE8C]">
                {kpis.agendamentosMes > 0
                  ? `${Math.round((kpis.fechadosSecretariaIa / kpis.agendamentosMes) * 100)}% do total`
                  : 'Ativo'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#D8DEE9]/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#A3BE8C]" />
              <span>WhatsApp automatizado 24/7</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Taxa de Comparecimento */}
        <div className="relative overflow-hidden rounded-2xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] to-[#2E3440]/80 p-5 shadow-lg transition-all hover:border-[#4C566A] hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D8DEE9]/70">
              Taxa de Comparecimento
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EBCB8B]/10 border border-[#EBCB8B]/30 text-[#EBCB8B] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-[#ECEFF4]">
              {kpis.taxaComparecimento}%
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#D8DEE9]/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#EBCB8B]" />
              <span>Lembretes automáticos ativos</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LINHA ANALÍTICA CENTRAL (3 COLUNAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Gráfico de Área Suave (Evolução 14 Dias) */}
        <div className="lg:col-span-6 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#ECEFF4]">
                Evolução nos Últimos 14 Dias
              </h2>
              <p className="text-xs text-[#D8DEE9]/70">
                Faturamento diário e volume de clientes atendidos
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-[#88C0D0]">
                <span className="h-2 w-2 rounded-full bg-[#88C0D0]" />
                Receita (R$)
              </span>
              <span className="flex items-center gap-1 text-[#A3BE8C]">
                <span className="h-2 w-2 rounded-full bg-[#A3BE8C]" />
                Clientes
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucao14Dias} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nordAreaFaturamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#88C0D0" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#88C0D0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="nordAreaClientes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A3BE8C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A3BE8C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
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
                  />
                  <Tooltip content={<NordTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    name="Faturamento"
                    stroke="#88C0D0"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#nordAreaFaturamento)"
                  />
                  <Area
                    type="monotone"
                    dataKey="agendamentos"
                    name="Agendamentos"
                    stroke="#A3BE8C"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#nordAreaClientes)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-xl bg-[#3B4252]/40 animate-pulse" />
            )}
          </div>
        </div>

        {/* Coluna 2: Gráfico de Rosca/Donut com total no centro (Canais) */}
        <div className="lg:col-span-3 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#ECEFF4]">
              Canais de Aquisição
            </h2>
            <p className="text-xs text-[#D8DEE9]/70">
              Origem dos agendamentos no mês
            </p>
          </div>

          <div className="relative flex items-center justify-center my-3 h-44">
            {mounted ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={totalCanais > 0 ? canais : [{ name: 'Sem registros', value: 1, color: '#3B4252' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(totalCanais > 0 ? canais : [{ name: 'Sem registros', value: 1, color: '#3B4252' }]).map(
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
                    {totalCanais}
                  </span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-[#D8DEE9]/70 mt-1">
                    Total
                  </span>
                </div>
              </>
            ) : (
              <div className="h-36 w-36 rounded-full bg-[#3B4252]/40 animate-pulse mx-auto" />
            )}
          </div>

          <div className="space-y-2 border-t border-[#3B4252] pt-3 text-xs">
            {canais.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-[#ECEFF4]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-xs text-[#D8DEE9]">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{c.value}</span>
                  <span className="text-[11px] text-[#D8DEE9]/60">
                    ({totalCanais > 0 ? Math.round((c.value / totalCanais) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 3: Medidor Semicircular/Gauge de Ocupação da Agenda */}
        <div className="lg:col-span-3 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#ECEFF4]">
              Ocupação da Grade
            </h2>
            <p className="text-xs text-[#D8DEE9]/70">
              Utilização da capacidade produtiva
            </p>
          </div>

          <div className="relative flex flex-col items-center justify-center my-2 h-44">
            {mounted ? (
              <div className="relative w-full flex flex-col items-center">
                <PieChart width={220} height={130}>
                  <Pie
                    data={gaugeData}
                    cx="50%"
                    cy="95%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={65}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill={gaugeColor} stroke="#2E3440" strokeWidth={2} />
                    <Cell fill="#3B4252" stroke="#2E3440" strokeWidth={2} />
                  </Pie>
                  <Tooltip content={<NordTooltip />} />
                </PieChart>
                <div className="absolute top-14 flex flex-col items-center pointer-events-none">
                  <span className="text-3xl font-extrabold font-mono tracking-tight" style={{ color: gaugeColor }}>
                    {ocupacao.percentual}%
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#D8DEE9]/70">
                    Capacidade
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-32 w-48 rounded-t-full bg-[#3B4252]/40 animate-pulse mx-auto" />
            )}
          </div>

          <div className="rounded-xl border border-[#3B4252] bg-[#242933]/60 p-3 space-y-1 text-xs">
            <div className="flex items-center justify-between text-[#D8DEE9]">
              <span>Horas agendadas:</span>
              <span className="font-mono font-bold text-[#ECEFF4]">{ocupacao.horasAgendadas}h</span>
            </div>
            <div className="flex items-center justify-between text-[#D8DEE9]">
              <span>Capacidade comercial:</span>
              <span className="font-mono font-bold text-[#ECEFF4]">{ocupacao.capacidadeHoras}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LINHA INFERIOR (2 COLUNAS: RANKING E PRÓXIMOS AGENDAMENTOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Barras Horizontais (Serviços / Profissionais em Destaque) */}
        <div className="lg:col-span-5 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#ECEFF4]">
                Destaques Operacionais
              </h2>
              <p className="text-xs text-[#D8DEE9]/70">
                Mais procurados pelos clientes
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-[#242933] p-1 border border-[#3B4252]">
              <button
                type="button"
                onClick={() => setRankingTab('servicos')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${rankingTab === 'servicos'
                    ? 'bg-[#88C0D0] text-[#242933] shadow-sm'
                    : 'text-[#D8DEE9] hover:text-[#ECEFF4]'
                  }`}
              >
                Serviços
              </button>
              <button
                type="button"
                onClick={() => setRankingTab('profissionais')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${rankingTab === 'profissionais'
                    ? 'bg-[#81A1C1] text-[#242933] shadow-sm'
                    : 'text-[#D8DEE9] hover:text-[#ECEFF4]'
                  }`}
              >
                Profissionais
              </button>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {rankingTab === 'servicos' ? (
              topServicos.length > 0 ? (
                topServicos.map((s, idx) => {
                  const maxServicoCount = Math.max(...topServicos.map((x) => x.quantidade), 1);
                  const barWidth = Math.round((s.quantidade / maxServicoCount) * 100);

                  return (
                    <div key={s.nome} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#ECEFF4] flex items-center gap-2 truncate max-w-[220px]">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3B4252] text-[10px] font-mono text-[#88C0D0]">
                            {idx + 1}
                          </span>
                          {s.nome}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-[#88C0D0]">
                            {s.quantidade} {s.quantidade === 1 ? 'cliente' : 'clientes'}
                          </span>
                          <span className="font-mono text-[#D8DEE9]/70 text-[11px]">
                            R$ {s.receita.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#242933] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#88C0D0] to-[#81A1C1] transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[#3B4252] bg-[#242933]/50 text-xs text-[#D8DEE9]/60">
                  Nenhum serviço registrado neste período.
                </div>
              )
            ) : topProfissionais.length > 0 ? (
              topProfissionais.map((p, idx) => {
                const maxProCount = Math.max(...topProfissionais.map((x) => x.agendamentos), 1);
                const barWidth = Math.round((p.agendamentos / maxProCount) * 100);

                return (
                  <div key={p.nome} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#ECEFF4] flex items-center gap-2 truncate max-w-[220px]">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3B4252] text-[10px] font-mono text-[#81A1C1]">
                          {idx + 1}
                        </span>
                        {p.nome}
                      </span>
                      <span className="font-mono font-bold text-[#81A1C1]">
                        {p.agendamentos} {p.agendamentos === 1 ? 'atendimento' : 'atendimentos'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#242933] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#81A1C1] to-[#88C0D0] transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[#3B4252] bg-[#242933]/50 text-xs text-[#D8DEE9]/60">
                Nenhum profissional registrado neste período.
              </div>
            )}
          </div>
        </div>

        {/* Coluna 2: Tabela Moderna de Próximos Agendamentos do Dia */}
        <div className="lg:col-span-7 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#ECEFF4]">
                Agenda de Hoje
              </h2>
              <p className="text-xs text-[#D8DEE9]/70">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-[#3B4252] bg-[#242933] px-3 py-1 font-mono text-xs font-semibold text-[#88C0D0]">
                {agendamentosHoje.length} {agendamentosHoje.length === 1 ? 'horário' : 'horários'}
              </span>
              <button
                type="button"
                onClick={handleOpenNewBooking}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#88C0D0] hover:bg-[#88C0D0]/90 px-3 py-1.5 text-xs font-bold text-[#2E3440] transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Agendamento</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {agendamentosHoje.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[#3B4252] bg-[#242933]/50 p-6 text-center">
                <div className="h-10 w-10 rounded-full bg-[#3B4252] text-[#88C0D0] flex items-center justify-center mb-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-[#ECEFF4]">Nenhum agendamento para hoje</p>
                <p className="text-xs text-[#D8DEE9]/70 mt-1 max-w-sm">
                  Sua secretária IA está conectada e pronta para responder novos clientes e preencher a grade.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#3B4252] text-[#D8DEE9]/60 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Horário</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Serviço / Profissional</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3B4252]/60 text-[#ECEFF4]">
                  {agendamentosHoje.map((item) => {
                    const isPendente = item.status === 'pendente_pin';
                    const isConcluido = item.status === 'concluido';
                    const isCancelado = item.status === 'cancelado';
                    const isConfirmado = item.status === 'confirmado';

                    const statusBadgeClass = isConfirmado
                      ? 'bg-[#A3BE8C]/15 text-[#A3BE8C] border-[#A3BE8C]/40'
                      : isPendente
                        ? 'bg-[#EBCB8B]/15 text-[#EBCB8B] border-[#EBCB8B]/40'
                        : isConcluido
                          ? 'bg-[#88C0D0]/15 text-[#88C0D0] border-[#88C0D0]/40'
                          : isCancelado
                            ? 'bg-[#BF616A]/15 text-[#BF616A] border-[#BF616A]/40'
                            : 'bg-[#3B4252] text-[#D8DEE9] border-[#4C566A]';

                    const statusLabel = isConfirmado
                      ? 'Confirmado'
                      : isPendente
                        ? 'Aguardando PIN'
                        : isConcluido
                          ? 'Concluído'
                          : isCancelado
                            ? 'Cancelado'
                            : item.status;

                    return (
                      <tr key={item.id} className="hover:bg-[#3B4252]/40 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-[#88C0D0] text-sm block">
                            {item.horaInicio}
                          </span>
                          <span className="font-mono text-[11px] text-[#D8DEE9]/60 block">
                            até {item.horaFim}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          <div className="truncate max-w-[150px] sm:max-w-xs">{item.clienteNome}</div>
                          {item.clienteTelefone && (
                            <span className="text-[11px] font-mono font-normal text-[#D8DEE9]/60 block">
                              {item.clienteTelefone}
                            </span>
                          )}
                          {item.petNome && (
                            <span
                              className="mt-1 inline-flex items-center gap-1 rounded-md border border-[#4C566A] bg-[#3B4252] px-2 py-0.5 text-[10px] font-semibold text-[#88C0D0]"
                              title={item.petDetalhes || undefined}
                            >
                              <PawPrint className="w-3 h-3 shrink-0" />
                              <span>
                                {item.petNome}
                                {item.petDetalhes ? ` (${item.petDetalhes})` : ''}
                              </span>
                            </span>
                          )}
                          {item.triagemResumo && (
                            <span
                              className="mt-1 inline-flex items-center gap-1 rounded-md border border-[#4C566A] bg-[#3B4252] px-2 py-0.5 text-[10px] font-medium text-[#88C0D0] max-w-[240px] truncate"
                              title={item.triagemResumo}
                            >
                              <Sparkles className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.triagemResumo}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs font-medium text-[#ECEFF4] block">
                            {item.servicoNome}
                          </span>
                          <span className="text-[11px] text-[#D8DEE9]/60 block">
                            {item.servicoDuracao} min • {item.profissionalNome}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClass}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Novo Agendamento Manual do Lojista */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-[#4C566A] bg-[#2E3440] text-[#ECEFF4] shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#4C566A]/60 bg-[#3B4252]">
              <div className="flex items-center gap-2.5">
                <CalendarPlus className="w-5 h-5 text-[#88C0D0]" />
                <h3 className="text-base font-bold text-[#ECEFF4]">
                  Novo {dict.agendamentoSingular}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBookingOpen(false)}
                className="rounded-lg p-1 text-[#D8DEE9]/70 hover:bg-[#434C5E] hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              {bookingError && (
                <div className="rounded-xl border border-[#BF616A]/60 bg-[#BF616A]/15 p-3 text-xs text-[#ECEFF4] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#BF616A] shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#D8DEE9] block mb-1">
                  {dict.clienteSingular} *
                </label>
                <select
                  required
                  value={selectedClienteId}
                  onChange={(e) => setSelectedClienteId(e.target.value)}
                  className="w-full rounded-xl border border-[#4C566A] bg-[#3B4252] px-3 py-2.5 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                >
                  <option value="">Selecione um(a) {dict.clienteSingular.toLowerCase()}...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.telefone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select opcional de Pet quando hasPets = true e um cliente estiver selecionado */}
              {dict.features.hasPets && selectedClienteId && (
                <div className="rounded-xl border border-[#88C0D0]/30 bg-[#3B4252]/60 p-3 space-y-1.5">
                  <label className="text-xs font-semibold text-[#88C0D0] flex items-center gap-1.5">
                    <PawPrint className="w-3.5 h-3.5" />
                    <span>Vincular Pet (opcional)</span>
                  </label>
                  {loadingPets ? (
                    <div className="flex items-center gap-2 text-xs text-[#D8DEE9]/70 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#88C0D0]" />
                      <span>Carregando pets do tutor...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedPetId}
                      onChange={(e) => setSelectedPetId(e.target.value)}
                      className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                    >
                      <option value="">
                        {clientePets.length === 0
                          ? 'Nenhum pet cadastrado para este tutor'
                          : 'Não vincular pet específico'}
                      </option>
                      {clientePets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.nome} ({pet.especie}
                          {pet.porte ? ` • Porte ${pet.porte}` : ''}
                          {pet.docilidade === 'arisco' || pet.docilidade === 'morde'
                            ? ` • ⚠️ ${pet.docilidade}`
                            : ''}
                          )
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-[#D8DEE9] block mb-1">
                    Serviço *
                  </label>
                  <select
                    required
                    value={selectedServicoId}
                    onChange={(e) => setSelectedServicoId(e.target.value)}
                    className="w-full rounded-xl border border-[#4C566A] bg-[#3B4252] px-3 py-2.5 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    {servicos.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome_servico} ({s.duracao_minutos}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#D8DEE9] block mb-1">
                    {dict.profissionalSingular} *
                  </label>
                  <select
                    required
                    value={selectedProfissionalId}
                    onChange={(e) => setSelectedProfissionalId(e.target.value)}
                    className="w-full rounded-xl border border-[#4C566A] bg-[#3B4252] px-3 py-2.5 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    {profissionais.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-[#D8DEE9] block mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-xl border border-[#4C566A] bg-[#3B4252] px-3 py-2.5 text-xs text-[#ECEFF4] font-mono focus:border-[#88C0D0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#D8DEE9] block mb-1">
                    Horário *
                  </label>
                  <input
                    type="time"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full rounded-xl border border-[#4C566A] bg-[#3B4252] px-3 py-2.5 text-xs text-[#ECEFF4] font-mono focus:border-[#88C0D0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#4C566A]/40">
                <button
                  type="button"
                  onClick={() => setIsNewBookingOpen(false)}
                  className="rounded-xl border border-[#4C566A] bg-[#3B4252] hover:bg-[#434C5E] px-4 py-2 text-xs font-semibold text-[#ECEFF4] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPendingBooking}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#88C0D0] hover:bg-[#88C0D0]/90 px-5 py-2 text-xs font-bold text-[#2E3440] transition disabled:opacity-50"
                >
                  {isPendingBooking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Agendando...</span>
                    </>
                  ) : (
                    <span>Confirmar {dict.agendamentoSingular}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}