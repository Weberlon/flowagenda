'use client';

import { useState, useTransition } from 'react';
import { 
  updateMensagemBoasVindasAction, 
  updateWhatsAppNotificacaoAction,
  refreshWhatsAppStatusAction,
  restartWhatsAppAction,
  disconnectWhatsAppAction 
} from '@/app/actions/configuracoes';

interface ConfiguracoesClientProps {
  lojista: {
    id: string;
    nome_estabelecimento: string;
    slug_subdominio: string;
    dominio_proprio: string | null;
    whatsapp_notificacao: string | null;
    tier: string;
    cor_primaria: string | null;
  };
  configRobo: {
    instance_name: string;
    mensagem_boas_vindas: string | null;
    status_conexao: string;
  } | null;
  initialWhatsappStatus: {
    instanceName: string;
    state: string;
    qrcode?: string | null;
  } | null;
}

export function ConfiguracoesClient({
  lojista,
  configRobo,
  initialWhatsappStatus,
}: ConfiguracoesClientProps) {
  const [whatsappStatus, setWhatsappStatus] = useState(initialWhatsappStatus);
  const [mensagem, setMensagem] = useState(
    configRobo?.mensagem_boas_vindas ||
    'Oi, tudo bem? Que bom ter você por aqui! 🤖 Sou o robô de agendamento do(a) {nome_estabelecimento}. Para marcar seu horário rapidinho sem precisar esperar, acesse: {link_agendamento}'
  );
  const [whatsappNotificacao, setWhatsappNotificacao] = useState(
    lojista.whatsapp_notificacao || ''
  );
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [msgFeedback, setMsgFeedback] = useState<string | null>(null);
  const [zapFeedback, setZapFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [isPendingMsg, startTransitionMsg] = useTransition();
  const [isPendingZap, startTransitionZap] = useTransition();
  const [isPendingRestart, startTransitionRestart] = useTransition();
  const [isPendingDisconnect, startTransitionDisconnect] = useTransition();

  const isConnected = whatsappStatus?.state === 'open';
  const isConnecting = whatsappStatus?.state === 'connecting';

  const linkAgendamento = lojista.dominio_proprio 
    ? `https://${lojista.dominio_proprio}`
    : `https://${lojista.slug_subdominio}.flowagenda.online`;

  const mensagemPreview = mensagem
    .replace('{nome_estabelecimento}', lojista.nome_estabelecimento)
    .replace('{link_agendamento}', linkAgendamento);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    setStatusFeedback(null);
    try {
      const res = await refreshWhatsAppStatusAction();
      if (res.success && res.status) {
        setWhatsappStatus(res.status);
        setStatusFeedback('Status sincronizado!');
      } else {
        setStatusFeedback(res.error || 'Erro ao sincronizar');
      }
    } catch {
      setStatusFeedback('Falha de conexão com a API.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setStatusFeedback(null), 3000);
    }
  };

  const handleSalvarMensagem = () => {
    setMsgFeedback(null);
    startTransitionMsg(async () => {
      const res = await updateMensagemBoasVindasAction(mensagem);
      if (res.success) {
        setMsgFeedback('Mensagem de boas-vindas salva com sucesso!');
      } else {
        setMsgFeedback(res.error || 'Erro ao salvar mensagem.');
      }
      setTimeout(() => setMsgFeedback(null), 4000);
    });
  };

  const handleSalvarWhatsApp = () => {
    setZapFeedback(null);
    startTransitionZap(async () => {
      const res = await updateWhatsAppNotificacaoAction(whatsappNotificacao);
      if (res.success) {
        setZapFeedback('WhatsApp de notificações atualizado!');
      } else {
        setZapFeedback(res.error || 'Erro ao atualizar telefone.');
      }
      setTimeout(() => setZapFeedback(null), 4000);
    });
  };

  const handleRestart = () => {
    startTransitionRestart(async () => {
      setStatusFeedback('Reiniciando instância...');
      const res = await restartWhatsAppAction();
      if (res.success) {
        setStatusFeedback('Instância reiniciada. Atualizando QR Code...');
        await handleRefreshStatus();
      } else {
        setStatusFeedback(res.error || 'Erro ao reiniciar.');
      }
      setTimeout(() => setStatusFeedback(null), 4000);
    });
  };

  const handleDisconnect = () => {
    if (!confirm('Deseja realmente desconectar o robô de WhatsApp?')) return;
    startTransitionDisconnect(async () => {
      setStatusFeedback('Desconectando...');
      const res = await disconnectWhatsAppAction();
      if (res.success) {
        setStatusFeedback('Instância desconectada.');
        await handleRefreshStatus();
      } else {
        setStatusFeedback(res.error || 'Erro ao desconectar.');
      }
      setTimeout(() => setStatusFeedback(null), 4000);
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkAgendamento);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const insertVariable = (varName: string) => {
    setMensagem((prev) => `${prev} ${varName}`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Configurações do Estabelecimento
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie a integração do robô de WhatsApp, links de agendamento e automações de atendimento.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna 1 & 2: WhatsApp & Mensagens */}
        <div className="space-y-8 lg:col-span-2">
          
          {/* Card WhatsApp Connection */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900">Robô WhatsApp (Evolution API)</h2>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Conectado
                    </span>
                  ) : isConnecting ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                      Conectando...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Aguardando Pareamento
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Instância: {configRobo?.instance_name || 'Não inicializada'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
                  title="Atualizar Status"
                >
                  <svg className={`h-4 w-4 mr-1.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isRefreshing ? 'Verificando...' : 'Sincronizar'}
                </button>
              </div>
            </div>

            {statusFeedback && (
              <div className="mt-4 rounded-lg bg-slate-100 p-3 text-xs font-medium text-slate-800 border border-slate-200">
                {statusFeedback}
              </div>
            )}

            {/* Conteúdo do Estado */}
            <div className="pt-6">
              {isConnected ? (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-xl bg-emerald-50/50 border border-emerald-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-900">Robô Ativo e Operando</h3>
                      <p className="text-xs text-emerald-700 mt-1 max-w-md">
                        O número do seu estabelecimento está conectado. O robô responderá clientes com o link da agenda e disparará os códigos PIN de confirmação em tempo real.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleRestart}
                      disabled={isPendingRestart}
                      className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
                    >
                      {isPendingRestart ? 'Reiniciando...' : 'Reiniciar Conexão'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={isPendingDisconnect}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      {isPendingDisconnect ? 'Desconectando...' : 'Desconectar WhatsApp'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/60 text-center">
                    {whatsappStatus?.qrcode ? (
                      <div className="relative p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                        <img
                          src={whatsappStatus.qrcode}
                          alt="QR Code de Conexão WhatsApp"
                          className="h-56 w-56 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-56 w-56 bg-slate-100 rounded-lg text-slate-400">
                        <svg className="h-12 w-12 animate-pulse text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span className="text-xs">Gerando QR Code...</span>
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRefreshStatus}
                        disabled={isRefreshing}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        {isRefreshing ? 'Atualizando...' : 'Novo QR Code'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRestart}
                        disabled={isPendingRestart}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        {isPendingRestart ? 'Reiniciando...' : 'Reiniciar Instância'}
                      </button>
                    </div>
                  </div>

                  {/* Instruções de Conexão */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">Como conectar o seu WhatsApp:</h3>
                    <ol className="space-y-3 text-xs text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">1</span>
                        <span>Abra o aplicativo do <strong>WhatsApp</strong> no seu celular.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">2</span>
                        <span>Toque em <strong>Configurações</strong> (iOS) ou <strong>Mais opções</strong> (Android, três pontinhos).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">3</span>
                        <span>Selecione <strong>Aparelhos Conectados</strong> e toque em <strong>Conectar um aparelho</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">4</span>
                        <span>Aponte a câmera para o <strong>QR Code</strong> ao lado. A tela atualizará em alguns segundos.</span>
                      </li>
                    </ol>
                    <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
                      🔒 <strong>Segurança e Isolamento:</strong> Sua conexão é operada em instância dedicada e isolada na VPS. Nenhuma outra loja tem acesso aos seus dados.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Mensagem de Boas-Vindas */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mensagem Automática de Atendimento</h2>
              <p className="text-xs text-slate-500 mt-1">
                Essa é a mensagem disparada automaticamente quando um cliente entra em contato no WhatsApp do estabelecimento.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Texto da Mensagem</label>
              <textarea
                rows={4}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Digite a mensagem que o robô enviará..."
                className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
              />
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-medium">Inserir tags:</span>
                <button
                  type="button"
                  onClick={() => insertVariable('{nome_estabelecimento}')}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {'{nome_estabelecimento}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{link_agendamento}')}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {'{link_agendamento}'}
                </button>
              </div>
            </div>

            {/* Preview do WhatsApp */}
            <div className="rounded-xl border border-slate-200 bg-[#E5DDD5] dark:bg-[#0B141A] p-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Pré-visualização da conversa
              </div>
              <div className="max-w-md rounded-lg bg-white dark:bg-[#202C33] p-3 text-xs text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700 whitespace-pre-wrap leading-relaxed">
                {mensagemPreview}
                <div className="text-right text-[10px] text-slate-400 mt-1">10:00 • Robô FlowAgenda ✓✓</div>
              </div>
            </div>

            {msgFeedback && (
              <div className={`rounded-lg p-3 text-xs font-medium ${msgFeedback.includes('sucesso') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {msgFeedback}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSalvarMensagem}
                disabled={isPendingMsg}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isPendingMsg ? 'Salvando...' : 'Salvar Mensagem'}
              </button>
            </div>
          </div>
        </div>

        {/* Coluna 3: Alertas Internos & Links */}
        <div className="space-y-8">
          
          {/* Card Link de Agendamento do Tenant */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Seu Link de Agendamentos</h3>
            <p className="text-xs text-slate-500">
              Divulgue este link no Instagram, bio das redes e envie diretamente para seus clientes.
            </p>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <span className="block text-xs font-mono font-medium text-slate-800 truncate">
                {linkAgendamento}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full rounded-md bg-white border border-slate-300 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                {copiedLink ? '✓ Link Copiado!' : 'Copiar Link Público'}
              </button>
            </div>

            <div className="text-xs text-slate-500 space-y-1 pt-1">
              <p><strong>Subdomínio:</strong> {lojista.slug_subdominio}.flowagenda.online</p>
              {lojista.dominio_proprio ? (
                <p><strong>Domínio Próprio:</strong> {lojista.dominio_proprio}</p>
              ) : (
                <p className="text-slate-400">Domínio Próprio: Disponível no Tier 3</p>
              )}
            </div>
          </div>

          {/* Card WhatsApp de Notificação do Lojista */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">WhatsApp para Notificações</h3>
              <p className="text-xs text-slate-500 mt-1">
                Número do responsável que recebe avisos de clientes que solicitam atendimento humano e alertas operacionais.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Número com DDD</label>
              <input
                type="text"
                value={whatsappNotificacao}
                onChange={(e) => setWhatsappNotificacao(e.target.value)}
                placeholder="Ex: 11999998888"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <span className="text-[11px] text-slate-400 block">
                Insira o DDD e o número completo (apenas números).
              </span>
            </div>

            {zapFeedback && (
              <div className={`rounded-lg p-2.5 text-xs font-medium ${zapFeedback.includes('atualizado') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {zapFeedback}
              </div>
            )}

            <button
              type="button"
              onClick={handleSalvarWhatsApp}
              disabled={isPendingZap}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isPendingZap ? 'Salvando...' : 'Salvar Telefone'}
            </button>
          </div>

          {/* Card Resumo do Plano */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Plano Atual</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Assinatura</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                {lojista.tier.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Para upgrades de plano ou alteração de domínio próprio, contate o suporte no painel do administrador.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
