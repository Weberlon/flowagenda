'use client';

import { useState, useTransition } from 'react';
import { 
  updateMensagemBoasVindasAction, 
  updateWhatsAppNotificacaoAction,
  updateGoogleReviewUrlAction,
  refreshWhatsAppStatusAction,
  restartWhatsAppAction,
  disconnectWhatsAppAction 
} from '@/app/actions/configuracoes';
import { MensagensWhatsAppForm } from './mensagens-form';
import { AiOnboardingWizard } from './ai-onboarding-wizard';
import { getNicheDictionary } from '@/lib/niche-dictionary';

interface ConfiguracoesClientProps {
  lojista: {
    id: string;
    nome_estabelecimento: string;
    slug_subdominio: string;
    dominio_proprio: string | null;
    whatsapp_notificacao: string | null;
    tier: string;
    cor_primaria: string | null;
    google_review_url?: string | null;
    ticket_medio_padrao?: number;
    modo_avaliacao?: 'automatico' | 'manual' | 'desativado';
    is_founder?: boolean;
    ai_credits?: number;
    use_ai_agent?: boolean;
    knowledge_base?: string | null;
    business_niche?: string;
    configuracoes?: Record<string, any> | null;
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
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    lojista.google_review_url || ''
  );
  const [googleFeedback, setGoogleFeedback] = useState<string | null>(null);
  const [isPendingGoogle, startTransitionGoogle] = useTransition();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [msgFeedback, setMsgFeedback] = useState<string | null>(null);
  const [zapFeedback, setZapFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [isPendingMsg, startTransitionMsg] = useTransition();
  const [isPendingZap, startTransitionZap] = useTransition();
  const [isPendingRestart, startTransitionRestart] = useTransition();
  const [isPendingDisconnect, startTransitionDisconnect] = useTransition();

  const dict = getNicheDictionary(lojista.business_niche);
  const isPsicologia = dict.features.hasProntuarioPsico;

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
      const res = await refreshWhatsAppStatusAction(lojista.id);
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
      const res = await updateMensagemBoasVindasAction(mensagem, lojista.id);
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
      const res = await updateWhatsAppNotificacaoAction(whatsappNotificacao, lojista.id);
      if (res.success) {
        setZapFeedback('WhatsApp de notificações atualizado!');
      } else {
        setZapFeedback(res.error || 'Erro ao atualizar telefone.');
      }
      setTimeout(() => setZapFeedback(null), 4000);
    });
  };

  const handleSalvarGoogleReview = () => {
    setGoogleFeedback(null);
    startTransitionGoogle(async () => {
      const res = await updateGoogleReviewUrlAction(googleReviewUrl, lojista.id);
      if (res.success) {
        setGoogleFeedback('Link do Google Meu Negócio atualizado!');
      } else {
        setGoogleFeedback(res.error || 'Erro ao atualizar link.');
      }
      setTimeout(() => setGoogleFeedback(null), 4000);
    });
  };

  const handleRestart = () => {
    startTransitionRestart(async () => {
      setStatusFeedback('Reiniciando instância...');
      const res = await restartWhatsAppAction(lojista.id);
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
      const res = await disconnectWhatsAppAction(lojista.id);
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
    <div className="space-y-8 pb-12 text-[#ECEFF4]">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#ECEFF4]">
          Configurações do Estabelecimento
        </h1>
        <p className="mt-1 text-sm text-[#D8DEE9]/80">
          Gerencie a integração do robô de WhatsApp, links de agendamento e automações de atendimento.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna 1 & 2: WhatsApp, Onboarding IA & Mensagens */}
        <div className="space-y-8 lg:col-span-2">

          {/* Assistente de Configuração / Setup Wizard do Agente IA */}
          <AiOnboardingWizard
            lojistaId={lojista.id}
            nomeEstabelecimento={lojista.nome_estabelecimento}
            initialBusinessNiche={lojista.business_niche}
            initialUseAiAgent={lojista.use_ai_agent}
            initialKnowledgeBase={lojista.knowledge_base}
            initialAiCredits={lojista.ai_credits}
            initialOnboardingConfig={(lojista.configuracoes as any)?.ai_onboarding}
          />
          
          {/* Card WhatsApp Connection */}
          <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-[#3B4252] gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-[#ECEFF4]">Robô WhatsApp (Evolution API)</h2>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#A3BE8C]/15 px-2.5 py-1 text-xs font-semibold text-[#A3BE8C] border border-[#A3BE8C]/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#A3BE8C] animate-pulse" />
                      Conectado
                    </span>
                  ) : isConnecting ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#88C0D0]/15 px-2.5 py-1 text-xs font-semibold text-[#88C0D0] border border-[#88C0D0]/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#88C0D0] animate-ping" />
                      Conectando...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EBCB8B]/15 px-2.5 py-1 text-xs font-semibold text-[#EBCB8B] border border-[#EBCB8B]/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#EBCB8B]" />
                      Aguardando Pareamento
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#D8DEE9]/70 mt-1 font-mono">
                  Instância: {configRobo?.instance_name || 'Não inicializada'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center rounded-xl border border-[#4C566A] bg-[#242933] px-3.5 py-2 text-xs font-semibold text-[#ECEFF4] hover:bg-[#3B4252] disabled:opacity-50 transition-colors shadow-sm"
                  title="Atualizar Status"
                >
                  <svg className={`h-4 w-4 mr-1.5 text-[#88C0D0] ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isRefreshing ? 'Verificando...' : 'Sincronizar'}
                </button>
              </div>
            </div>

            {statusFeedback && (
              <div className="mt-4 rounded-xl bg-[#242933] p-3 text-xs font-medium text-[#ECEFF4] border border-[#4C566A]">
                {statusFeedback}
              </div>
            )}

            {/* Conteúdo do Estado */}
            <div className="pt-6">
              {isConnected ? (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl bg-[#A3BE8C]/10 border border-[#A3BE8C]/30 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C]">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#ECEFF4]">Robô Ativo e Operando 24/7</h3>
                      <p className="text-xs text-[#D8DEE9]/80 mt-1 max-w-md">
                        O número do seu estabelecimento está conectado. O robô responderá clientes com o link da agenda e disparará os códigos PIN de confirmação em tempo real.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleRestart}
                      disabled={isPendingRestart}
                      className="rounded-xl border border-[#A3BE8C]/40 bg-[#242933] px-3.5 py-2 text-xs font-semibold text-[#A3BE8C] hover:bg-[#3B4252] transition-colors"
                    >
                      {isPendingRestart ? 'Reiniciando...' : 'Reiniciar Conexão'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={isPendingDisconnect}
                      className="rounded-xl border border-[#BF616A]/40 bg-[#242933] px-3.5 py-2 text-xs font-semibold text-[#BF616A] hover:bg-[#3B4252] transition-colors"
                    >
                      {isPendingDisconnect ? 'Desconectando...' : 'Desconectar WhatsApp'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#4C566A] rounded-2xl bg-[#242933]/60 text-center">
                    {whatsappStatus?.qrcode ? (
                      <div className="relative p-2.5 bg-white rounded-xl shadow-md border border-[#4C566A]">
                        <img
                          src={whatsappStatus.qrcode}
                          alt="QR Code de Conexão WhatsApp"
                          className="h-56 w-56 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-56 w-56 bg-[#242933] rounded-xl text-[#D8DEE9]/50 border border-[#3B4252]">
                        <svg className="h-12 w-12 animate-pulse text-[#88C0D0] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        className="rounded-xl bg-[#88C0D0] px-4 py-2 text-xs font-bold text-[#242933] hover:bg-[#88C0D0]/90 transition-colors shadow-sm"
                      >
                        {isRefreshing ? 'Atualizando...' : 'Novo QR Code'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRestart}
                        disabled={isPendingRestart}
                        className="rounded-xl border border-[#4C566A] bg-[#2E3440] px-3.5 py-2 text-xs font-semibold text-[#ECEFF4] hover:bg-[#3B4252] transition-colors"
                      >
                        {isPendingRestart ? 'Reiniciando...' : 'Reiniciar Instância'}
                      </button>
                    </div>
                  </div>

                  {/* Instruções de Conexão */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#ECEFF4]">Como conectar o seu WhatsApp:</h3>
                    <ol className="space-y-3 text-xs text-[#D8DEE9]/80">
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#88C0D0] text-[10px] font-bold text-[#242933]">1</span>
                        <span>Abra o aplicativo do <strong>WhatsApp</strong> no seu celular.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#88C0D0] text-[10px] font-bold text-[#242933]">2</span>
                        <span>Toque em <strong>Configurações</strong> (iOS) ou <strong>Mais opções</strong> (Android, três pontinhos).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#88C0D0] text-[10px] font-bold text-[#242933]">3</span>
                        <span>Selecione <strong>Aparelhos Conectados</strong> e toque em <strong>Conectar um aparelho</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#88C0D0] text-[10px] font-bold text-[#242933]">4</span>
                        <span>Aponte a câmera para o <strong>QR Code</strong> ao lado. A tela atualizará em alguns segundos.</span>
                      </li>
                    </ol>
                    <div className="rounded-xl bg-[#242933] p-3 text-xs text-[#D8DEE9]/70 border border-[#3B4252]">
                      🔒 <strong>Segurança e Isolamento:</strong> Sua conexão é operada em instância dedicada e isolada na VPS via Evolution API v2. Nenhuma outra loja tem acesso aos seus dados.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Mensagem de Boas-Vindas */}
          <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#ECEFF4]">Mensagem Automática de Atendimento</h2>
              <p className="text-xs text-[#D8DEE9]/70 mt-1">
                Essa é a mensagem disparada automaticamente quando um cliente entra em contato no WhatsApp do estabelecimento.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#D8DEE9]">Texto da Mensagem</label>
              <textarea
                rows={4}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Digite a mensagem que o robô enviará..."
                className="w-full rounded-xl border border-[#4C566A] bg-[#242933] p-3 text-sm text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none focus:ring-1 focus:ring-[#88C0D0] font-sans"
              />
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-[#D8DEE9]/60 font-medium">Inserir tags:</span>
                <button
                  type="button"
                  onClick={() => insertVariable('{nome_estabelecimento}')}
                  className="rounded-lg border border-[#4C566A] bg-[#242933] px-2.5 py-1 text-[11px] font-mono text-[#88C0D0] hover:bg-[#3B4252] transition-colors"
                >
                  {'{nome_estabelecimento}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{link_agendamento}')}
                  className="rounded-lg border border-[#4C566A] bg-[#242933] px-2.5 py-1 text-[11px] font-mono text-[#88C0D0] hover:bg-[#3B4252] transition-colors"
                >
                  {'{link_agendamento}'}
                </button>
              </div>
            </div>

            {/* Preview do WhatsApp */}
            <div className="rounded-2xl border border-[#3B4252] bg-[#242933] p-4 space-y-2">
              <div className="text-[11px] font-semibold text-[#88C0D0] uppercase tracking-wider">
                Pré-visualização da conversa
              </div>
              <div className="max-w-md rounded-2xl bg-[#2E3440] p-3 text-xs text-[#ECEFF4] shadow-sm border border-[#4C566A] whitespace-pre-wrap leading-relaxed">
                {mensagemPreview}
                <div className="text-right text-[10px] text-[#D8DEE9]/50 mt-1">10:00 • Robô FlowAgenda ✓✓</div>
              </div>
            </div>

            {msgFeedback && (
              <div className={`rounded-xl p-3 text-xs font-medium ${msgFeedback.includes('sucesso') ? 'bg-[#A3BE8C]/15 text-[#A3BE8C] border border-[#A3BE8C]/30' : 'bg-[#BF616A]/15 text-[#BF616A] border border-[#BF616A]/30'}`}>
                {msgFeedback}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSalvarMensagem}
                disabled={isPendingMsg}
                className="rounded-xl bg-[#88C0D0] px-5 py-2.5 text-xs font-bold text-[#242933] hover:bg-[#88C0D0]/90 transition-colors disabled:opacity-50 shadow-md"
              >
                {isPendingMsg ? 'Salvando...' : 'Salvar Mensagem'}
              </button>
            </div>
          </div>

          {/* Card Templates Customizados de WhatsApp (Confirmação & Lembrete) */}
          <MensagensWhatsAppForm
            lojistaId={lojista.id}
            nomeEstabelecimento={lojista.nome_estabelecimento}
            initialConfirmacao={(lojista.configuracoes as any)?.notificacoes?.whatsapp?.template_confirmacao}
            initialLembrete={(lojista.configuracoes as any)?.notificacoes?.whatsapp?.template_lembrete}
          />
        </div>

        {/* Coluna 3: Alertas Internos & Links */}
        <div className="space-y-8">
          
          {/* Card Link de Agendamento do Tenant */}
          <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#ECEFF4]">Seu Link de Agendamentos</h3>
            <p className="text-xs text-[#D8DEE9]/70">
              Divulgue este link no Instagram, bio das redes e envie diretamente para seus clientes.
            </p>

            <div className="rounded-xl border border-[#3B4252] bg-[#242933] p-3 space-y-2">
              <span className="block text-xs font-mono font-medium text-[#88C0D0] truncate">
                {linkAgendamento}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full rounded-xl bg-[#3B4252] border border-[#4C566A] py-2 text-xs font-bold text-[#ECEFF4] hover:bg-[#434C5E] transition-colors shadow-xs"
              >
                {copiedLink ? '✓ Link Copiado!' : 'Copiar Link Público'}
              </button>
            </div>

            <div className="text-xs text-[#D8DEE9]/70 space-y-1 pt-1 font-mono">
              <p>Subdomínio: <span className="text-[#88C0D0]">{lojista.slug_subdominio}.flowagenda.online</span></p>
              {lojista.dominio_proprio ? (
                <p>Domínio Próprio: <span className="text-[#A3BE8C]">{lojista.dominio_proprio}</span></p>
              ) : (
                <p className="text-[#D8DEE9]/50">Domínio Próprio: Disponível no Tier 3</p>
              )}
            </div>
          </div>

          {/* Card WhatsApp de Notificação do Lojista */}
          <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#ECEFF4]">WhatsApp para Notificações</h3>
              <p className="text-xs text-[#D8DEE9]/70 mt-1">
                Número do responsável que recebe avisos de clientes que solicitam atendimento humano e alertas operacionais.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#D8DEE9]">Número com DDD</label>
              <input
                type="text"
                value={whatsappNotificacao}
                onChange={(e) => setWhatsappNotificacao(e.target.value)}
                placeholder="Ex: 11999998888"
                className="w-full rounded-xl border border-[#4C566A] bg-[#242933] p-2.5 text-sm text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none focus:ring-1 focus:ring-[#88C0D0]"
              />
              <span className="text-[11px] text-[#D8DEE9]/60 block">
                Insira o DDD e o número completo (apenas números).
              </span>
            </div>

            {zapFeedback && (
              <div className={`rounded-xl p-2.5 text-xs font-medium ${zapFeedback.includes('atualizado') ? 'bg-[#A3BE8C]/15 text-[#A3BE8C] border border-[#A3BE8C]/30' : 'bg-[#BF616A]/15 text-[#BF616A] border border-[#BF616A]/30'}`}>
                {zapFeedback}
              </div>
            )}

            <button
              type="button"
              onClick={handleSalvarWhatsApp}
              disabled={isPendingZap}
              className="w-full rounded-xl bg-[#88C0D0] py-2.5 text-xs font-bold text-[#242933] hover:bg-[#88C0D0]/90 transition-colors disabled:opacity-50 shadow-md"
            >
              {isPendingZap ? 'Salvando...' : 'Salvar Telefone'}
            </button>
          </div>

          {/* Card Google Meu Negócio & Avaliações 5 Estrelas */}
          <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#ECEFF4]">Google Meu Negócio</h3>
              {googleReviewUrl ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#A3BE8C]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#A3BE8C] border border-[#A3BE8C]/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#A3BE8C]" />
                  Otimizado SwaS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EBCB8B]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#EBCB8B] border border-[#EBCB8B]/30">
                  Pendente
                </span>
              )}
            </div>

            <p className="text-xs text-[#D8DEE9]/70">
              Envie este link pelo WhatsApp após o atendimento para convidar seus clientes a avaliarem no Google Meu Negócio.
            </p>

            {isPsicologia && (
              <div className="rounded-xl border border-[#EBCB8B]/40 bg-[#3B4252] p-3 text-xs text-[#EBCB8B] leading-relaxed">
                <strong>Diretriz Ética (CRP / LGPD):</strong> Para o nicho de Psicologia / Terapia, os pedidos públicos de avaliação no Google ficam desabilitados por padrão para preservar o sigilo profissional dos pacientes.
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#D8DEE9]">
                Link de Avaliação no Google Meu Negócio
              </label>
              <input
                type="url"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/.../review"
                className="w-full rounded-xl border border-[#4C566A] bg-[#242933] p-2.5 text-xs font-mono text-[#ECEFF4] placeholder:text-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none focus:ring-1 focus:ring-[#88C0D0]"
              />
            </div>

            {googleReviewUrl && (
              <div className="rounded-xl bg-[#242933] border border-[#EBCB8B]/30 p-3 text-[11px] text-[#EBCB8B] space-y-1">
                <span className="font-semibold block">⭐ Prévia da Mensagem Automática:</span>
                <p className="italic text-[#D8DEE9]/80">
                  &ldquo;Olá! Muito obrigado pela visita ao {lojista.nome_estabelecimento} hoje! Poderia nos avaliar com 5 estrelas no Google? Leva menos de 30s: {googleReviewUrl}&rdquo;
                </p>
              </div>
            )}

            {googleFeedback && (
              <div className={`rounded-xl p-2.5 text-xs font-medium ${googleFeedback.includes('atualizado') ? 'bg-[#A3BE8C]/15 text-[#A3BE8C] border border-[#A3BE8C]/30' : 'bg-[#BF616A]/15 text-[#BF616A] border border-[#BF616A]/30'}`}>
                {googleFeedback}
              </div>
            )}

            <button
              type="button"
              onClick={handleSalvarGoogleReview}
              disabled={isPendingGoogle}
              className="w-full rounded-xl bg-[#88C0D0] py-2.5 text-xs font-bold text-[#242933] hover:bg-[#88C0D0]/90 transition-colors disabled:opacity-50 shadow-md"
            >
              {isPendingGoogle ? 'Salvando...' : 'Salvar Link do Google'}
            </button>
          </div>

          {/* Card Resumo do Plano */}
          <div className="rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-[#ECEFF4]">Plano Atual</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#D8DEE9]">Assinatura</span>
              <span className="rounded-full bg-[#88C0D0]/15 border border-[#88C0D0]/30 px-2.5 py-0.5 text-xs font-bold text-[#88C0D0] uppercase tracking-wide">
                {lojista.tier.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-[#D8DEE9]/70">
              Para upgrades de plano ou alteração de domínio próprio, contate o suporte no painel do administrador.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
