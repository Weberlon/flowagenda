'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface HealthCheckResponse {
  success: boolean;
  checkedAt: string;
  env: {
    ok: boolean;
    checks: Record<string, boolean>;
    missing: string[];
  };
  infrastructure: {
    asaas: { ok: boolean; latencyMs: number; status?: number; error?: string };
    evolution: { ok: boolean; latencyMs: number; totalInstances: number; error?: string };
    chatQueue: { ok: boolean; stuckCount: number; pendingTotal: number; error?: string };
  };
  summary: {
    totalLojistas: number;
    totalAlerts: number;
  };
  alerts: Array<{
    lojistaId: string;
    nomeEstabelecimento: string;
    slugSubdominio: string;
    severity: 'error' | 'warning';
    code: string;
    message: string;
    suggestedAction: string | null;
    actionLabel?: string;
    instanceName?: string | null;
  }>;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  target: string;
  status: 'sucesso' | 'erro';
  message: string;
  accessLink?: string;
}

export function HealthCheckPanel() {
  const router = useRouter();
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [report, setReport] = useState<HealthCheckResponse | null>(null);
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const appendLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    setAuditLogs((prev) => [
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        ...entry,
      },
      ...prev,
    ]);
  };

  async function runDiagnostic() {
    setLoadingDiag(true);
    setDiagError(null);
    try {
      const res = await fetch('/api/admin/health-check', {
        method: 'GET',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        setDiagError(data.error || 'Erro ao executar diagnóstico.');
        return;
      }
      setReport(data);
    } catch {
      setDiagError('Falha de comunicação ao consultar diagnóstico do sistema.');
    } finally {
      setLoadingDiag(false);
    }
  }

  async function runRepairAction(
    action: string,
    lojistaId?: string,
    targetName?: string
  ) {
    const key = `${action}_${lojistaId || 'global'}`;
    setRunningKey(key);
    try {
      const res = await fetch('/api/admin/auto-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, lojistaId }),
      });
      const data = await res.json();

      if (!res.ok) {
        appendLog({
          action,
          target: targetName || 'Sistema Global',
          status: 'erro',
          message: data.error || 'Falha ao executar reparo.',
        });
        return;
      }

      if (data.accessLink) {
        await navigator.clipboard.writeText(data.accessLink).catch(() => {});
      }

      appendLog({
        action,
        target: targetName || 'Sistema Global',
        status: 'sucesso',
        message: data.message || 'Reparo concluído com sucesso.',
        accessLink: data.accessLink,
      });

      await runDiagnostic();
      router.refresh();
    } catch {
      appendLog({
        action,
        target: targetName || 'Sistema Global',
        status: 'erro',
        message: 'Erro de rede ao executar auto-reparação.',
      });
    } finally {
      setRunningKey(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[#3B4252] bg-[#242933] p-6 text-[#ECEFF4] shadow-xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#3B4252] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#2E3440] text-[#88C0D0] border border-[#3B4252] text-sm">
              🩺
            </span>
            <h2 className="text-xl font-bold tracking-tight text-[#ECEFF4]">
              Diagnóstico & Reparação do Sistema
            </h2>
          </div>
          <p className="text-xs text-[#D8DEE9]/70 mt-1">
            Auditoria isolada em tempo real de Asaas, Evolution API v2, fila de IA e integridade dos lojistas.
          </p>
        </div>

        <button
          type="button"
          onClick={runDiagnostic}
          disabled={loadingDiag}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#88C0D0] px-5 py-2.5 text-xs font-black text-[#242933] hover:bg-[#88C0D0]/90 disabled:opacity-50 transition shadow-md cursor-pointer"
        >
          {loadingDiag ? 'Verificando Infraestrutura...' : 'Executar Diagnóstico Completo'}
        </button>
      </div>

      {diagError && (
        <div className="rounded-xl border border-[#BF616A]/50 bg-[#BF616A]/15 p-3.5 text-xs font-medium text-[#ECEFF4]">
          ⚠️ {diagError}
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Cards de Status em Tempo Real */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Asaas */}
            <div className="rounded-xl border border-[#3B4252] bg-[#2E3440] p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#D8DEE9]/80">Asaas Produção</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    report.infrastructure.asaas.ok
                      ? 'bg-[#A3BE8C]/20 text-[#A3BE8C]'
                      : 'bg-[#BF616A]/20 text-[#BF616A]'
                  }`}
                >
                  {report.infrastructure.asaas.ok ? 'ONLINE' : 'FALHA'}
                </span>
              </div>
              <p className="text-sm font-mono font-bold text-[#ECEFF4]">
                {report.infrastructure.asaas.ok
                  ? `${report.infrastructure.asaas.latencyMs} ms`
                  : 'Indisponível'}
              </p>
              {report.infrastructure.asaas.error && (
                <p className="text-[11px] text-[#BF616A] truncate" title={report.infrastructure.asaas.error}>
                  {report.infrastructure.asaas.error}
                </p>
              )}
            </div>

            {/* Evolution API v2 */}
            <div className="rounded-xl border border-[#3B4252] bg-[#2E3440] p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#D8DEE9]/80">Evolution API v2</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    report.infrastructure.evolution.ok
                      ? 'bg-[#A3BE8C]/20 text-[#A3BE8C]'
                      : 'bg-[#BF616A]/20 text-[#BF616A]'
                  }`}
                >
                  {report.infrastructure.evolution.ok ? 'ONLINE' : 'FALHA'}
                </span>
              </div>
              <p className="text-sm font-mono font-bold text-[#ECEFF4]">
                {report.infrastructure.evolution.ok
                  ? `${report.infrastructure.evolution.totalInstances} instância(s) • ${report.infrastructure.evolution.latencyMs} ms`
                  : 'Indisponível'}
              </p>
              {report.infrastructure.evolution.error && (
                <p className="text-[11px] text-[#BF616A] truncate" title={report.infrastructure.evolution.error}>
                  {report.infrastructure.evolution.error}
                </p>
              )}
            </div>

            {/* Supabase / Fila IA */}
            <div className="rounded-xl border border-[#3B4252] bg-[#2E3440] p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#D8DEE9]/80">Supabase / Fila IA</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    report.infrastructure.chatQueue.stuckCount === 0
                      ? 'bg-[#A3BE8C]/20 text-[#A3BE8C]'
                      : 'bg-[#EBCB8B]/20 text-[#EBCB8B]'
                  }`}
                >
                  {report.infrastructure.chatQueue.stuckCount === 0
                    ? 'SAUDÁVEL'
                    : `${report.infrastructure.chatQueue.stuckCount} TRAVADA(S)`}
                </span>
              </div>
              <p className="text-sm font-mono font-bold text-[#ECEFF4]">
                {report.infrastructure.chatQueue.pendingTotal} pendente(s)
              </p>
              {report.infrastructure.chatQueue.stuckCount > 0 && (
                <button
                  type="button"
                  onClick={() => runRepairAction('flush_chat_queue', undefined, 'Fila de IA')}
                  disabled={runningKey === 'flush_chat_queue_global'}
                  className="mt-1 rounded-lg bg-[#EBCB8B] px-2.5 py-1 text-[11px] font-bold text-[#242933] hover:bg-[#EBCB8B]/90 cursor-pointer"
                >
                  {runningKey === 'flush_chat_queue_global' ? 'Processando...' : 'Destravar Fila IA'}
                </button>
              )}
            </div>

            {/* Variáveis de Ambiente */}
            <div className="rounded-xl border border-[#3B4252] bg-[#2E3440] p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#D8DEE9]/80">Variáveis de Ambiente</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    report.env.ok
                      ? 'bg-[#A3BE8C]/20 text-[#A3BE8C]'
                      : 'bg-[#BF616A]/20 text-[#BF616A]'
                  }`}
                >
                  {report.env.ok ? '100% OK' : `${report.env.missing.length} AUSENTE(S)`}
                </span>
              </div>
              <p className="text-xs font-mono text-[#D8DEE9]/80">
                {report.env.ok
                  ? 'Todas as chaves críticas configuradas.'
                  : `Faltando: ${report.env.missing.join(', ')}`}
              </p>
            </div>
          </div>

          {/* Lista de Alertas por Lojista */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#ECEFF4]">
                Alertas por Estabelecimento ({report.alerts.length})
              </h3>
              <span className="text-[11px] font-mono text-[#D8DEE9]/60">
                Última checagem: {new Date(report.checkedAt).toLocaleTimeString('pt-BR')}
              </span>
            </div>

            {report.alerts.length === 0 ? (
              <div className="rounded-xl border border-[#A3BE8C]/30 bg-[#A3BE8C]/10 p-4 text-xs font-medium text-[#A3BE8C]">
                ✓ Nenhuma inconsistência encontrada nos {report.summary.totalLojistas} estabelecimentos auditados.
              </div>
            ) : (
              <div className="space-y-2.5">
                {report.alerts.map((alert, idx) => (
                  <div
                    key={`${alert.lojistaId}_${alert.code}_${idx}`}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-[#3B4252] bg-[#2E3440] p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            alert.severity === 'error'
                              ? 'bg-[#BF616A]/20 text-[#BF616A]'
                              : 'bg-[#EBCB8B]/20 text-[#EBCB8B]'
                          }`}
                        >
                          {alert.severity === 'error' ? 'Crítico' : 'Atenção'}
                        </span>
                        <span className="text-xs font-bold text-[#ECEFF4]">
                          {alert.nomeEstabelecimento}
                        </span>
                        <span className="text-[11px] font-mono text-[#88C0D0]">
                          ({alert.slugSubdominio})
                        </span>
                      </div>
                      <p className="text-xs text-[#D8DEE9]/85">{alert.message}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {alert.suggestedAction && (
                        <button
                          type="button"
                          onClick={() =>
                            runRepairAction(
                              alert.suggestedAction!,
                              alert.lojistaId,
                              alert.nomeEstabelecimento
                            )
                          }
                          disabled={runningKey === `${alert.suggestedAction}_${alert.lojistaId}`}
                          className="rounded-lg bg-[#88C0D0] px-3 py-1.5 text-xs font-bold text-[#242933] hover:bg-[#88C0D0]/90 disabled:opacity-50 transition cursor-pointer"
                        >
                          {runningKey === `${alert.suggestedAction}_${alert.lojistaId}`
                            ? 'Executando...'
                            : alert.actionLabel || 'Reparar'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          runRepairAction(
                            'send_access_link',
                            alert.lojistaId,
                            alert.nomeEstabelecimento
                          )
                        }
                        disabled={runningKey === `send_access_link_${alert.lojistaId}`}
                        className="rounded-lg border border-[#4C566A] bg-[#3B4252] px-3 py-1.5 text-xs font-semibold text-[#ECEFF4] hover:bg-[#434C5E] disabled:opacity-50 transition cursor-pointer"
                      >
                        {runningKey === `send_access_link_${alert.lojistaId}`
                          ? 'Gerando...'
                          : 'Enviar Acesso'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log de Auditoria da Sessão */}
      {auditLogs.length > 0 && (
        <div className="space-y-2.5 border-t border-[#3B4252] pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
            Log de Auditoria da Sessão
          </h3>
          <div className="max-h-56 overflow-y-auto space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-[#3B4252] bg-[#2E3440]/70 px-3.5 py-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#D8DEE9]/60">{log.timestamp}</span>
                    <span
                      className={`font-bold ${
                        log.status === 'sucesso' ? 'text-[#A3BE8C]' : 'text-[#BF616A]'
                      }`}
                    >
                      [{log.action}]
                    </span>
                    <span className="font-semibold text-[#ECEFF4]">{log.target}</span>
                  </div>
                  <p className="text-[#D8DEE9]/85">{log.message}</p>
                </div>

                {log.accessLink && (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(log.accessLink!)}
                    className="shrink-0 rounded-lg bg-[#3B4252] px-3 py-1 text-[11px] font-semibold text-[#88C0D0] hover:bg-[#4C566A] cursor-pointer"
                  >
                    Copiar Link de Acesso
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
