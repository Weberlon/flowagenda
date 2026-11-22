'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  AnamneseOdonto,
  DenteEstado,
  ExameClinicoItem,
  FichaHistoricoItem,
  ItemPlanoTratamento,
  StatusDenteFDI,
  StatusPlanoTratamento,
} from '@/types/niche';
import {
  X,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Check,
  History,
  FileText,
  Calculator,
  ShieldAlert,
  Calendar,
  Plus,
  Trash2,
  Paperclip,
} from 'lucide-react';

interface OdontogramaModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojistaId: string;
  clienteId: string;
  clienteNome: string;
  onSaved?: () => void;
}

type ModalTab = 'odontograma' | 'anamnese' | 'plano';

const STATUS_OPTIONS: {
  value: StatusDenteFDI;
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
}[] = [
  {
    value: 'higido',
    label: 'Hígido (Padrão)',
    color: '#ECEFF4',
    bgClass: 'bg-[#3B4252]',
    borderClass: 'border-[#4C566A]',
  },
  {
    value: 'tratamento',
    label: 'Em Tratamento',
    color: '#EBCB8B',
    bgClass: 'bg-[#EBCB8B]/20',
    borderClass: 'border-[#EBCB8B]',
  },
  {
    value: 'concluido',
    label: 'Concluído',
    color: '#A3BE8C',
    bgClass: 'bg-[#A3BE8C]/20',
    borderClass: 'border-[#A3BE8C]',
  },
  {
    value: 'atencao',
    label: 'Atenção / Cárie',
    color: '#BF616A',
    bgClass: 'bg-[#BF616A]/20',
    borderClass: 'border-[#BF616A]',
  },
  {
    value: 'ausente',
    label: 'Ausente',
    color: '#4C566A',
    bgClass: 'bg-[#2E3440]',
    borderClass: 'border-[#4C566A]',
  },
  {
    value: 'implante',
    label: 'Implante',
    color: '#88C0D0',
    bgClass: 'bg-[#88C0D0]/20',
    borderClass: 'border-[#88C0D0]',
  },
];

// Numeração FDI oficial dos 32 dentes permanentes
const QUADRANTE_SUP_DIR = [18, 17, 16, 15, 14, 13, 12, 11];
const QUADRANTE_SUP_ESQ = [21, 22, 23, 24, 25, 26, 27, 28];
const QUADRANTE_INF_DIR = [48, 47, 46, 45, 44, 43, 42, 41];
const QUADRANTE_INF_ESQ = [31, 32, 33, 34, 35, 36, 37, 38];

