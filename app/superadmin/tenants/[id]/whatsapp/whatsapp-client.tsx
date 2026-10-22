'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { 
  refreshWhatsAppStatusAction, 
  restartWhatsAppAction, 
  disconnectWhatsAppAction 
} from '@/app/actions/configuracoes';

interface SuperAdminWhatsAppClientProps {
  lojista: {
    id: string;
    nome_estabelecimento: string;
    slug_subdominio: string;
  };
  instanceName: string;
  initialStatus: {
    instanceName: string;
    state: string;
    qrcode?: string | null;
  } | null;
  vpsWarning?: string | null;
}

export function SuperAdminWhatsAppClient({
  lojista,
  instanceName,
  initialStatus,
  vpsWarning,
}: SuperAdminWhatsAppClientProps) {
  const [whatsappStatus, setWhatsappStatus] = useState(initialStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const [isPendingRestart, startTransitionRestart] = useTransition();
  const [isPendingDisconnect, startTransitionDisconnect] = useTransition();

  const isConnected = whatsappStatus?.state === 'open';
  const isConnecting = whatsappStatus?.state === 'connecting';

  // Flag de controle para evitar múltiplos disparos automáticos no ciclo de vida
  const autoConnectTriggeredRef = useRef(false);

  // 4. INDEPENDÊNCIA DE COOKIE DE IMPERSONAÇÃO: Passa lojista.id diretamente como argumento
  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    setStatusFeedback(null);
    try {
      const res = await refreshWhatsAppStatusAction(lojista.id);
      if (res.success && res.status) {
        setWhatsappStatus(res.status);
        setStatusFeedback('Status sincronizado com sucesso!');
      } else {
        setStatusFeedback(res.error || 'Erro ao sincronizar status.');
      }
    } catch (err: any) {
      setStatusFeedback(err?.message || 'Falha de comunicação com o servidor.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setStatusFeedback(null), 3500);
    }
  };

  const handleRestart = () => {
    startTransitionRestart(async () => {
      setStatusFeedback('Iniciando instância na Evolution API e gerando QR Code...');
      try {
        const res = await restartWhatsAppAction(lojista.id);
        if (res.success) {
          setStatusFeedback('Instância iniciada. Aguardando emissão do QR Code pela VPS...');
          // Aguarda 1.5s para a Evolution API criar o socket Baileys e disponibilizar o QR Code
          await new Promise((resolve) => setTimeout(resolve, 1500));
          await handleRefreshStatus();
        } else {
          setStatusFeedback(res.error || 'Erro ao reiniciar/conectar instância.');
        }
      } catch (err: any) {
        setStatusFeedback(err?.message || 'Falha ao iniciar instância.');
      }
      setTimeout(() => setStatusFeedback(null), 4000);
    });
  };

  // Disparo automático via useEffect:
  // Se a instância estiver desconectada ('close' ou sem estado 'open') e sem QR Code,
  // aciona automaticamente o restart/connect para não deixar o usuário em tela vazia
  useEffect(() => {
    if (!initialStatus?.qrcode && initialStatus?.state !== 'open' && !autoConnectTriggeredRef.current) {
      autoConnectTriggeredRef.current = true;
      handleRestart();
    }
  }, []);

  const handleDisconnect = () => {
    if (!confirm(`Deseja realmente desconectar o robô de WhatsApp de ${lojista.nome_estabelecimento}?`)) return;
    startTransitionDisconnect(async () => {
      setStatusFeedback('Desconectando WhatsApp...');
      try {
        const res = await disconnectWhatsAppAction(lojista.id);
        if (res.success) {
          setStatusFeedback('Instância desconectada com sucesso.');
          await handleRefreshStatus();
        } else {
          setStatusFeedback(res.error || 'Erro ao desconectar.');
        }
      } catch (err: any) {
        setStatusFeedback(err?.message || 'Falha ao desconectar.');
      }
      setTimeout(() => setStatusFeedback(null), 4000);
    });
  };

  return (
    <div className="space-y-6">
      {vpsWarning && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
          <span className="text-base leading-none">⚠️</span>
          <div>
            <strong className="font-semibold">Aviso de Conectividade Evolution API:</strong>
            <p className="mt-0.5">{vpsWarning}</p>
          </div>
        </div>
      )}

      {/* Card Principal de Conexão WhatsApp */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Robô WhatsApp (Evolution API v2)</h2>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Conectado
                </span>
              ) : isConnecting ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                  Conectando...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Aguardando Pareamento
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Instância Evolution: <strong>{instanceName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              title="Sincronizar Status com a Evolution API"
            >
              <svg className={`h-4 w-4 mr-1.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
        </div>

        {statusFeedback && (
          <div className="mt-4 rounded-lg bg-slate-100 p-3 text-xs font-medium text-slate-800 border border-slate-200">
            {statusFeedback}
          </div>
        )}

        {/* Conteúdo de Estado */}
        <div className="pt-8">
          {isConnected ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-xl bg-emerald-50/60 border border-emerald-200 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-900">Robô Ativo e Pareado</h3>
                  <p className="text-xs text-emerald-700 mt-1 max-w-lg">
                    A instância de WhatsApp <strong>{instanceName}</strong> está conectada e operando normalmente. O estabelecimento está pronto para enviar lembretes e validar códigos PIN transacionais.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleRestart}
                  disabled={isPendingRestart}
                  className="rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50 transition-colors shadow-xs"
                >
                  {isPendingRestart ? 'Reiniciando...' : 'Reiniciar Instância'}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isPendingDisconnect}
                  className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors shadow-xs"
                >
                  {isPendingDisconnect ? 'Desconectando...' : 'Desconectar WhatsApp'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/70 text-center">
                {whatsappStatus?.qrcode ? (
                  <div className="relative p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                    <img
                      src={whatsappStatus.qrcode}
                      alt={`QR Code WhatsApp - ${lojista.nome_estabelecimento}`}
                      className="h-60 w-60 object-contain"
                    />
                  </div>
                ) : isPendingRestart ? (
                  <div className="flex flex-col items-center justify-center h-60 w-60 bg-blue-50/80 border border-blue-200 rounded-xl text-center p-4 shadow-inner">
                    <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                    <span className="text-xs font-bold text-blue-900">Iniciando na Evolution API...</span>
                    <span className="text-[11px] text-blue-700 mt-1">Conectando socket Baileys e gerando QR Code...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-5 h-60 w-60 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-2">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-900 mb-0.5">Instância Desconectada</span>
                    <p className="text-[11px] text-slate-500 mb-3 max-w-[190px]">Sessão Baileys parada na VPS. Clique abaixo para gerar o QR Code.</p>
                    <button
                      type="button"
                      onClick={handleRestart}
                      disabled={isPendingRestart}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 shadow-sm transition-colors cursor-pointer"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      Gerar QR Code Agora
                    </button>
                  </div>
                )}

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRestart}
                    disabled={isPendingRestart}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
                    title="Forçar reinicialização do socket na VPS para emitir novo QR Code"
                  >
                    <span>⚡</span>
                    {isPendingRestart ? 'Gerando...' : 'Gerar QR Code / Conectar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshStatus}
                    disabled={isRefreshing}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors shadow-xs cursor-pointer"
                    title="Consultar status atual na Evolution API"
                  >
                    {isRefreshing ? 'Sincronizando...' : 'Sincronizar Status'}
                  </button>
                </div>
              </div>

              {/* Instruções de Pareamento */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Como parear o WhatsApp do estabelecimento:</h3>
                <ol className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">1</span>
                    <span>Abra o <strong>WhatsApp</strong> no celular comercial do estabelecimento.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">2</span>
                    <span>Toque em <strong>Configurações / Opções</strong> (três pontinhos no Android).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">3</span>
                    <span>Selecione <strong>Aparelhos Conectados</strong> e toque em <strong>Conectar um aparelho</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">4</span>
                    <span>Aponte a câmera para o <strong>QR Code</strong> ao lado. A tela atualizará para &quot;Conectado&quot; em instantes.</span>
                  </li>
                </ol>
                <div className="rounded-xl bg-slate-100 p-4 text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">🔒 Isolamento Multi-Tenant Garantido</div>
                  <p>
                    Esta instância ({instanceName}) é dedicada e opera com credenciais isoladas na VPS.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
