'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  Gift,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface LojistaManutencaoItem {
  id: string;
  nome_estabelecimento: string;
  slug_subdominio: string;
  tier?: string | null;
  status_pagamento?: string | null;
  is_founder?: boolean | null;
  asaas_subscription_id?: string | null;
}

interface ManutencaoPanelProps {
  lojistas: LojistaManutencaoItem[];
}

export function ManutencaoPanel({ lojistas }: ManutencaoPanelProps) {
  const router = useRouter();
  const [lojistaId, setLojistaId] = useState<string>(lojistas[0]?.id || '');
  const [idsParaExcluir, setIdsParaExcluir] = useState<string[]>([]);
  const [confirmarExclusao, setConfirmarExclusao] = useState<boolean>(false);
  const [confirmarFilas, setConfirmarFilas] = useState<boolean>(false);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  const lojistaAtual = useMemo(
    () => lojistas.find((l) => l.id === lojistaId) || null,
    [lojistas, lojistaId]
  );

  const toggleLojistaExclusao = (id: string) => {
    setIdsParaExcluir((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const executarAcao = async (
    nomeAcao: string,
    payload: Record<string, unknown>,
    limparConfirmacao?: () => void
  ) => {
    setCarregando(nomeAcao);
    setFeedback(null);

    try {
      const resp = await fetch('/api/admin/manutencao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const dados = await resp.json();

      if (!resp.ok) {
        setFeedback({
          tipo: 'erro',
          texto: dados?.error || 'Não foi possível concluir a operação.',
        });
        return;
      }

      if (limparConfirmacao) limparConfirmacao();
      setFeedback({
        tipo: 'sucesso',
        texto: dados?.mensagem || 'Operação concluída com sucesso.',
      });
      router.refresh();
    } catch {
      setFeedback({
        tipo: 'erro',
        texto: 'Falha de comunicação com o servidor.',
      });
    } finally {
      setCarregando(null);
    }
  };

  return (
    <section className="rounded-2xl border border-[#4C566A] bg-[#2E3440] p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#4C566A]/60 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B4252] border border-[#4C566A] text-[#EBCB8B]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#ECEFF4]">
              Limpeza de Testes, Cobranças e Cortesia Segura
            </h2>
            <p className="text-xs text-[#ECEFF4]/75 mt-0.5">
              Conceda acesso gratuito (Fundador) para pessoas de confiança, exclua lojistas de teste com cancelamento no Asaas ou zere filas sem tocar nas regras de segurança.
            </p>
          </div>
        </div>
      </div>

      {/* Seletor de Lojista */}
      <div className="rounded-xl border border-[#4C566A] bg-[#3B4252] p-4 space-y-2">
        <label
          htmlFor="seletor-lojista-manutencao"
          className="block text-xs font-semibold text-[#ECEFF4]"
        >
          Estabelecimento Alvo
        </label>
        <select
          id="seletor-lojista-manutencao"
          value={lojistaId}
          onChange={(e) => {
            setLojistaId(e.target.value);
            setFeedback(null);
          }}
          className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2.5 text-xs text-[#ECEFF4] focus:outline-none focus:ring-2 focus:ring-[#88C0D0]"
        >
          {lojistas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome_estabelecimento} — slug: {l.slug_subdominio} ({l.is_founder ? 'Fundador/Gratuito' : l.status_pagamento || 'pendente'})
            </option>
          ))}
        </select>
      </div>

      {/* Cards de Ação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Cortesia Segura (is_founder) */}
        <div className="rounded-xl border border-[#4C566A] bg-[#3B4252] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#A3BE8C]">
              <Gift className="h-4 w-4" />
              <span>Uso Sem Custos (Cortesia)</span>
            </div>
            <p className="text-xs text-[#ECEFF4]/80 leading-relaxed">
              Ativa <span className="font-mono text-[#88C0D0]">is_founder = true</span> com status ativo vitalício, isento de cobranças e protegido contra rebaixamento por webhooks — sem abrir brechas no RLS ou no login.
            </p>
          </div>

          {lojistaAtual && (
            <button
              type="button"
              disabled={carregando !== null}
              onClick={() =>
                executarAcao('cortesia', {
                  acao: 'conceder_cortesia',
                  lojistaId: lojistaAtual.id,
                  conceder: !lojistaAtual.is_founder,
                })
              }
              className={`w-full rounded-xl px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                lojistaAtual.is_founder
                  ? 'border border-[#EBCB8B]/50 bg-[#2E3440] text-[#EBCB8B] hover:bg-[#434C5E]'
                  : 'bg-[#A3BE8C] text-[#2E3440] hover:bg-[#A3BE8C]/90'
              }`}
            >
              {carregando === 'cortesia'
                ? 'Aplicando...'
                : lojistaAtual.is_founder
                ? 'Revogar Cortesia (Voltar p/ Pendente)'
                : 'Conceder Acesso Gratuito (Fundador)'}
            </button>
          )}
        </div>

        {/* 2. Excluir Lojista de Teste + Cancelar Asaas */}
        <div className="rounded-xl border border-[#BF616A]/40 bg-[#3B4252] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-[#BF616A]">
              <Trash2 className="h-4 w-4" />
              <span>Excluir Lojistas de Teste</span>
            </div>
            <p className="text-xs text-[#ECEFF4]/80 leading-relaxed">
              Marque os lojistas que deseja apagar. Cancela a assinatura no Asaas e remove dados em cascata.
            </p>

            {/* Caixa de seleção de lojistas cadastrados */}
            <div className="max-h-36 overflow-y-auto rounded-xl border border-[#4C566A] bg-[#2E3440] p-2 space-y-1.5">
              {lojistas.map((l) => {
                const marcado = idsParaExcluir.includes(l.id);
                return (
                  <label
                    key={l.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-[#3B4252] cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => toggleLojistaExclusao(l.id)}
                        className="h-4 w-4 shrink-0 accent-[#BF616A]"
                      />
                      <span className="truncate font-semibold text-[#ECEFF4]">
                        {l.nome_estabelecimento}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-[#ECEFF4]/60">
                      {l.slug_subdominio}
                    </span>
                  </label>
                );
              })}
            </div>

            <label
              className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs cursor-pointer transition-colors ${
                idsParaExcluir.length > 0 && !confirmarExclusao
                  ? 'text-[#EBCB8B] font-semibold bg-[#EBCB8B]/10 border border-[#EBCB8B]/30'
                  : 'text-[#ECEFF4]'
              }`}
            >
              <input
                type="checkbox"
                checked={confirmarExclusao}
                onChange={(e) => setConfirmarExclusao(e.target.checked)}
                className="h-4 w-4 accent-[#BF616A]"
              />
              <span>Confirmar exclusão definitiva</span>
            </label>
          </div>

          <button
            type="button"
            disabled={carregando !== null || idsParaExcluir.length === 0}
            onClick={() => {
              if (!confirmarExclusao) {
                setFeedback({
                  tipo: 'erro',
                  texto:
                    'Marque a caixa "Confirmar exclusão definitiva" acima para concluir a remoção.',
                });
                return;
              }
              executarAcao(
                'excluir',
                {
                  acao: 'excluir_lojista',
                  lojistaIds: idsParaExcluir,
                  confirmado: confirmarExclusao,
                },
                () => {
                  setIdsParaExcluir([]);
                  setConfirmarExclusao(false);
                }
              );
            }}
            className={`w-full rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              idsParaExcluir.length > 0
                ? 'bg-[#BF616A] text-[#ECEFF4] shadow-lg shadow-[#BF616A]/40 ring-2 ring-[#BF616A]/65 hover:bg-[#BF616A]/90'
                : 'bg-[#BF616A]/35 text-[#ECEFF4]/50 cursor-not-allowed'
            }`}
          >
            {carregando === 'excluir'
              ? 'Excluindo...'
              : idsParaExcluir.length > 0
              ? `Excluir ${idsParaExcluir.length} Selecionado(s)`
              : 'Excluir Lojistas Selecionados'}
          </button>
        </div>

        {/* 3. Zerar Filas e Logs de Webhook */}
        <div className="rounded-xl border border-[#4C566A] bg-[#3B4252] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#88C0D0]">
              <RefreshCw className="h-4 w-4" />
              <span>Zerar Filas e Logs</span>
            </div>
            <p className="text-xs text-[#ECEFF4]/80 leading-relaxed">
              Limpa <span className="font-mono">chat_queue</span> e <span className="font-mono">webhook_eventos_processados</span> após testes. Não apaga lojistas, clientes ou agendamentos.
            </p>
            <label className="flex items-center gap-2 text-xs text-[#ECEFF4] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={confirmarFilas}
                onChange={(e) => setConfirmarFilas(e.target.checked)}
                className="h-4 w-4 accent-[#88C0D0]"
              />
              <span>Confirmar limpeza das filas</span>
            </label>
          </div>

          <button
            type="button"
            disabled={carregando !== null || !confirmarFilas}
            onClick={() =>
              executarAcao(
                'filas',
                { acao: 'zerar_filas' },
                () => setConfirmarFilas(false)
              )
            }
            className="w-full rounded-xl border border-[#88C0D0]/50 bg-[#2E3440] px-4 py-2.5 text-xs font-bold text-[#88C0D0] hover:bg-[#434C5E] disabled:opacity-40 transition-colors cursor-pointer"
          >
            {carregando === 'filas' ? 'Limpando...' : 'Zerar Filas de Teste'}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
            feedback.tipo === 'sucesso'
              ? 'border-[#A3BE8C]/45 bg-[#A3BE8C]/15 text-[#A3BE8C]'
              : 'border-[#BF616A]/45 bg-[#BF616A]/15 text-[#BF616A]'
          }`}
        >
          {feedback.tipo === 'sucesso' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}
    </section>
  );
}
