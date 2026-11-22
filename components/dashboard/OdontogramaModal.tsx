'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { DenteEstado, StatusDenteFDI } from '@/types/niche';
import { X, Save, Loader2, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';

interface OdontogramaModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojistaId: string;
  clienteId: string;
  clienteNome: string;
}

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
];

// Numeração FDI oficial dos 32 dentes
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
    case 'higido':
    default:
      return { fill: '#3B4252', stroke: '#4C566A', text: '#ECEFF4' };
  }
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
            /* Raiz para cima, coroa para baixo */
            <path
              d="M11 18 C11 6, 15 3, 18 10 C21 3, 25 6, 25 18 L28 28 C29 36, 24 41, 18 40 C12 41, 7 36, 8 28 Z"
              fill={colors.fill}
              stroke={isSelected ? '#88C0D0' : colors.stroke}
              strokeWidth={isSelected ? 2.2 : 1.6}
              strokeLinejoin="round"
            />
          ) : (
            /* Coroa para cima, raiz para baixo */
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
}: OdontogramaModalProps) {
  const supabase = useMemo(() => createClient(), []);

  const [dentes, setDentes] = useState<Record<number, DenteEstado>>({});
  const [observacoesGerais, setObservacoesGerais] = useState('');
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
        const dadosJson = (data.dados_json || {}) as { dentes?: Record<number, DenteEstado> };
        setDentes(dadosJson.dentes || {});
        setObservacoesGerais(data.observacoes_gerais || '');
      } else {
        setDentes({});
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
      loadFicha();
    }
  }, [isOpen, loadFicha]);

  const handleToothClick = (numero: number) => {
    setSelectedTooth(numero);
    setDentes((prev) => ({
      ...prev,
      [numero]: {
        numero,
        status: activeStatus,
        observacao: prev[numero]?.observacao || '',
        atualizado_em: new Date().toISOString(),
      },
    }));
  };

  const handleToothObservacaoChange = (obs: string) => {
    if (selectedTooth === null) return;
    setDentes((prev) => ({
      ...prev,
      [selectedTooth]: {
        numero: selectedTooth,
        status: prev[selectedTooth]?.status || 'higido',
        observacao: obs,
        atualizado_em: new Date().toISOString(),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase
        .from('fichas_clinicas')
        .upsert(
          {
            lojista_id: lojistaId,
            cliente_id: clienteId,
            tipo_ficha: 'odontograma',
            dados_json: { dentes },
            observacoes_gerais: observacoesGerais.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'lojista_id,cliente_id,tipo_ficha' }
        );

      if (error) {
        setErrorMessage(`Erro ao salvar odontograma: ${error.message}`);
        return;
      }

      setSuccessMessage('Odontograma salvo com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar ficha.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedToothData = selectedTooth ? dentes[selectedTooth] : null;

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
              <h2 className="text-base font-bold text-[#ECEFF4]">
                Odontograma FDI — {clienteNome}
              </h2>
              <p className="text-xs text-[#D8DEE9]/70">
                Selecione o status ativo abaixo e clique no dente correspondente para registrar.
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

        <div className="p-5 sm:p-6 space-y-5 max-h-[84vh] overflow-y-auto">
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

          {/* Barra de Status Ativo */}
          <div className="rounded-2xl border border-[#4C566A]/50 bg-[#3B4252] p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#88C0D0] block mb-2.5">
              Status Ativo para Marcação
            </span>
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

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#88C0D0]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Carregando odontograma...</span>
            </div>
          ) : (
            /* Canvas Odontograma 32 Dentes FDI */
            <div className="rounded-2xl border border-[#4C566A]/60 bg-[#242933] p-4 sm:p-6 space-y-6 overflow-x-auto">
              {/* Arcada Superior */}
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
                        estado={dentes[num]}
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
                        estado={dentes[num]}
                        isSelected={selectedTooth === num}
                        isUpper
                        onClick={() => handleToothClick(num)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-[#4C566A]/60" />

              {/* Arcada Inferior */}
              <div>
                <div className="flex items-center justify-center gap-2 min-w-[640px]">
                  <div className="flex items-center gap-1 pr-3 border-r border-[#4C566A]/60">
                    {QUADRANTE_INF_DIR.map((num) => (
                      <ToothSvg
                        key={num}
                        numero={num}
                        estado={dentes[num]}
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
                        estado={dentes[num]}
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
          )}

          {/* Edição de Observação por Dente + Observações Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
                  {selectedTooth ? `Observação do Dente ${selectedTooth}` : 'Observação por Dente'}
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
                  Clique em qualquer dente acima para editar sua observação específica.
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
                placeholder="Plano de tratamento geral, alergias medicamentosas, anotações clínicas..."
                className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-3 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
              />
            </div>
          </div>

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
                  <span>Salvar Odontograma</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