function getToothColors(status: StatusDenteFDI) {
  switch (status) {
    case 'tratamento':
      return { fill: 'rgba(235, 203, 139, 0.25)', stroke: '#EBCB8B', text: '#EBCB8B' };
    case 'concluido':
      return { fill: 'rgba(163, 190, 140, 0.25)', stroke: '#A3BE8C', text: '#A3BE8C' };
    case 'atencao':
      return { fill: 'rgba(191, 97, 106, 0.28)', stroke: '#BF616A', text: '#BF616A' };
    case 'ausente':
      return { fill: 'rgba(76, 86, 106, 0.15)', stroke: '#4C566A', text: '#4C566A' };
    case 'implante':
      return { fill: 'rgba(136, 192, 208, 0.25)', stroke: '#88C0D0', text: '#88C0D0' };
    case 'higido':
    default:
      return { fill: '#3B4252', stroke: '#4C566A', text: '#ECEFF4' };
  }
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ToothSvg({
  numero,
  estado,
  isSelected,
  isUpper,
  onClick,
}: {
  numero: number;
  estado?: DenteEstado;
  isSelected: boolean;
  isUpper: boolean;
  onClick: () => void;
}) {
  const status: StatusDenteFDI = estado?.status || 'higido';
  const colors = getToothColors(status);
  const hasObs = Boolean(estado?.observacao?.trim());

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all ${
        isSelected
          ? 'bg-[#88C0D0]/20 ring-2 ring-[#88C0D0]'
          : 'hover:bg-[#434C5E]/50'
      } ${status === 'ausente' ? 'opacity-55' : ''}`}
      title={`Dente ${numero} — ${STATUS_OPTIONS.find((s) => s.value === status)?.label}`}
    >
      {!isUpper && (
        <span className="text-[10px] font-mono font-bold" style={{ color: colors.text }}>
          {numero}
        </span>
      )}

      <div className="relative">
        <svg
          viewBox="0 0 36 44"
          className="w-7 h-9 sm:w-8 sm:h-10 transition-transform group-hover:scale-105"
        >
          {isUpper ? (
            <path
              d="M11 18 C11 6, 15 3, 18 10 C21 3, 25 6, 25 18 L28 28 C29 36, 24 41, 18 40 C12 41, 7 36, 8 28 Z"
              fill={colors.fill}
              stroke={isSelected ? '#88C0D0' : colors.stroke}
              strokeWidth={isSelected ? 2.2 : 1.6}
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M8 16 C7 8, 12 3, 18 4 C24 3, 29 8, 28 16 L25 26 C25 38, 21 41, 18 34 C15 41, 11 38, 11 26 Z"
              fill={colors.fill}
              stroke={isSelected ? '#88C0D0' : colors.stroke}
              strokeWidth={isSelected ? 2.2 : 1.6}
              strokeLinejoin="round"
            />
          )}

          {status === 'ausente' && (
            <g stroke="#BF616A" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="8" x2="28" y2="36" />
              <line x1="28" y1="8" x2="8" y2="36" />
            </g>
          )}

          {status === 'implante' && (
            <g stroke="#88C0D0" strokeWidth="1.6" strokeLinecap="round">
              <line x1="18" y1={isUpper ? '8' : '22'} x2="18" y2={isUpper ? '22' : '36'} />
              <line x1="14" y1={isUpper ? '12' : '26'} x2="22" y2={isUpper ? '12' : '26'} />
              <line x1="14" y1={isUpper ? '16' : '30'} x2="22" y2={isUpper ? '16' : '30'} />
            </g>
          )}
        </svg>

        {hasObs && (
          <span
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#88C0D0] ring-2 ring-[#2E3440]"
            title="Possui observação"
          />
        )}
      </div>

      {isUpper && (
        <span className="text-[10px] font-mono font-bold" style={{ color: colors.text }}>
          {numero}
        </span>
      )}
    </button>
  );
}

export function OdontogramaModal({
  isOpen,
  onClose,
  lojistaId,
  clienteId,
  clienteNome,
  onSaved,
}: OdontogramaModalProps) {
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<ModalTab>('odontograma');

  // Dados da Ficha
  const [dentes, setDentes] = useState<Record<string, DenteEstado>>({});
  const [historico, setHistorico] = useState<FichaHistoricoItem[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Anamnese, Retorno e Exames
  const [anamnese, setAnamnese] = useState<AnamneseOdonto>({
    alergias: '',
    condicoesMedicas: '',
    medicacoesEmUso: '',
    alertaCritico: false,
  });
  const [retornoPrevisto, setRetornoPrevisto] = useState('');
  const [exames, setExames] = useState<ExameClinicoItem[]>([]);
  const [novoExameTitulo, setNovoExameTitulo] = useState('');
  const [novoExameLink, setNovoExameLink] = useState('');
  const [novoExameData, setNovoExameData] = useState(() => new Date().toISOString().split('T')[0]);

  // Plano / Orçamento
  const [planoTratamento, setPlanoTratamento] = useState<ItemPlanoTratamento[]>([]);
  const [novoItemRegiao, setNovoItemRegiao] = useState('');
  const [novoItemProc, setNovoItemProc] = useState('');
  const [novoItemValor, setNovoItemValor] = useState('');
  const [novoItemStatus, setNovoItemStatus] = useState<StatusPlanoTratamento>('orcado');

  // Estado de UI do Odontograma
  const [activeStatus, setActiveStatus] = useState<StatusDenteFDI>('tratamento');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadFicha = useCallback(async () => {
    if (!lojistaId || !clienteId) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('fichas_clinicas')
        .select('*')
        .eq('lojista_id', lojistaId)
        .eq('cliente_id', clienteId)
        .eq('tipo_ficha', 'odontograma')
        .maybeSingle();

      if (error) {
        setErrorMessage(`Erro ao carregar odontograma: ${error.message}`);
        return;
      }

      if (data) {
        const dadosJson = (data.dados_json || {}) as {
          dentes?: Record<string, DenteEstado>;
          historico?: FichaHistoricoItem[];
          anamnese?: AnamneseOdonto;
          planoTratamento?: ItemPlanoTratamento[];
          retornoPrevisto?: string;
          exames?: ExameClinicoItem[];
        };
        setDentes(dadosJson.dentes || {});
        setHistorico(Array.isArray(dadosJson.historico) ? dadosJson.historico : []);
        setAnamnese({
          alergias: dadosJson.anamnese?.alergias || '',
          condicoesMedicas: dadosJson.anamnese?.condicoesMedicas || '',
          medicacoesEmUso: dadosJson.anamnese?.medicacoesEmUso || '',
          alertaCritico: Boolean(dadosJson.anamnese?.alertaCritico),
        });
        setPlanoTratamento(Array.isArray(dadosJson.planoTratamento) ? dadosJson.planoTratamento : []);
        setRetornoPrevisto(dadosJson.retornoPrevisto || '');
        setExames(Array.isArray(dadosJson.exames) ? dadosJson.exames : []);
        setObservacoesGerais(data.observacoes_gerais || '');
      } else {
        setDentes({});
        setHistorico([]);
        setAnamnese({ alergias: '', condicoesMedicas: '', medicacoesEmUso: '', alertaCritico: false });
        setPlanoTratamento([]);
        setRetornoPrevisto('');
        setExames([]);
        setObservacoesGerais('');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao buscar ficha clínica.');
    } finally {
      setLoading(false);
    }
  }, [supabase, lojistaId, clienteId]);

  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      setSelectedTooth(null);
      setActiveTab('odontograma');
      loadFicha();
    }
  }, [isOpen, loadFicha]);

  const handleToothClick = (numero: number) => {
    setSelectedTooth(numero);
  };

  const handleApplyStatusToSelected = () => {
    if (selectedTooth === null) return;
    const key = String(selectedTooth);
    setDentes((prev) => ({
      ...prev,
      [key]: {
        numero: selectedTooth,
        status: activeStatus,
        observacao: prev[key]?.observacao || '',
        atualizado_em: new Date().toISOString(),
      },
    }));
  };

  const handleToothObservacaoChange = (obs: string) => {
    if (selectedTooth === null) return;
    const key = String(selectedTooth);
    setDentes((prev) => ({
      ...prev,
      [key]: {
        numero: selectedTooth,
        status: prev[key]?.status || 'higido',
        observacao: obs,
        atualizado_em: new Date().toISOString(),
      },
    }));
  };

  const handleSetRetorno6Meses = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setRetornoPrevisto(d.toISOString().split('T')[0]);
  };

  const handleAddExame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoExameTitulo.trim()) return;
    const item: ExameClinicoItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      titulo: novoExameTitulo.trim(),
      linkOuLocal: novoExameLink.trim() || 'Arquivo local / impresso',
      dataExame: novoExameData || new Date().toISOString().split('T')[0],
    };
    setExames((prev) => [item, ...prev]);
    setNovoExameTitulo('');
    setNovoExameLink('');
  };

  const handleRemoveExame = (id: string) => {
    setExames((prev) => prev.filter((ex) => ex.id !== id));
  };

  const handleAddPlanoItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItemProc.trim()) return;
    const parsedValor = Number(novoItemValor.replace(',', '.')) || 0;
    const item: ItemPlanoTratamento = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      denteOuRegiao: novoItemRegiao.trim() || 'Geral',
      procedimento: novoItemProc.trim(),
      valorEstimado: parsedValor,
      status: novoItemStatus,
    };
    setPlanoTratamento((prev) => [...prev, item]);
    setNovoItemRegiao('');
    setNovoItemProc('');
    setNovoItemValor('');
  };

  const handleUpdatePlanoStatus = (id: string, status: StatusPlanoTratamento) => {
    setPlanoTratamento((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
  };

  const handleRemovePlanoItem = (id: string) => {
    setPlanoTratamento((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const dentesAlterados = Object.values(dentes).filter(
        (d) => d.status !== 'higido' || d.observacao?.trim()
      );
      const novaEntradaHistorico: FichaHistoricoItem = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        data: new Date().toLocaleString('pt-BR'),
        resumo: `Prontuário odontológico salvo (${dentesAlterados.length} ${
          dentesAlterados.length === 1 ? 'dente' : 'dentes'
        }, ${planoTratamento.length} ${planoTratamento.length === 1 ? 'item no plano' : 'itens no plano'})`,
      };
      const proximoHistorico = [novaEntradaHistorico, ...historico].slice(0, 20);

      const { error } = await supabase
        .from('fichas_clinicas')
        .upsert(
          {
            lojista_id: lojistaId,
            cliente_id: clienteId,
            tipo_ficha: 'odontograma',
            dados_json: {
              dentes,
              historico: proximoHistorico,
              anamnese,
              planoTratamento,
              retornoPrevisto: retornoPrevisto || undefined,
              exames,
            },
            observacoes_gerais: observacoesGerais.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'lojista_id,cliente_id,tipo_ficha' }
        );

      if (error) {
        setErrorMessage(`Erro ao salvar prontuário: ${error.message}`);
        return;
      }

      setHistorico(proximoHistorico);
      setSuccessMessage('Prontuário odontológico salvo com sucesso!');
      if (onSaved) onSaved();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar ficha.');
    } finally {
      setSaving(false);
    }
  };

  const totaisPlano = useMemo(() => {
    return planoTratamento.reduce(
      (acc, item) => {
        const v = Number(item.valorEstimado) || 0;
        if (item.status === 'orcado') acc.orcado += v;
        if (item.status === 'aprovado') acc.aprovado += v;
        if (item.status === 'concluido') acc.concluido += v;
        acc.total += v;
        return acc;
      },
      { orcado: 0, aprovado: 0, concluido: 0, total: 0 }
    );
  }, [planoTratamento]);

  if (!isOpen) return null;

  const selectedToothData = selectedTooth ? dentes[String(selectedTooth)] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-[#4C566A] bg-[#2E3440] text-[#ECEFF4] shadow-2xl overflow-hidden my-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#4C566A]/60 bg-[#3B4252]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#88C0D0]/15 border border-[#88C0D0]/30 flex items-center justify-center text-[#88C0D0]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#ECEFF4]">
                  Prontuário Odontológico — {clienteNome}
                </h2>
                {anamnese.alertaCritico && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#BF616A]/20 border border-[#BF616A] px-2 py-0.5 text-[10px] font-bold text-[#BF616A]">
                    <ShieldAlert className="w-3 h-3" />
                    Alerta Crítico
                  </span>
                )}
              </div>
              <p className="text-xs text-[#D8DEE9]/70">
                Odontograma FDI, Anamnese Clínica, Retorno, Exames e Plano de Tratamento.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#D8DEE9]/70 hover:bg-[#434C5E] hover:text-[#ECEFF4] transition"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação por Abas */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#4C566A]/40 bg-[#2E3440] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('odontograma')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'odontograma'
                ? 'border-[#88C0D0] text-[#88C0D0]'
                : 'border-transparent text-[#D8DEE9]/70 hover:text-[#ECEFF4]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Odontograma & Histórico</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('anamnese')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'anamnese'
                ? 'border-[#88C0D0] text-[#88C0D0]'
                : 'border-transparent text-[#D8DEE9]/70 hover:text-[#ECEFF4]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Anamnese, Retorno e Exames</span>
            {anamnese.alertaCritico && (
              <span className="h-2 w-2 rounded-full bg-[#BF616A]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plano')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'plano'
                ? 'border-[#88C0D0] text-[#88C0D0]'
                : 'border-transparent text-[#D8DEE9]/70 hover:text-[#ECEFF4]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Plano / Orçamento ({planoTratamento.length})</span>
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[76vh] overflow-y-auto">
          {errorMessage && (
            <div className="rounded-xl border border-[#BF616A]/60 bg-[#BF616A]/15 p-3 text-xs text-[#ECEFF4] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#BF616A] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-[#A3BE8C]/60 bg-[#A3BE8C]/15 p-3 text-xs text-[#A3BE8C] flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-xs text-[#88C0D0]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Carregando prontuário odontológico...</span>
            </div>
          ) : (
            <>
              {/* ============================================================ */}
              {/* ABA 1: ODONTOGRAMA & HISTÓRICO                               */}
              {/* ============================================================ */}
              {activeTab === 'odontograma' && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[#4C566A]/50 bg-[#3B4252] p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#88C0D0]">
                        Status Ativo para Marcação
                      </span>
                      <button
                        type="button"
                        disabled={selectedTooth === null}
                        onClick={handleApplyStatusToSelected}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#88C0D0] hover:bg-[#88C0D0]/90 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-[#2E3440] transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {selectedTooth
                            ? `Aplicar status ao dente ${selectedTooth}`
                            : 'Aplicar status ao dente selecionado'}
                        </span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((opt) => {
                        const isActive = activeStatus === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setActiveStatus(opt.value)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                              isActive
                                ? `${opt.bgClass} ${opt.borderClass} ring-2 ring-[#88C0D0]/60 text-[#ECEFF4]`
                                : 'border-[#4C566A]/50 bg-[#2E3440] text-[#D8DEE9]/80 hover:bg-[#434C5E]'
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: opt.color }}
                            />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Arcadas FDI */}
                  <div className="rounded-2xl border border-[#4C566A]/60 bg-[#242933] p-4 sm:p-6 space-y-6 overflow-x-auto">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#81A1C1] mb-2 px-2">
                        <span>Quadrante 1 (Sup. Direito)</span>
                        <span>Arcada Superior</span>
                        <span>Quadrante 2 (Sup. Esquerdo)</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 min-w-[640px]">
                        <div className="flex items-center gap-1 pr-3 border-r border-[#4C566A]/60">
                          {QUADRANTE_SUP_DIR.map((num) => (
                            <ToothSvg
                              key={num}
                              numero={num}
                              estado={dentes[String(num)]}
                              isSelected={selectedTooth === num}
                              isUpper
                              onClick={() => handleToothClick(num)}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1 pl-3">
                          {QUADRANTE_SUP_ESQ.map((num) => (
                            <ToothSvg
                              key={num}
                              numero={num}
                              estado={dentes[String(num)]}
                              isSelected={selectedTooth === num}
                              isUpper
                              onClick={() => handleToothClick(num)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-[#4C566A]/60" />

                    <div>
                      <div className="flex items-center justify-center gap-2 min-w-[640px]">
                        <div className="flex items-center gap-1 pr-3 border-r border-[#4C566A]/60">
                          {QUADRANTE_INF_DIR.map((num) => (
                            <ToothSvg
                              key={num}
                              numero={num}
                              estado={dentes[String(num)]}
                              isSelected={selectedTooth === num}
                              isUpper={false}
                              onClick={() => handleToothClick(num)}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1 pl-3">
                          {QUADRANTE_INF_ESQ.map((num) => (
                            <ToothSvg
                              key={num}
                              numero={num}
                              estado={dentes[String(num)]}
                              isSelected={selectedTooth === num}
                              isUpper={false}
                              onClick={() => handleToothClick(num)}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#81A1C1] mt-2 px-2">
                        <span>Quadrante 4 (Inf. Direito)</span>
                        <span>Arcada Inferior</span>
                        <span>Quadrante 3 (Inf. Esquerdo)</span>
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
                          {selectedTooth
                            ? `Observação do Dente ${selectedTooth}`
                            : 'Observação por Dente'}
                        </label>
                        {selectedToothData && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2E3440] text-[#ECEFF4]">
                            {STATUS_OPTIONS.find((s) => s.value === selectedToothData.status)?.label}
                          </span>
                        )}
                      </div>
                      {selectedTooth ? (
                        <textarea
                          rows={3}
                          value={selectedToothData?.observacao || ''}
                          onChange={(e) => handleToothObservacaoChange(e.target.value)}
                          placeholder={`Descreva o procedimento ou achado clínico no dente ${selectedTooth}...`}
                          className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-3 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                        />
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#4C566A]/50 bg-[#2E3440]/50 p-4 text-center text-xs text-[#D8DEE9]/60">
                          Clique em qualquer dente acima para selecionar e editar sua observação.
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#ECEFF4] block">
                        Observações Gerais da Ficha
                      </label>
                      <textarea
                        rows={3}
                        value={observacoesGerais}
                        onChange={(e) => setObservacoesGerais(e.target.value)}
                        placeholder="Plano geral, observações de atendimento..."
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-3 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Histórico */}
                  {historico.length > 0 && (
                    <div className="rounded-2xl border border-[#4C566A]/50 bg-[#3B4252]/70 p-4 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#88C0D0] flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        <span>Histórico de Evolução ({historico.length})</span>
                      </span>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {historico.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between gap-2 text-[11px] rounded-lg bg-[#2E3440] px-3 py-1.5 text-[#D8DEE9]"
                          >
                            <span>{h.resumo}</span>
                            <span className="font-mono text-[10px] text-[#81A1C1] shrink-0">
                              {h.data}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* ABA 2: ANAMNESE, RETORNO E EXAMES                            */}
              {/* ============================================================ */}
              {activeTab === 'anamnese' && (
                <div className="space-y-5">
                  {/* Toggle Alerta Clínico Crítico */}
                  <div
                    className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      anamnese.alertaCritico
                        ? 'border-[#BF616A] bg-[#BF616A]/15'
                        : 'border-[#4C566A]/60 bg-[#3B4252]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <ShieldAlert
                        className={`w-5 h-5 shrink-0 mt-0.5 ${
                          anamnese.alertaCritico ? 'text-[#BF616A]' : 'text-[#EBCB8B]'
                        }`}
                      />
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#ECEFF4]">
                          Alerta Clínico Crítico
                        </h3>
                        <p className="text-xs text-[#D8DEE9]/75 mt-0.5">
                          Destaca um aviso imediato na ficha do paciente (ex: alergia severa, anticoagulante, hipertensão).
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAnamnese((prev) => ({ ...prev, alertaCritico: !prev.alertaCritico }))
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition shrink-0 ${
                        anamnese.alertaCritico
                          ? 'bg-[#BF616A] border-[#BF616A] text-white'
                          : 'bg-[#2E3440] border-[#4C566A] text-[#EBCB8B] hover:bg-[#434C5E]'
                      }`}
                    >
                      {anamnese.alertaCritico ? 'Alerta Crítico ATIVO' : 'Ativar Alerta Crítico'}
                    </button>
                  </div>

                  {/* Campos de Anamnese */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 space-y-2">
                      <label className="text-xs font-bold text-[#EBCB8B] block">
                        Alergias Conhecidas
                      </label>
                      <textarea
                        rows={3}
                        value={anamnese.alergias || ''}
                        onChange={(e) =>
                          setAnamnese((prev) => ({ ...prev, alergias: e.target.value }))
                        }
                        placeholder="Ex: Dipirona, Penicilina, Látex..."
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-2.5 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                      />
                    </div>

                    <div className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 space-y-2">
                      <label className="text-xs font-bold text-[#88C0D0] block">
                        Condições Médicas
                      </label>
                      <textarea
                        rows={3}
                        value={anamnese.condicoesMedicas || ''}
                        onChange={(e) =>
                          setAnamnese((prev) => ({ ...prev, condicoesMedicas: e.target.value }))
                        }
                        placeholder="Ex: Diabetes, Hipertensão, Cardiopatia..."
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-2.5 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                      />
                    </div>

                    <div className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 space-y-2">
                      <label className="text-xs font-bold text-[#ECEFF4] block">
                        Medicações em Uso
                      </label>
                      <textarea
                        rows={3}
                        value={anamnese.medicacoesEmUso || ''}
                        onChange={(e) =>
                          setAnamnese((prev) => ({ ...prev, medicacoesEmUso: e.target.value }))
                        }
                        placeholder="Ex: AAS, Losartana, Metformina..."
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-2.5 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Retorno Previsto */}
                  <div className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-[#88C0D0]" />
                      <div>
                        <label className="text-xs font-bold text-[#ECEFF4] block">
                          Retorno / Revisão Prevista
                        </label>
                        <span className="text-[11px] text-[#D8DEE9]/70">
                          Programe o próximo acompanhamento preventivo.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={retornoPrevisto}
                        onChange={(e) => setRetornoPrevisto(e.target.value)}
                        className="rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] font-mono focus:border-[#88C0D0] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSetRetorno6Meses}
                        className="rounded-xl border border-[#88C0D0]/50 bg-[#88C0D0]/15 hover:bg-[#88C0D0] hover:text-[#2E3440] px-3 py-2 text-xs font-bold text-[#88C0D0] transition whitespace-nowrap"
                      >
                        +6 meses
                      </button>
                    </div>
                  </div>

                  {/* Exames e Radiografias */}
                  <div className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-[#88C0D0]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#ECEFF4]">
                        Exames e Radiografias ({exames.length})
                      </h3>
                    </div>

                    <form onSubmit={handleAddExame} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <input
                        type="text"
                        required
                        value={novoExameTitulo}
                        onChange={(e) => setNovoExameTitulo(e.target.value)}
                        placeholder="Título (ex: Panorâmica, Periapical 36)"
                        className="sm:col-span-5 rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={novoExameLink}
                        onChange={(e) => setNovoExameLink(e.target.value)}
                        placeholder="Link ou local do arquivo"
                        className="sm:col-span-4 rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                      />
                      <input
                        type="date"
                        value={novoExameData}
                        onChange={(e) => setNovoExameData(e.target.value)}
                        className="sm:col-span-2 rounded-xl border border-[#4C566A] bg-[#2E3440] px-2.5 py-2 text-xs text-[#ECEFF4] font-mono focus:border-[#88C0D0] focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="sm:col-span-1 inline-flex items-center justify-center rounded-xl bg-[#88C0D0] hover:bg-[#88C0D0]/90 text-[#2E3440] font-bold p-2 transition"
                        title="Adicionar exame"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </form>

                    {exames.length === 0 ? (
                      <p className="text-xs text-[#D8DEE9]/60 italic text-center py-2">
                        Nenhum exame ou radiografia anexado ainda.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {exames.map((ex) => (
                          <div
                            key={ex.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[#4C566A]/50 bg-[#2E3440] px-3.5 py-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <strong className="text-[#ECEFF4] block truncate">{ex.titulo}</strong>
                              <span className="text-[11px] text-[#81A1C1] block truncate">
                                {ex.linkOuLocal} • {ex.dataExame.split('-').reverse().join('/')}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveExame(ex.id)}
                              className="rounded-lg p-1.5 text-[#BF616A] hover:bg-[#BF616A]/20 transition shrink-0"
                              title="Remover exame"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* ABA 3: PLANO / ORÇAMENTO                                     */}
              {/* ============================================================ */}
              {activeTab === 'plano' && (
                <div className="space-y-5">
                  {/* Resumo de Totais */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-[#EBCB8B]/40 bg-[#3B4252] p-3">
                      <span className="text-[10px] uppercase tracking-wider text-[#EBCB8B] font-bold block">
                        Orçado
                      </span>
                      <span className="text-sm font-black font-mono text-[#ECEFF4]">
                        {formatBRL(totaisPlano.orcado)}
                      </span>
                    </div>
                    <div className="rounded-xl border border-[#88C0D0]/40 bg-[#3B4252] p-3">
                      <span className="text-[10px] uppercase tracking-wider text-[#88C0D0] font-bold block">
                        Aprovado
                      </span>
                      <span className="text-sm font-black font-mono text-[#ECEFF4]">
                        {formatBRL(totaisPlano.aprovado)}
                      </span>
                    </div>
                    <div className="rounded-xl border border-[#A3BE8C]/40 bg-[#3B4252] p-3">
                      <span className="text-[10px] uppercase tracking-wider text-[#A3BE8C] font-bold block">
                        Concluído
                      </span>
                      <span className="text-sm font-black font-mono text-[#ECEFF4]">
                        {formatBRL(totaisPlano.concluido)}
                      </span>
                    </div>
                    <div className="rounded-xl border border-[#4C566A] bg-[#242933] p-3">
                      <span className="text-[10px] uppercase tracking-wider text-[#D8DEE9]/70 font-bold block">
                        Total do Plano
                      </span>
                      <span className="text-sm font-black font-mono text-[#88C0D0]">
                        {formatBRL(totaisPlano.total)}
                      </span>
                    </div>
                  </div>

                  {/* Formulário Novo Item */}
                  <form
                    onSubmit={handleAddPlanoItem}
                    className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                        Dente / Região
                      </label>
                      <input
                        type="text"
                        value={novoItemRegiao}
                        onChange={(e) => setNovoItemRegiao(e.target.value)}
                        placeholder="Ex: Dente 16, Sup."
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                        Procedimento *
                      </label>
                      <input
                        type="text"
                        required
                        value={novoItemProc}
                        onChange={(e) => setNovoItemProc(e.target.value)}
                        placeholder="Ex: Restauração em Resina"
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                        Valor (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={novoItemValor}
                        onChange={(e) => setNovoItemValor(e.target.value)}
                        placeholder="250.00"
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-2.5 py-2 text-xs text-[#ECEFF4] font-mono focus:border-[#88C0D0] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                        Status
                      </label>
                      <select
                        value={novoItemStatus}
                        onChange={(e) => setNovoItemStatus(e.target.value as StatusPlanoTratamento)}
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-2 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                      >
                        <option value="orcado">Orçado</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="concluido">Concluído</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center rounded-xl bg-[#88C0D0] hover:bg-[#88C0D0]/90 text-[#2E3440] font-bold py-2 transition"
                        title="Adicionar item ao plano"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </form>

                  {/* Lista do Plano */}
                  {planoTratamento.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#4C566A] bg-[#3B4252]/40 p-6 text-center text-xs text-[#D8DEE9]/60">
                      Nenhum procedimento adicionado ao plano de tratamento ainda.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {planoTratamento.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-[#4C566A]/60 bg-[#3B4252] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-[#2E3440] border border-[#4C566A] px-2 py-0.5 text-[10px] font-mono font-bold text-[#88C0D0]">
                                {item.denteOuRegiao}
                              </span>
                              <strong className="text-[#ECEFF4]">{item.procedimento}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono font-bold text-[#A3BE8C]">
                              {formatBRL(Number(item.valorEstimado) || 0)}
                            </span>
                            <select
                              value={item.status}
                              onChange={(e) =>
                                handleUpdatePlanoStatus(
                                  item.id,
                                  e.target.value as StatusPlanoTratamento
                                )
                              }
                              className="rounded-lg border border-[#4C566A] bg-[#2E3440] px-2 py-1 text-[11px] text-[#ECEFF4] focus:outline-none"
                            >
                              <option value="orcado">Orçado</option>
                              <option value="aprovado">Aprovado</option>
                              <option value="concluido">Concluído</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemovePlanoItem(item.id)}
                              className="rounded-lg p-1.5 text-[#BF616A] hover:bg-[#BF616A]/20 transition"
                              title="Remover item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#4C566A]/40">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#4C566A] bg-[#3B4252] hover:bg-[#434C5E] px-4 py-2.5 text-xs font-semibold text-[#ECEFF4] transition"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={saving || loading}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-[#88C0D0] hover:bg-[#88C0D0]/90 px-5 py-2.5 text-xs font-bold text-[#2E3440] transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Prontuário</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
