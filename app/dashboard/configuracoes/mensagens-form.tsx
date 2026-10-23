'use client';

import { useState, useTransition, useRef } from 'react';
import { 
  TEMPLATE_PADRAO_CONFIRMACAO, 
  TEMPLATE_PADRAO_LEMBRETE,
  compilarMensagemWhatsApp
} from '@/lib/whatsapp/template-engine';
import { salvarTemplatesWhatsAppAction } from '@/app/actions/configuracoes-whatsapp';

interface MensagensFormProps {
  lojistaId: string;
  nomeEstabelecimento: string;
  initialConfirmacao?: string | null;
  initialLembrete?: string | null;
}

const TAGS_DISPONIVEIS = [
  { tag: '{cliente}', label: 'Nome do Cliente', icon: '👤' },
  { tag: '{data}', label: 'Data', icon: '📅' },
  { tag: '{horario}', label: 'Horário', icon: '⏰' },
  { tag: '{servico}', label: 'Serviço', icon: '✂️' },
  { tag: '{profissional}', label: 'Profissional', icon: '💈' },
  { tag: '{estabelecimento}', label: 'Nome da Loja', icon: '🏢' },
];

export function MensagensWhatsAppForm({
  lojistaId,
  nomeEstabelecimento,
  initialConfirmacao,
  initialLembrete,
}: MensagensFormProps) {
  const [templateConfirmacao, setTemplateConfirmacao] = useState(
    initialConfirmacao?.trim() || TEMPLATE_PADRAO_CONFIRMACAO
  );
  const [templateLembrete, setTemplateLembrete] = useState(
    initialLembrete?.trim() || TEMPLATE_PADRAO_LEMBRETE
  );

  const [activeTab, setActiveTab] = useState<'confirmacao' | 'lembrete'>('confirmacao');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const textareaRefConfirmacao = useRef<HTMLTextAreaElement>(null);
  const textareaRefLembrete = useRef<HTMLTextAreaElement>(null);

  // Inserção inteligente da tag na posição exata do cursor
  const handleInsertTag = (tag: string) => {
    const isConfirmacao = activeTab === 'confirmacao';
    const textarea = isConfirmacao ? textareaRefConfirmacao.current : textareaRefLembrete.current;

    if (!textarea) {
      if (isConfirmacao) {
        setTemplateConfirmacao((prev) => `${prev} ${tag}`);
      } else {
        setTemplateLembrete((prev) => `${prev} ${tag}`);
      }
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = isConfirmacao ? templateConfirmacao : templateLembrete;

    const newVal = currentVal.substring(0, start) + tag + currentVal.substring(end);

    if (isConfirmacao) {
      setTemplateConfirmacao(newVal);
    } else {
      setTemplateLembrete(newVal);
    }

    // Reposiciona o cursor logo após a tag inserida
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  const handleRestaurarPadrao = () => {
    if (activeTab === 'confirmacao') {
      setTemplateConfirmacao(TEMPLATE_PADRAO_CONFIRMACAO);
    } else {
      setTemplateLembrete(TEMPLATE_PADRAO_LEMBRETE);
    }
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await salvarTemplatesWhatsAppAction({
        explicitLojistaId: lojistaId,
        templateConfirmacao,
        templateLembrete,
      });

      if (res.success) {
        setFeedback({ tipo: 'sucesso', texto: res.message || 'Configurações salvas com sucesso!' });
      } else {
        setFeedback({ tipo: 'erro', texto: res.error || 'Falha ao salvar templates de mensagens.' });
      }

      setTimeout(() => setFeedback(null), 5000);
    });
  };

  // Preview dinâmico com simulação realística de dados
  const previewData = {
    cliente: 'Carlos Silva',
    data: '25/10/2026',
    horario: '14:30',
    servico: 'Corte Degradê & Barba',
    profissional: 'Lucas Santos',
    estabelecimento: nomeEstabelecimento || 'Barbearia Flow',
  };

  const textoPreview = compilarMensagemWhatsApp(
    activeTab === 'confirmacao' ? templateConfirmacao : templateLembrete,
    activeTab,
    previewData
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>💬</span> Templates de Mensagens no WhatsApp
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Personalize os textos automáticos enviados aos seus clientes com tags inteligentes.
          </p>
        </div>

        {/* Seletor de Tipo de Mensagem (Abas) */}
        <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('confirmacao')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'confirmacao'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🎉 Confirmação
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lembrete')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'lembrete'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⏰ Lembrete 2h
          </button>
        </div>
      </div>

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* Chips de Tags Dinâmicas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Clique para inserir tags no texto:
            </label>
            <button
              type="button"
              onClick={handleRestaurarPadrao}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              Restaurar Padrão Oficial
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TAGS_DISPONIVEIS.map((t) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => handleInsertTag(t.tag)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-mono font-medium text-slate-800 transition-colors shadow-2xs hover:border-slate-300"
                title={`Insere a variável ${t.tag} na posição do cursor`}
              >
                <span>{t.icon}</span>
                <span>{t.tag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Textareas controlados por aba */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            {activeTab === 'confirmacao'
              ? 'Mensagem de Confirmação (Disparada pós-reserva/PIN/Pix)'
              : 'Mensagem de Lembrete (Disparada 2h antes do atendimento)'}
          </label>

          {activeTab === 'confirmacao' ? (
            <textarea
              ref={textareaRefConfirmacao}
              rows={6}
              value={templateConfirmacao}
              onChange={(e) => setTemplateConfirmacao(e.target.value)}
              placeholder="Digite o template de confirmação..."
              className="w-full rounded-xl border border-slate-300 p-3.5 text-xs text-slate-900 font-sans focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 leading-relaxed shadow-xs"
            />
          ) : (
            <textarea
              ref={textareaRefLembrete}
              rows={6}
              value={templateLembrete}
              onChange={(e) => setTemplateLembrete(e.target.value)}
              placeholder="Digite o template de lembrete..."
              className="w-full rounded-xl border border-slate-300 p-3.5 text-xs text-slate-900 font-sans focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 leading-relaxed shadow-xs"
            />
          )}

          <p className="text-[11px] text-slate-500">
            Dica: Use <code>*texto*</code> para <strong>negrito</strong> no WhatsApp e quebras de linha normais para espaçar os parágrafos.
          </p>
        </div>

        {/* Pré-visualização Realista do WhatsApp */}
        <div className="rounded-2xl border border-slate-200 bg-[#E5DDD5] dark:bg-[#0B141A] p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <span>Pré-visualização no WhatsApp do Cliente</span>
            <span className="text-[10px] text-slate-500 lowercase">(dados simulados)</span>
          </div>

          <div className="max-w-md rounded-2xl bg-white dark:bg-[#202C33] p-4 text-xs text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700 whitespace-pre-wrap leading-relaxed">
            {textoPreview}
            <div className="text-right text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-end gap-1">
              <span>14:31</span>
              <span className="text-[#53bdeb]">✓✓</span>
            </div>
          </div>
        </div>

        {/* Feedback de Sucesso/Erro */}
        {feedback && (
          <div
            className={`rounded-xl p-3.5 text-xs font-semibold border ${
              feedback.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {feedback.tipo === 'sucesso' ? '✓ ' : '⚠️ '}
            {feedback.texto}
          </div>
        )}

        {/* Botão de Submissão */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isPending ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Salvando Templates...
              </>
            ) : (
              'Salvar Templates de Mensagens'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
