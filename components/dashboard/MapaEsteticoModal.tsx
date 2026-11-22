'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MarcadorEstetico, VistaMapaEstetico } from '@/types/niche';
import {
  X,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Trash2,
  Plus,
  Sparkles,
} from 'lucide-react';

interface MapaEsteticoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojistaId: string;
  clienteId: string;
  clienteNome: string;
}

const VISTAS: { id: VistaMapaEstetico; label: string }[] = [
  { id: 'facial', label: 'Facial' },
  { id: 'corporal_frente', label: 'Corporal (Frente)' },
  { id: 'corporal_costas', label: 'Corporal (Costas)' },
];

function AestheticSvgSilhouette({ vista }: { vista: VistaMapaEstetico }) {
  if (vista === 'facial') {
    return (
      <svg viewBox="0 0 200 240" className="w-full h-full max-h-[340px] select-none pointer-events-none">
        {/* Contorno da cabeça e pescoço */}
        <path
          d="M100 22 C64 22, 46 52, 46 92 C46 130, 62 162, 82 174 L82 204 C82 214, 118 214, 118 204 L118 174 C138 162, 154 130, 154 92 C154 52, 136 22, 100 22 Z"
          fill="#2E3440"
          stroke="#88C0D0"
          strokeWidth="1.6"
        />
        {/* Linhas de referência estética (testa, olhos, zigomático, lábios) */}
        <path d="M64 62 Q100 54 136 62" fill="none" stroke="#4C566A" strokeDasharray="3 3" strokeWidth="1" />
        {/* Sobrancelhas */}
        <path d="M65 82 Q78 75 90 82" fill="none" stroke="#81A1C1" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M110 82 Q122 75 135 82" fill="none" stroke="#81A1C1" strokeWidth="1.5" strokeLinecap="round" />
        {/* Olhos */}
        <ellipse cx="78" cy="94" rx="10" ry="5" fill="none" stroke="#81A1C1" strokeWidth="1.3" />
        <ellipse cx="122" cy="94" rx="10" ry="5" fill="none" stroke="#81A1C1" strokeWidth="1.3" />
        {/* Nariz */}
        <path d="M100 92 L95 120 Q100 124 105 120" fill="none" stroke="#81A1C1" strokeWidth="1.3" strokeLinecap="round" />
        {/* Lábios */}
        <path d="M84 142 Q100 135 116 142 Q100 152 84 142 Z" fill="none" stroke="#B48EAD" strokeWidth="1.4" />
        {/* Linha média */}
        <line x1="100" y1="26" x2="100" y2="174" stroke="#4C566A" strokeDasharray="2 4" strokeWidth="0.8" />
      </svg>
    );
  }

  if (vista === 'corporal_frente') {
    return (
      <svg viewBox="0 0 200 260" className="w-full h-full max-h-[340px] select-none pointer-events-none">
        {/* Cabeça */}
        <circle cx="100" cy="26" r="16" fill="#2E3440" stroke="#88C0D0" strokeWidth="1.5" />
        {/* Tronco e braços (frente) */}
        <path
          d="M88 42 L62 52 L44 114 L54 118 L68 72 L72 118 L66 154 L72 242 L88 242 L96 164 L104 164 L112 242 L128 242 L134 154 L128 118 L132 72 L146 118 L156 114 L138 52 L112 42 Z"
          fill="#2E3440"
          stroke="#88C0D0"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Linhas anatômicas frente */}
        <path d="M74 84 Q100 94 126 84" fill="none" stroke="#4C566A" strokeDasharray="3 3" strokeWidth="1" />
        <circle cx="100" cy="118" r="2" fill="#81A1C1" />
        <line x1="100" y1="45" x2="100" y2="160" stroke="#4C566A" strokeDasharray="2 4" strokeWidth="0.9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 260" className="w-full h-full max-h-[340px] select-none pointer-events-none">
      {/* Cabeça (costas) */}
      <circle cx="100" cy="26" r="16" fill="#2E3440" stroke="#88C0D0" strokeWidth="1.5" />
      {/* Tronco e membros (costas) */}
      <path
        d="M88 42 L60 52 L44 114 L54 118 L68 72 L72 118 L66 154 L72 242 L88 242 L96 164 L104 164 L112 242 L128 242 L134 154 L128 118 L132 72 L146 118 L156 114 L140 52 L112 42 Z"
        fill="#2E3440"
        stroke="#B48EAD"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Coluna e glúteos */}
      <line x1="100" y1="44" x2="100" y2="142" stroke="#4C566A" strokeDasharray="3 3" strokeWidth="1.2" />
      <path d="M70 142 Q86 156 100 144 Q114 156 130 142" fill="none" stroke="#4C566A" strokeWidth="1.1" />
    </svg>
  );
}

