'use client';

import { useState, useTransition } from 'react';
import { addClienteAction, deleteClienteAction } from '@/app/actions/clientes';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  total_agendamentos: number;
  ultimo_agendamento: string | null;
  created_at: string;
}

interface ClientesClientProps {
  lojista: {
    id: string;
    nome_estabelecimento: string;
    slug_subdominio: string;
  };
  initialClientes: Cliente[];
  kpis: {
    totalClientes: number;
    clientesRecorrentes: number;
    totalAgendamentosGeral: number;
  };
}

export function ClientesClient({
  lojista,
  initialClientes,
  kpis,
}: ClientesClientProps) {
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const [isPendingAdd, startTransitionAdd] = useTransition();
  const [isPendingDelete, startTransitionDelete] = useTransition();

  // Filtragem instantânea
  const filteredClientes = clientes.filter((c) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      c.nome.toLowerCase().includes(term) ||
      c.telefone.includes(term.replace(/\D/g, ''))
    );
  });

  const formatTelefone = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  const formatData = (dateStr: string | null) => {
    if (!dateStr) return 'Nenhum agendamento';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIniciais = (nome: string) => {
    const parts = nome.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return nome.slice(0, 2).toUpperCase();
  };

  const handleAddCliente = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.append('nome', novoNome);
    formData.append('telefone', novoTelefone);

    startTransitionAdd(async () => {
      const res = await addClienteAction(formData);
      if (res.success) {
        setFeedback('Cliente adicionado com sucesso!');
        setShowAddModal(false);
        setNovoNome('');
        setNovoTelefone('');
        // Adiciona localmente de forma otimista
        const cleanZap = novoTelefone.replace(/\D/g, '');
        const newEntry: Cliente = {
          id: `temp-${Date.now()}`,
          nome: novoNome,
          telefone: cleanZap,
          total_agendamentos: 1,
          ultimo_agendamento: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        setClientes((prev) => [newEntry, ...prev.filter(c => c.telefone !== cleanZap)]);
      } else {
        setFeedback(res.error || 'Erro ao cadastrar cliente.');
      }
      setTimeout(() => setFeedback(null), 4000);
    });
  };

  const handleDelete = (clienteId: string, nome: string) => {
    if (!confirm(`Deseja realmente remover o cliente "${nome}" da sua base?`)) return;

    startTransitionDelete(async () => {
      const res = await deleteClienteAction(clienteId);
      if (res.success) {
        setClientes((prev) => prev.filter((c) => c.id !== clienteId));
      } else {
        alert(res.error || 'Erro ao remover cliente.');
      }
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Base de Clientes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie todos os clientes cadastrados automaticamente pelos agendamentos ou adicionados manualmente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Cliente
        </button>
      </div>

      {feedback && (
        <div className={`rounded-lg p-3 text-xs font-medium border ${feedback.includes('sucesso') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {feedback}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total de Clientes</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{kpis.totalClientes}</p>
          <p className="mt-1 text-xs text-slate-500">Contatos ativos no seu sistema</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Clientes Recorrentes</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{kpis.clientesRecorrentes}</p>
          <p className="mt-1 text-xs text-slate-500">Agendaram 2 ou mais vezes</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total de Atendimentos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{kpis.totalAgendamentosGeral}</p>
          <p className="mt-1 text-xs text-slate-500">Horários realizados acumulados</p>
        </div>
      </div>

      {/* Tabela e Busca */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Barra de Pesquisa */}
        <div className="border-b border-slate-200 p-4 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou WhatsApp..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-xs"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Exibindo {filteredClientes.length} de {clientes.length} contatos
          </span>
        </div>

        {/* Lista / Tabela */}
        {filteredClientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Nenhum cliente encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {search 
                ? 'Tente buscar com outros termos ou limpe o campo de busca.'
                : 'Os clientes serão listados aqui automaticamente assim que realizarem o primeiro agendamento pelo seu link.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Cliente</th>
                  <th className="px-6 py-3.5">WhatsApp</th>
                  <th className="px-6 py-3.5">Fidelidade</th>
                  <th className="px-6 py-3.5">Último Atendimento</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClientes.map((cliente) => {
                  const zapLink = `https://wa.me/55${cliente.telefone}?text=${encodeURIComponent(
                    `Olá ${cliente.nome}, tudo bem? Aqui é do(a) ${lojista.nome_estabelecimento}!`
                  )}`;

                  const isFiel = cliente.total_agendamentos > 2;
                  const isRecorrente = cliente.total_agendamentos === 2;

                  return (
                    <tr key={cliente.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Cliente */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-xs">
                            {getIniciais(cliente.nome)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{cliente.nome}</p>
                            <p className="text-[11px] text-slate-400">Cadastrado em {new Date(cliente.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                      </td>

                      {/* WhatsApp */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700">
                        {formatTelefone(cliente.telefone)}
                      </td>

                      {/* Fidelidade */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 tabular-nums">{cliente.total_agendamentos}</span>
                          <span className="text-slate-400">visitas</span>
                          {isFiel ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              VIP
                            </span>
                          ) : isRecorrente ? (
                            <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                              Fiel
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              Novo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Último Atendimento */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {formatData(cliente.ultimo_agendamento)}
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={zapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                            title="Conversar no WhatsApp"
                          >
                            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.353.101.173.45 0.742.965 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.679.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z" />
                            </svg>
                            WhatsApp
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(cliente.id, cliente.nome)}
                            disabled={isPendingDelete}
                            className="rounded-md p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                            title="Remover Cliente"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Dialog Novo Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Cadastrar Novo Cliente</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-md p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddCliente} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp com DDD</label>
                <input
                  type="text"
                  required
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  placeholder="Ex: 11999998888"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-[11px] text-slate-400 block">
                  Apenas dígitos com DDD (ex: 11988887777).
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPendingAdd}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {isPendingAdd ? 'Salvando...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
