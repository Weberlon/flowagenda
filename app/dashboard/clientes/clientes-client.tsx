'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { 
  ClienteCRM, 
  upsertCliente, 
  updateClienteEtapa, 
  updateClienteNotas, 
  deleteClienteAction 
} from '@/app/actions/clientes';

interface ClientesClientProps {
  lojista: {
    id: string;
    nome_estabelecimento: string;
    slug_subdominio: string;
  };
  initialClientes: ClienteCRM[];
  kpis: {
    totalClientes: number;
    ltvTotal: number;
    clientesRecorrentes: number;
    totalAgendamentosGeral: number;
  };
}

const ETAPAS_CONFIG = [
  { id: 'lead', label: 'Novos Contatos', cor: 'border-slate-500/50 text-slate-300', dot: 'bg-slate-400' },
  { id: 'agendado', label: 'Agendados', cor: 'border-[#88C0D0]/60 text-[#88C0D0]', dot: 'bg-[#88C0D0]' },
  { id: 'atendido', label: 'Atendidos', cor: 'border-[#A3BE8C]/60 text-[#A3BE8C]', dot: 'bg-[#A3BE8C]' },
  { id: 'no_show', label: 'Faltas / No-Show', cor: 'border-[#BF616A]/60 text-[#BF616A]', dot: 'bg-[#BF616A]' },
  { id: 'fidelizado', label: 'Fidelizados', cor: 'border-[#EBCB8B]/60 text-[#EBCB8B]', dot: 'bg-[#EBCB8B]' },
];

const TAGS_SUGERIDAS = [
  'VIP',
  'Barba Terapia',
  'Corte Degradê',
  'Sensível',
  'Pontual',
  'Loiro',
  'Limpeza de Pele',
  'Laser',
];

