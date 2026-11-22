'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { EvolucaoPsicologicaItem } from '@/types/niche';
import {
  X,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  Calendar,
  Video,
  MapPin,
  Brain,
} from 'lucide-react';

interface ProntuarioPsicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojistaId: string;
  clienteId: string;
  clienteNome: string;
}

export function ProntuarioPsicoModal({
  isOpen,
  onClose,
  lojistaId,
  clienteId,
  clienteNome,
}: ProntuarioPsicoModalProps) {
  const supabase = useMemo(() => createClient(), []);

  const [sessoes, setSessoes] = useState<EvolucaoPsicologicaItem[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Nova sessão
  const [dataSessao, setDataSessao] = useState(() => new Date().toISOString().split('T')[0]);
  const [modalidade, setModalidade] = useState<'online' | 'presencial'>('online');
  const [queixaDemanda, setQueixaDemanda] = useState('');
  const [evolucaoClinica, setEvolucaoClinica] = useState('');
  const [observacoesPrivadas, setObservacoesPrivadas] = useState('');
  const [proximoPasso, setProximoPasso] = useState('');

  const loadProntuario = useCallback(async () => {
    if (!lojistaId || !clienteId) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('fichas_clinicas')
        .select('*')
        .eq('lojista_id', lojistaId)
        .eq('cliente_id', clienteId)
        .eq('tipo_ficha', 'evolucao_psicologica')
        .maybeSingle();

      if (error) {
        setErrorMessage(`Erro ao carregar prontuário: ${error.message}`);
        return;
      }

      if (data) {
        const dj = (data.dados_json || {}) as { sessoes?: EvolucaoPsicologicaItem[] };
        const lista = Array.isArray(dj.sessoes) ? dj.sessoes : [];
        lista.sort((a, b) => (b.data_sessao || '').localeCompare(a.data_sessao || ''));
        setSessoes(lista);
        setObservacoesGerais(data.observacoes_gerais || '');
      } else {
        setSessoes([]);
        setObservacoesGerais('');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar prontuário.');
    } finally {
      setLoading(false);
    }
  }, [supabase, lojistaId, clienteId]);

  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      loadProntuario();
    }
  }, [isOpen, loadProntuario]);

  const persistirSessoes = async (
    proximasSessoes: EvolucaoPsicologicaItem[],
    obsGerais: string,
    msgSucesso: string
  ) => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const ordenadas = [...proximasSessoes].sort((a, b) =>
        (b.data_sessao || '').localeCompare(a.data_sessao || '')
      );

      const { error } = await supabase
        .from('fichas_clinicas')
        .upsert(
          {
            lojista_id: lojistaId,
            cliente_id: clienteId,
            tipo_ficha: 'evolucao_psicologica',
            dados_json: { sessoes: ordenadas },
            observacoes_gerais: obsGerais.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'lojista_id,cliente_id,tipo_ficha' }
        );

      if (error) {
        setErrorMessage(`Erro ao salvar prontuário: ${error.message}`);
        return false;
      }

      setSessoes(ordenadas);
      setSuccessMessage(msgSucesso);
      setTimeout(() => setSuccessMessage(null), 3500);
      return true;
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar prontuário.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleRegistrarSessao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queixaDemanda.trim() || !evolucaoClinica.trim()) {
      setErrorMessage('Preencha a demanda/foco e o registro de evolução da sessão.');
      return;
    }

    const novaSessao: EvolucaoPsicologicaItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      data_sessao: dataSessao,
      modalidade,
      queixa_demanda: queixaDemanda.trim(),
      evolucao_clinica: evolucaoClinica.trim(),
      observacoes_privadas: observacoesPrivadas.trim() || undefined,
      proximo_passo: proximoPasso.trim() || undefined,
      criado_em: new Date().toISOString(),
    };

    const ok = await persistirSessoes(
      [novaSessao, ...sessoes],
      observacoesGerais,
      'Evolução de sessão registrada com sigilo!'
    );

    if (ok) {
      setQueixaDemanda('');
      setEvolucaoClinica('');
      setObservacoesPrivadas('');
      setProximoPasso('');
    }
  };

  const handleRemoverSessao = async (id: string) => {
    if (!confirm('Deseja remover este registro de sessão?')) return;
    const filtradas = sessoes.filter((s) => s.id !== id);
    await persistirSessoes(filtradas, observacoesGerais, 'Registro removido.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-[#4C566A] bg-[#2E3440] text-[#ECEFF4] shadow-2xl overflow-hidden my-auto">
        {/* Cabeçalho com Aviso de Sigilo */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#4C566A]/60 bg-[#3B4252]">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#B48EAD]/20 border border-[#B48EAD]/40 flex items-center justify-center text-[#B48EAD] shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#ECEFF4]">
                Prontuário de Evolução Psicológica — {clienteNome}
              </h2>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#2E3440] border border-[#4C566A] px-2.5 py-0.5 text-[10px] font-semibold text-[#88C0D0]">
                <Lock className="w-3 h-3 text-[#B48EAD]" />
                <span>
                  Sigilo Profissional (CRP / LGPD): Anotações privadas do profissional, nunca compartilhadas com a IA.
                </span>
              </div>
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

        <div className="p-5 sm:p-6 space-y-6 max-h-[82vh] overflow-y-auto">
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

          {/* Formulário: Registrar Nova Evolução de Sessão */}
          <form
            onSubmit={handleRegistrarSessao}
            className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-5 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-[#4C566A]/40 pb-2.5">
              <Plus className="w-4 h-4 text-[#88C0D0]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#ECEFF4]">
                Registrar Nova Sessão
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                  Data da Sessão *
                </label>
                <input
                  type="date"
                  required
                  value={dataSessao}
                  onChange={(e) => setDataSessao(e.target.value)}
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] font-mono focus:border-[#88C0D0] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                  Modalidade
                </label>
                <select
                  value={modalidade}
                  onChange={(e) => setModalidade(e.target.value as 'online' | 'presencial')}
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                >
                  <option value="online">Online</option>
                  <option value="presencial">Presencial</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                  Demanda / Foco da Sessão *
                </label>
                <input
                  type="text"
                  required
                  value={queixaDemanda}
                  onChange={(e) => setQueixaDemanda(e.target.value)}
                  placeholder="Ex: Ansiedade laboral, luto, limites..."
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                Registro de Evolução Clínica *
              </label>
              <textarea
                rows={3}
                required
                value={evolucaoClinica}
                onChange={(e) => setEvolucaoClinica(e.target.value)}
                placeholder="Síntese técnica do andamento da sessão, intervenções e percepções..."
                className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-3 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] font-semibold text-[#B48EAD] block mb-1">
                  Observações Sigilosas (Acesso Restrito)
                </label>
                <textarea
                  rows={2}
                  value={observacoesPrivadas}
                  onChange={(e) => setObservacoesPrivadas(e.target.value)}
                  placeholder="Hipóteses clínicas e anotações reservadas..."
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-2.5 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#B48EAD] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#88C0D0] block mb-1">
                  Próximo Passo / Encaminhamento
                </label>
                <textarea
                  rows={2}
                  value={proximoPasso}
                  onChange={(e) => setProximoPasso(e.target.value)}
                  placeholder="Ex: Retomar exercício de respiração na próxima semana..."
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-2.5 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#88C0D0] hover:bg-[#88C0D0]/90 px-4 py-2 text-xs font-bold text-[#2E3440] transition disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Registrar Evolução</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Histórico de Sessões Anteriores */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
              Histórico de Sessões ({sessoes.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#88C0D0]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando histórico de sessões...</span>
              </div>
            ) : sessoes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#4C566A] bg-[#3B4252]/40 p-6 text-center text-xs text-[#D8DEE9]/60">
                Nenhuma sessão registrada para este paciente ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {sessoes.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#2E3440] border border-[#4C566A] px-2 py-0.5 text-[11px] font-mono font-bold text-[#88C0D0]">
                          <Calendar className="w-3 h-3" />
                          {s.data_sessao.split('-').reverse().join('/')}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#2E3440] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#B48EAD] border border-[#B48EAD]/30">
                          {s.modalidade === 'online' ? (
                            <Video className="w-3 h-3" />
                          ) : (
                            <MapPin className="w-3 h-3" />
                          )}
                          {s.modalidade === 'online' ? 'Online' : 'Presencial'}
                        </span>
                        <strong className="text-xs text-[#ECEFF4]">{s.queixa_demanda}</strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoverSessao(s.id)}
                        className="rounded-lg p-1.5 text-[#BF616A] hover:bg-[#BF616A]/20 transition shrink-0"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-[#D8DEE9] leading-relaxed whitespace-pre-wrap">
                      {s.evolucao_clinica}
                    </p>

                    {s.observacoes_privadas && (
                      <div className="rounded-xl bg-[#2E3440] border border-[#B48EAD]/30 p-2.5 text-[11px] text-[#D8DEE9]/90">
                        <strong className="text-[#B48EAD] block text-[10px] uppercase tracking-wider mb-0.5">
                          Observações Sigilosas:
                        </strong>
                        {s.observacoes_privadas}
                      </div>
                    )}

                    {s.proximo_passo && (
                      <div className="text-[11px] text-[#88C0D0]">
                        <strong>Próximo passo:</strong> {s.proximo_passo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