export function MapaEsteticoModal({
  isOpen,
  onClose,
  lojistaId,
  clienteId,
  clienteNome,
}: MapaEsteticoModalProps) {
  const supabase = useMemo(() => createClient(), []);

  const [vista, setVista] = useState<VistaMapaEstetico>('facial');
  const [marcadores, setMarcadores] = useState<MarcadorEstetico[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Ponto pendente de inserção ao clicar no canvas
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [procedimento, setProcedimento] = useState('');
  const [produtoOuDose, setProdutoOuDose] = useState('');
  const [observacao, setObservacao] = useState('');

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
        .eq('tipo_ficha', 'mapa_estetico')
        .maybeSingle();

      if (error) {
        setErrorMessage(`Erro ao carregar mapa estético: ${error.message}`);
        return;
      }

      if (data) {
        const dadosJson = (data.dados_json || {}) as { marcadores?: MarcadorEstetico[] };
        setMarcadores(dadosJson.marcadores || []);
        setObservacoesGerais(data.observacoes_gerais || '');
      } else {
        setMarcadores([]);
        setObservacoesGerais('');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar mapa estético.');
    } finally {
      setLoading(false);
    }
  }, [supabase, lojistaId, clienteId]);

  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      setPendingPoint(null);
      setSelectedMarkerId(null);
      loadFicha();
    }
  }, [isOpen, loadFicha]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

    setPendingPoint({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
    setSelectedMarkerId(null);
  };

  const handleAddMarker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPoint || !procedimento.trim()) return;

    const novoMarcador: MarcadorEstetico = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      vista,
      x: pendingPoint.x,
      y: pendingPoint.y,
      procedimento: procedimento.trim(),
      produtoOuDose: produtoOuDose.trim() || undefined,
      observacao: observacao.trim() || undefined,
      dataRegistro: new Date().toLocaleDateString('pt-BR'),
    };

    setMarcadores((prev) => [...prev, novoMarcador]);
    setSelectedMarkerId(novoMarcador.id);
    setPendingPoint(null);
    setProcedimento('');
    setProdutoOuDose('');
    setObservacao('');
  };

  const handleRemoveMarker = (id: string) => {
    setMarcadores((prev) => prev.filter((m) => m.id !== id));
    if (selectedMarkerId === id) setSelectedMarkerId(null);
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
            tipo_ficha: 'mapa_estetico',
            dados_json: { marcadores },
            observacoes_gerais: observacoesGerais.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'lojista_id,cliente_id,tipo_ficha' }
        );

      if (error) {
        setErrorMessage(`Erro ao salvar mapa estético: ${error.message}`);
        return;
      }

      setSuccessMessage('Mapa estético salvo com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar mapa estético.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const marcadoresDaVista = marcadores.filter((m) => m.vista === vista);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-[#4C566A] bg-[#2E3440] text-[#ECEFF4] shadow-2xl overflow-hidden my-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#4C566A]/60 bg-[#3B4252]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#B48EAD]/20 border border-[#B48EAD]/40 flex items-center justify-center text-[#B48EAD]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#ECEFF4]">
                Mapa Estético — {clienteNome}
              </h2>
              <p className="text-xs text-[#D8DEE9]/70">
                Selecione a vista e clique sobre a ilustração para adicionar pontos de aplicação ou protocolos.
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

          {/* Seletor de Vista */}
          <div className="flex flex-wrap items-center gap-2">
            {VISTAS.map((v) => {
              const isActive = vista === v.id;
              const count = marcadores.filter((m) => m.vista === v.id).length;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVista(v.id);
                    setPendingPoint(null);
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                    isActive
                      ? 'border-[#88C0D0] bg-[#88C0D0] text-[#2E3440]'
                      : 'border-[#4C566A]/60 bg-[#3B4252] text-[#ECEFF4] hover:bg-[#434C5E]'
                  }`}
                >
                  <span>{v.label}</span>
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono ${
                        isActive ? 'bg-[#2E3440] text-[#88C0D0]' : 'bg-[#2E3440] text-[#B48EAD]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#88C0D0]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Carregando mapa estético...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Coluna Esquerda: Canvas SVG Interativo */}
              <div className="lg:col-span-6 rounded-2xl border border-[#4C566A]/60 bg-[#242933] p-4 flex flex-col items-center justify-center">
                <div
                  onClick={handleCanvasClick}
                  className="relative w-full max-w-[300px] aspect-[5/6] cursor-crosshair rounded-xl border border-[#3B4252] bg-[#242933] flex items-center justify-center overflow-hidden"
                  title="Clique para adicionar um marcador neste ponto"
                >
                  <AestheticSvgSilhouette vista={vista} />

                  {/* Marcadores existentes da vista */}
                  {marcadoresDaVista.map((m, idx) => {
                    const isSel = selectedMarkerId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelectedMarkerId(m.id);
                          setPendingPoint(null);
                        }}
                        style={{ left: `${m.x}%`, top: `${m.y}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border-2 text-[10px] font-black flex items-center justify-center shadow-lg transition-transform ${
                          isSel
                            ? 'bg-[#88C0D0] border-white text-[#2E3440] scale-125 z-20'
                            : 'bg-[#B48EAD] border-[#2E3440] text-[#242933] hover:scale-110 z-10'
                        }`}
                        title={`${m.procedimento}${m.produtoOuDose ? ` (${m.produtoOuDose})` : ''}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}

                  {/* Ponto pendente */}
                  {pendingPoint && (
                    <span
                      style={{ left: `${pendingPoint.x}%`, top: `${pendingPoint.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-[#EBCB8B] border-2 border-white animate-pulse z-30"
                    />
                  )}
                </div>
                <span className="text-[11px] text-[#81A1C1] mt-3">
                  Clique em qualquer região do desenho para posicionar um novo ponto.
                </span>
              </div>

              {/* Coluna Direita: Formulário de Novo Ponto + Lista */}
              <div className="lg:col-span-6 space-y-4">
                {pendingPoint && (
                  <form
                    onSubmit={handleAddMarker}
                    className="rounded-2xl border border-[#EBCB8B]/60 bg-[#3B4252] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#EBCB8B] flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        Novo Marcador ({pendingPoint.x}%, {pendingPoint.y}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingPoint(null)}
                        className="text-xs text-[#D8DEE9]/70 hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                          Procedimento *
                        </label>
                        <input
                          type="text"
                          required
                          value={procedimento}
                          onChange={(e) => setProcedimento(e.target.value)}
                          placeholder="Ex: Toxina Botulínica, Preenchimento"
                          className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                          Produto ou Dose
                        </label>
                        <input
                          type="text"
                          value={produtoOuDose}
                          onChange={(e) => setProdutoOuDose(e.target.value)}
                          placeholder="Ex: Botox 15U, AH 1ml"
                          className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                        Observação
                      </label>
                      <input
                        type="text"
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        placeholder="Plano muscular, profundidade, retoque..."
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#88C0D0] hover:bg-[#88C0D0]/90 px-4 py-2 text-xs font-bold text-[#2E3440] transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Ponto</span>
                    </button>
                  </form>
                )}

                {/* Lista de Marcadores da Vista */}
                <div className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
                      Pontos Registrados — {VISTAS.find((v) => v.id === vista)?.label} ({marcadoresDaVista.length})
                    </h3>
                  </div>

                  {marcadoresDaVista.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#4C566A]/60 bg-[#2E3440]/50 p-5 text-center text-xs text-[#D8DEE9]/60">
                      Nenhum ponto marcado nesta vista ainda. Clique no desenho ao lado para iniciar.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {marcadoresDaVista.map((m, idx) => {
                        const isSel = selectedMarkerId === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedMarkerId(m.id)}
                            className={`rounded-xl border p-3 cursor-pointer transition flex items-start justify-between gap-2 ${
                              isSel
                                ? 'border-[#88C0D0] bg-[#434C5E]'
                                : 'border-[#4C566A]/50 bg-[#2E3440] hover:bg-[#434C5E]/50'
                            }`}
                          >
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-[#B48EAD] text-[#242933] text-[10px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <strong className="text-[#ECEFF4]">{m.procedimento}</strong>
                                {m.produtoOuDose && (
                                  <span className="rounded bg-[#3B4252] px-1.5 py-0.5 text-[10px] font-mono text-[#88C0D0]">
                                    {m.produtoOuDose}
                                  </span>
                                )}
                              </div>
                              {m.observacao && (
                                <p className="text-[11px] text-[#D8DEE9]/80 pl-7">{m.observacao}</p>
                              )}
                              <span className="text-[10px] text-[#81A1C1] pl-7 block">
                                Registrado em {m.dataRegistro} • ({m.x}%, {m.y}%)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                handleRemoveMarker(m.id);
                              }}
                              className="rounded-lg p-1.5 text-[#BF616A] hover:bg-[#BF616A]/20 transition"
                              title="Remover marcador"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Observações Gerais */}
                <div className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#ECEFF4] block">
                    Observações Gerais da Ficha
                  </label>
                  <textarea
                    rows={2}
                    value={observacoesGerais}
                    onChange={(e) => setObservacoesGerais(e.target.value)}
                    placeholder="Anamnese estética, sensibilidades, metas do protocolo..."
                    className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-3 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                  />
                </div>
              </div>
            </div>
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
                  <span>Salvar Mapa Estético</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