export function ClientesClient({ lojista, initialClientes, kpis }: ClientesClientProps) {
  const [clientes, setClientes] = useState<ClienteCRM[]>(initialClientes);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [search, setSearch] = useState('');
  const [selectedEtapaFilter, setSelectedEtapaFilter] = useState<string>('todos');

  // Drawer Lateral de Detalhes
  const [activeCliente, setActiveCliente] = useState<ClienteCRM | null>(null);
  const [drawerNotas, setDrawerNotas] = useState('');
  const [drawerTags, setDrawerTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Modal Novo Cliente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novaEtapa, setNovaEtapa] = useState('lead');
  const [novoValor, setNovoValor] = useState('');
  const [formError, setFormError] = useState('');

  const [isPending, startTransition] = useTransition();

  // Filtragem de Clientes
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const matchSearch =
        c.nome.toLowerCase().includes(search.toLowerCase()) ||
        c.telefone.includes(search.replace(/\D/g, ''));
      const matchEtapa = selectedEtapaFilter === 'todos' || c.etapa_kanban === selectedEtapaFilter;
      return matchSearch && matchEtapa;
    });
  }, [clientes, search, selectedEtapaFilter]);

  // Agrupamento para Kanban
  const colunasKanban = useMemo(() => {
    const map: Record<string, ClienteCRM[]> = {
      lead: [],
      agendado: [],
      atendido: [],
      no_show: [],
      fidelizado: [],
    };
    clientesFiltrados.forEach((c) => {
      const etapa = map[c.etapa_kanban] ? c.etapa_kanban : 'lead';
      map[etapa].push(c);
    });
    return map;
  }, [clientesFiltrados]);

  // Métricas Dinâmicas
  const totalLTV = useMemo(() => {
    return clientes.reduce((acc, c) => acc + (c.total_gasto || 0), 0);
  }, [clientes]);

  // Handlers de Mudança de Etapa
  const handleMudarEtapa = (clienteId: string, novaEtapaId: string) => {
    setClientes((prev) =>
      prev.map((c) => (c.id === clienteId ? { ...c, etapa_kanban: novaEtapaId } : c))
    );

    if (activeCliente && activeCliente.id === clienteId) {
      setActiveCliente((prev) => (prev ? { ...prev, etapa_kanban: novaEtapaId } : null));
    }

    startTransition(async () => {
      const res = await updateClienteEtapa(clienteId, novaEtapaId);
      if (!res.success) {
        console.error('Erro ao atualizar etapa:', res.error);
      }
    });
  };

  // Drag & Drop no Desktop
  const handleDragStart = (e: React.DragEvent, clienteId: string) => {
    e.dataTransfer.setData('text/plain', clienteId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetEtapa: string) => {
    e.preventDefault();
    const clienteId = e.dataTransfer.getData('text/plain');
    if (clienteId) {
      handleMudarEtapa(clienteId, targetEtapa);
    }
  };

  // Abrir Drawer de Detalhes
  const handleAbrirDrawer = (c: ClienteCRM) => {
    setActiveCliente(c);
    setDrawerNotas(c.observacoes || '');
    setDrawerTags(c.tags || []);
  };

  // Salvar Notas & Tags do Drawer
  const handleSalvarNotas = () => {
    if (!activeCliente) return;

    const clienteId = activeCliente.id;
    const notas = drawerNotas;
    const tags = drawerTags;

    setClientes((prev) =>
      prev.map((c) => (c.id === clienteId ? { ...c, observacoes: notas, tags } : c))
    );
    setActiveCliente((prev) => (prev ? { ...prev, observacoes: notas, tags } : null));

    startTransition(async () => {
      await updateClienteNotas(clienteId, notas, tags);
    });
  };

  // Adicionar Tag
  const handleAddTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag && !drawerTags.includes(cleanTag)) {
      setDrawerTags([...drawerTags, cleanTag]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setDrawerTags(drawerTags.filter((t) => t !== tagToRemove));
  };

  // Submeter Novo Cliente
  const handleSubmitNovoCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanTelefone = novoTelefone.replace(/\D/g, '');
    if (!novoNome.trim() || novoNome.trim().length < 2) {
      setFormError('Nome deve ter pelo menos 2 caracteres.');
      return;
    }
    if (cleanTelefone.length < 10) {
      setFormError('Informe o telefone com DDD (apenas números).');
      return;
    }

    const valorAdicional = parseFloat(novoValor.replace(',', '.')) || 0;

    startTransition(async () => {
      const res = await upsertCliente({
        nome: novoNome.trim(),
        telefone: cleanTelefone,
        etapa_kanban: novaEtapa,
        valor_adicional: valorAdicional,
      });

      if (res.success) {
        setIsModalOpen(false);
        setNovoNome('');
        setNovoTelefone('');
        setNovoValor('');
        setNovaEtapa('lead');
        window.location.reload();
      } else {
        setFormError(res.error || 'Erro ao cadastrar cliente.');
      }
    });
  };

  // Formatação de Dinheiro
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="min-h-screen bg-[#242933] text-[#ECEFF4] font-sans pb-16 overflow-x-hidden">
      {/* 1. Top Header com Métricas de LTV & Controles */}
      <div className="border-b border-[#4C566A]/30 bg-[#2E3440] px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <h1 className="text-xl sm:text-2xl font-black text-[#ECEFF4] tracking-tight">
                Gestão de Clientes & CRM
              </h1>
            </div>
            <p className="text-xs text-[#D8DEE9]/60 mt-1">
              Kanban de relacionamento, histórico de atendimento e métricas de LTV para {lojista.nome_estabelecimento}.
            </p>
          </div>

          {/* Cards de Métricas Rápidas */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-[#4C566A]/40 bg-[#3B4252]/60 px-3.5 py-2">
              <span className="text-[10px] text-[#D8DEE9]/60 uppercase tracking-wider block font-bold">
                Total de Clientes
              </span>
              <span className="text-base sm:text-lg font-black text-[#ECEFF4]">
                {clientes.length}
              </span>
            </div>

            <div className="rounded-xl border border-[#88C0D0]/30 bg-[#88C0D0]/10 px-3.5 py-2">
              <span className="text-[10px] text-[#88C0D0] uppercase tracking-wider block font-bold">
                LTV Total (Receita)
              </span>
              <span className="text-base sm:text-lg font-black text-[#88C0D0]">
                {formatMoney(totalLTV)}
              </span>
            </div>

            <div className="rounded-xl border border-[#A3BE8C]/30 bg-[#A3BE8C]/10 px-3.5 py-2">
              <span className="text-[10px] text-[#A3BE8C] uppercase tracking-wider block font-bold">
                Recorrentes
              </span>
              <span className="text-base sm:text-lg font-black text-[#A3BE8C]">
                {clientes.filter((c) => c.total_agendamentos >= 2).length}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Ações: Busca, Alternador de Visão e Botão Novo */}
        <div className="max-w-7xl mx-auto pt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Buscar por nome ou WhatsApp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[#4C566A]/40 bg-[#3B4252] px-3.5 py-2 text-xs sm:text-sm text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#D8DEE9]/60 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            {/* Alternador de Visão: Kanban vs Lista */}
            <div className="inline-flex rounded-xl bg-[#3B4252] p-1 border border-[#4C566A]/40 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-[#2E3440] text-[#88C0D0] shadow-sm'
                    : 'text-[#D8DEE9]/60 hover:text-[#ECEFF4]'
                }`}
              >
                <span>📊</span>
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('lista')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === 'lista'
                    ? 'bg-[#2E3440] text-[#88C0D0] shadow-sm'
                    : 'text-[#D8DEE9]/60 hover:text-[#ECEFF4]'
                }`}
              >
                <span>📋</span>
                <span>Lista</span>
              </button>
            </div>

            {/* Botão Novo Cliente */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#88C0D0] px-4 py-2 text-xs sm:text-sm font-black text-[#242933] shadow-md shadow-[#88C0D0]/20 hover:bg-[#88C0D0]/90 transition"
            >
              <span>+</span>
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Área de Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {viewMode === 'kanban' ? (
          /* ==================================================== */
          /* MODO KANBAN (5 COLUNAS RESPONSIVAS)                  */
          /* ==================================================== */
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-6">
            {ETAPAS_CONFIG.map((etapa) => {
              const itensColuna = colunasKanban[etapa.id] || [];

              return (
                <div
                  key={etapa.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, etapa.id)}
                  className="rounded-2xl border border-[#4C566A]/40 bg-[#2E3440] p-3 shadow-lg flex flex-col min-h-[460px] transition-colors"
                >
                  {/* Cabeçalho da Coluna */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#4C566A]/30 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${etapa.dot}`} />
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#ECEFF4]">
                        {etapa.label}
                      </h3>
                    </div>
                    <span className="rounded-full bg-[#3B4252] px-2 py-0.5 text-[11px] font-mono font-bold text-[#D8DEE9]">
                      {itensColuna.length}
                    </span>
                  </div>

                  {/* Cards da Coluna */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[680px] pr-1">
                    {itensColuna.length === 0 ? (
                      <div className="h-32 flex items-center justify-center rounded-xl border border-dashed border-[#4C566A]/30 text-center p-3">
                        <span className="text-[11px] text-[#D8DEE9]/40 italic">
                          Arraste clientes para esta etapa
                        </span>
                      </div>
                    ) : (
                      itensColuna.map((cliente) => {
                        const isVip = cliente.total_gasto >= 500;
                        const isRecorrente = cliente.total_agendamentos >= 3;
                        const zapUrl = `https://wa.me/55${cliente.telefone}?text=${encodeURIComponent(
                          `Olá, ${cliente.nome}! Tudo bem? Falamos do(a) ${lojista.nome_estabelecimento}.`
                        )}`;

                        return (
                          <div
                            key={cliente.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, cliente.id)}
                            className="group relative rounded-xl border border-[#4C566A]/40 bg-[#242933] p-3.5 shadow-md hover:border-[#88C0D0]/60 transition-all cursor-grab active:cursor-grabbing space-y-2.5"
                          >
                            {/* Nome e Badges */}
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleAbrirDrawer(cliente)}
                                className="text-left font-bold text-xs sm:text-sm text-[#ECEFF4] hover:text-[#88C0D0] transition line-clamp-1"
                              >
                                {cliente.nome}
                              </button>

                              {/* Badges Automáticos */}
                              <div className="flex items-center gap-1 shrink-0">
                                {isVip && (
                                  <span className="rounded bg-[#88C0D0]/20 text-[#88C0D0] px-1.5 py-0.5 text-[9px] font-black border border-[#88C0D0]/40">
                                    VIP
                                  </span>
                                )}
                                {isRecorrente && (
                                  <span className="rounded bg-[#A3BE8C]/20 text-[#A3BE8C] px-1.5 py-0.5 text-[9px] font-black border border-[#A3BE8C]/40">
                                    Recorrente
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Tags do Cliente */}
                            {cliente.tags && cliente.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {cliente.tags.slice(0, 3).map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="rounded bg-[#3B4252] text-[#D8DEE9] px-1.5 py-0.5 text-[9px] font-mono"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {cliente.tags.length > 3 && (
                                  <span className="text-[9px] text-[#D8DEE9]/50">
                                    +{cliente.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Métricas: LTV & Agendamentos */}
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#4C566A]/20 text-[#D8DEE9]/70">
                              <span>
                                {cliente.total_agendamentos} {cliente.total_agendamentos === 1 ? 'visita' : 'visitas'}
                              </span>
                              <span className="font-mono font-bold text-[#88C0D0]">
                                {formatMoney(cliente.total_gasto)}
                              </span>
                            </div>

                            {/* Rodapé do Card: WhatsApp & Seletor de Etapa Rápido (Tablet/iPad) */}
                            <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#4C566A]/20">
                              <a
                                href={zapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A3BE8C] hover:text-[#A3BE8C]/80 transition"
                              >
                                <span>💬</span>
                                <span>WhatsApp</span>
                              </a>

                              {/* Menu Rápido de 1 Clique */}
                              <select
                                value={cliente.etapa_kanban}
                                onChange={(e) => handleMudarEtapa(cliente.id, e.target.value)}
                                className="rounded bg-[#3B4252] border border-[#4C566A]/40 px-1.5 py-0.5 text-[10px] text-[#D8DEE9] focus:outline-none"
                              >
                                {ETAPAS_CONFIG.map((et) => (
                                  <option key={et.id} value={et.id}>
                                    &rarr; {et.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ==================================================== */
          /* MODO LISTA INTELIGENTE (MOBILE & COMPACTO)           */
          /* ==================================================== */
          <div className="space-y-4">
            {/* Filtro Rápido por Etapa em Pílula */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setSelectedEtapaFilter('todos')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  selectedEtapaFilter === 'todos'
                    ? 'bg-[#88C0D0] text-[#242933]'
                    : 'bg-[#2E3440] text-[#D8DEE9]/70 hover:text-white border border-[#4C566A]/40'
                }`}
              >
                Todos ({clientes.length})
              </button>
              {ETAPAS_CONFIG.map((et) => (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => setSelectedEtapaFilter(et.id)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    selectedEtapaFilter === et.id
                      ? 'bg-[#88C0D0] text-[#242933]'
                      : 'bg-[#2E3440] text-[#D8DEE9]/70 hover:text-white border border-[#4C566A]/40'
                  }`}
                >
                  {et.label} ({(colunasKanban[et.id] || []).length})
                </button>
              ))}
            </div>

            {/* Tabela de Clientes */}
            <div className="rounded-2xl border border-[#4C566A]/40 bg-[#2E3440] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#242933] border-b border-[#4C566A]/30 text-[11px] font-bold text-[#D8DEE9]/60 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Cliente</th>
                      <th className="py-3.5 px-4">WhatsApp</th>
                      <th className="py-3.5 px-4">Etapa</th>
                      <th className="py-3.5 px-4">Visitas</th>
                      <th className="py-3.5 px-4">LTV (Gasto)</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#4C566A]/20">
                    {clientesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-[#D8DEE9]/40 italic">
                          Nenhum cliente encontrado com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      clientesFiltrados.map((cliente) => {
                        const zapUrl = `https://wa.me/55${cliente.telefone}?text=${encodeURIComponent(
                          `Olá, ${cliente.nome}! Tudo bem?`
                        )}`;

                        return (
                          <tr key={cliente.id} className="hover:bg-[#3B4252]/30 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#ECEFF4] hover:text-[#88C0D0] cursor-pointer" onClick={() => handleAbrirDrawer(cliente)}>
                                  {cliente.nome}
                                </span>
                                {cliente.total_gasto >= 500 && (
                                  <span className="rounded bg-[#88C0D0]/20 text-[#88C0D0] px-1.5 py-0.2 text-[9px] font-black border border-[#88C0D0]/30">
                                    VIP
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-[#D8DEE9]/80">
                              {cliente.telefone}
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                value={cliente.etapa_kanban}
                                onChange={(e) => handleMudarEtapa(cliente.id, e.target.value)}
                                className="rounded-lg bg-[#3B4252] border border-[#4C566A]/40 px-2 py-1 text-xs text-[#ECEFF4] focus:outline-none"
                              >
                                {ETAPAS_CONFIG.map((et) => (
                                  <option key={et.id} value={et.id}>
                                    {et.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {cliente.total_agendamentos}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-[#88C0D0]">
                              {formatMoney(cliente.total_gasto)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <a
                                  href={zapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg bg-[#A3BE8C]/20 border border-[#A3BE8C]/40 px-2.5 py-1 text-xs font-bold text-[#A3BE8C] hover:bg-[#A3BE8C] hover:text-[#242933] transition"
                                >
                                  WhatsApp
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleAbrirDrawer(cliente)}
                                  className="rounded-lg bg-[#3B4252] px-2.5 py-1 text-xs font-semibold text-[#ECEFF4] hover:bg-[#4C566A] transition"
                                >
                                  Ver Ficha
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* 3. DRAWER LATERAL DE DETALHES DO CLIENTE             */}
      {/* ==================================================== */}
      {activeCliente && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-md h-full bg-[#2E3440] border-l border-[#4C566A]/50 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Topo do Drawer */}
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#4C566A]/30">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-[#88C0D0] text-[#242933] flex items-center justify-center font-black text-sm">
                    {activeCliente.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#ECEFF4]">{activeCliente.nome}</h3>
                    <p className="text-xs font-mono text-[#D8DEE9]/60">{activeCliente.telefone}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveCliente(null)}
                  className="rounded-lg p-1.5 text-[#D8DEE9]/60 hover:text-white hover:bg-[#3B4252] transition"
                >
                  ✕
                </button>
              </div>

              {/* Botão Direto WhatsApp */}
              <a
                href={`https://wa.me/55${activeCliente.telefone}?text=${encodeURIComponent(
                  `Olá, ${activeCliente.nome}! Como posso ajudar?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#A3BE8C] py-2.5 text-xs font-bold text-[#242933] hover:bg-[#A3BE8C]/90 shadow-sm transition"
              >
                <span>💬 Abrir Conversa no WhatsApp</span>
              </a>

              {/* Métricas de Fidelidade */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-[#4C566A]/30 bg-[#242933] p-3 text-center">
                  <span className="text-[10px] text-[#D8DEE9]/60 uppercase tracking-wider block">
                    LTV Acumulado
                  </span>
                  <span className="text-base font-black text-[#88C0D0] font-mono">
                    {formatMoney(activeCliente.total_gasto)}
                  </span>
                </div>

                <div className="rounded-xl border border-[#4C566A]/30 bg-[#242933] p-3 text-center">
                  <span className="text-[10px] text-[#D8DEE9]/60 uppercase tracking-wider block">
                    Agendamentos
                  </span>
                  <span className="text-base font-black text-[#ECEFF4] font-mono">
                    {activeCliente.total_agendamentos} visitas
                  </span>
                </div>
              </div>

              {/* Etapa Atual no Funil */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]/70">
                  Etapa no Funil / Kanban
                </label>
                <select
                  value={activeCliente.etapa_kanban}
                  onChange={(e) => handleMudarEtapa(activeCliente.id, e.target.value)}
                  className="w-full rounded-xl border border-[#4C566A]/40 bg-[#3B4252] p-2.5 text-xs text-[#ECEFF4] font-semibold focus:outline-none"
                >
                  {ETAPAS_CONFIG.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seletor de Tags do Cliente */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]/70">
                  Tags & Preferências
                </label>

                {/* Tags Atuais */}
                <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                  {drawerTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#3B4252] border border-[#4C566A]/50 px-2 py-1 text-xs text-[#ECEFF4]"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[10px] text-[#D8DEE9]/60 hover:text-[#BF616A]"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                {/* Input Nova Tag */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newTagInput);
                      }
                    }}
                    className="flex-1 rounded-xl border border-[#4C566A]/40 bg-[#242933] px-3 py-1.5 text-xs text-[#ECEFF4] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(newTagInput)}
                    className="rounded-xl bg-[#3B4252] px-3 py-1.5 text-xs font-bold text-[#88C0D0] hover:bg-[#4C566A]"
                  >
                    + Tag
                  </button>
                </div>

                {/* Sugestões Rápidas */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {TAGS_SUGERIDAS.map((sugestao) => (
                    <button
                      key={sugestao}
                      type="button"
                      onClick={() => handleAddTag(sugestao)}
                      className="rounded bg-[#242933] hover:bg-[#3B4252] px-2 py-0.5 text-[10px] text-[#D8DEE9]/60 border border-[#4C566A]/20 transition"
                    >
                      +{sugestao}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anotações Internas de Atendimento */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]/70">
                  Anotações Internas de Atendimento
                </label>
                <textarea
                  rows={4}
                  value={drawerNotas}
                  onChange={(e) => setDrawerNotas(e.target.value)}
                  placeholder="Ex: Prefere corte na tesoura, sensibilidade a lâmina, cafezinho sem açúcar..."
                  className="w-full rounded-xl border border-[#4C566A]/40 bg-[#242933] p-3 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>
            </div>

            {/* Rodapé do Drawer */}
            <div className="pt-6 border-t border-[#4C566A]/30 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSalvarNotas}
                disabled={isPending}
                className="flex-1 rounded-xl bg-[#88C0D0] py-2.5 text-xs font-black text-[#242933] hover:bg-[#88C0D0]/90 transition"
              >
                {isPending ? 'Salvando...' : 'Salvar Anotações'}
              </button>

              <button
                type="button"
                onClick={() => setActiveCliente(null)}
                className="rounded-xl border border-[#4C566A]/40 bg-[#3B4252] px-4 py-2.5 text-xs font-bold text-[#ECEFF4] hover:bg-[#4C566A]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. MODAL MANUAL: NOVO CLIENTE                        */}
      {/* ==================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#4C566A]/50 bg-[#2E3440] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#4C566A]/30">
              <h3 className="text-base font-bold text-[#ECEFF4]">Cadastrar Novo Cliente</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#D8DEE9]/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded-xl bg-[#BF616A]/20 border border-[#BF616A]/40 p-2.5 text-xs text-[#BF616A]">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitNovoCliente} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#D8DEE9] block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full rounded-xl border border-[#4C566A]/40 bg-[#3B4252] p-2.5 text-xs text-[#ECEFF4] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#D8DEE9] block mb-1">
                  WhatsApp com DDD (apenas dígitos) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 11999998888"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl border border-[#4C566A]/40 bg-[#3B4252] p-2.5 text-xs text-[#ECEFF4] font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#D8DEE9] block mb-1">
                    Etapa Inicial
                  </label>
                  <select
                    value={novaEtapa}
                    onChange={(e) => setNovaEtapa(e.target.value)}
                    className="w-full rounded-xl border border-[#4C566A]/40 bg-[#3B4252] p-2.5 text-xs text-[#ECEFF4] focus:outline-none"
                  >
                    {ETAPAS_CONFIG.map((et) => (
                      <option key={et.id} value={et.id}>
                        {et.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#D8DEE9] block mb-1">
                    Valor Gasto Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    className="w-full rounded-xl border border-[#4C566A]/40 bg-[#3B4252] p-2.5 text-xs text-[#ECEFF4] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-[#4C566A]/40 bg-[#3B4252] px-4 py-2 text-xs font-bold text-[#D8DEE9] hover:bg-[#4C566A]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#88C0D0] px-5 py-2 text-xs font-black text-[#242933] hover:bg-[#88C0D0]/90 transition"
                >
                  {isPending ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
