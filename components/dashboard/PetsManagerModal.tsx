'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Pet, EspeciePet, PortePet, DocilidadePet } from '@/types/niche';
import { X, Plus, Trash2, AlertTriangle, PawPrint, ShieldAlert, Loader2 } from 'lucide-react';

interface PetsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojistaId: string;
  clienteId: string;
  clienteNome: string;
}

const ESPECIE_OPTIONS: { value: EspeciePet; label: string }[] = [
  { value: 'cachorro', label: 'Cachorro' },
  { value: 'gato', label: 'Gato' },
  { value: 'ave', label: 'Ave' },
  { value: 'roedor', label: 'Roedor' },
  { value: 'outro', label: 'Outro' },
];

const PORTE_OPTIONS: { value: PortePet; label: string }[] = [
  { value: 'pequeno', label: 'Pequeno' },
  { value: 'medio', label: 'Médio' },
  { value: 'grande', label: 'Grande' },
  { value: 'gigante', label: 'Gigante' },
];

const DOCILIDADE_OPTIONS: { value: DocilidadePet; label: string }[] = [
  { value: 'docil', label: 'Dócil' },
  { value: 'agitado', label: 'Agitado' },
  { value: 'arisco', label: 'Arisco' },
  { value: 'morde', label: 'Morde / Reativo' },
];

export function PetsManagerModal({
  isOpen,
  onClose,
  lojistaId,
  clienteId,
  clienteNome,
}: PetsManagerModalProps) {
  const supabase = React.useMemo(() => createClient(), []);

  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Campos do formulário de criação
  const [nome, setNome] = useState('');
  const [especie, setEspecie] = useState<EspeciePet>('cachorro');
  const [raca, setRaca] = useState('');
  const [porte, setPorte] = useState<PortePet>('medio');
  const [pesoKg, setPesoKg] = useState('');
  const [docilidade, setDocilidade] = useState<DocilidadePet>('docil');
  const [alergiasObservacoes, setAlergiasObservacoes] = useState('');

  const fetchPets = useCallback(async () => {
    if (!lojistaId || !clienteId) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('lojista_id', lojistaId)
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMessage(`Erro ao carregar pets: ${error.message}`);
        setPets([]);
      } else {
        setPets((data || []) as Pet[]);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao buscar pets.');
    } finally {
      setLoading(false);
    }
  }, [supabase, lojistaId, clienteId]);

  useEffect(() => {
    if (isOpen) {
      fetchPets();
    }
  }, [isOpen, fetchPets]);

  const resetForm = () => {
    setNome('');
    setEspecie('cachorro');
    setRaca('');
    setPorte('medio');
    setPesoKg('');
    setDocilidade('docil');
    setAlergiasObservacoes('');
  };

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMessage('Informe o nome do pet.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const parsedPeso = pesoKg.trim() ? Number(pesoKg.replace(',', '.')) : null;
      const { data, error } = await supabase
        .from('pets')
        .insert({
          lojista_id: lojistaId,
          cliente_id: clienteId,
          nome: nome.trim(),
          especie,
          raca: raca.trim() || null,
          porte,
          peso_kg: parsedPeso !== null && !Number.isNaN(parsedPeso) ? parsedPeso : null,
          docilidade,
          alergias_observacoes: alergiasObservacoes.trim() || null,
        })
        .select('*')
        .single();

      if (error) {
        setErrorMessage(`Erro ao cadastrar pet: ${error.message}`);
        return;
      }

      if (data) {
        setPets((prev) => [data as Pet, ...prev]);
        resetForm();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar pet.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pet?')) return;

    setDeletingId(petId);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId)
        .eq('lojista_id', lojistaId);

      if (error) {
        setErrorMessage(`Erro ao excluir pet: ${error.message}`);
        return;
      }

      setPets((prev) => prev.filter((p) => p.id !== petId));
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao excluir pet.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-[#4C566A] bg-[#2E3440] text-[#ECEFF4] shadow-2xl overflow-hidden my-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#4C566A]/60 bg-[#3B4252]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#88C0D0]/15 border border-[#88C0D0]/30 flex items-center justify-center text-[#88C0D0]">
              <PawPrint className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#ECEFF4]">
                Pets de {clienteNome}
              </h2>
              <p className="text-xs text-[#D8DEE9]/70">
                Gerencie os animais vinculados a este tutor, porte e alertas de manejo.
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

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {errorMessage && (
            <div className="rounded-xl border border-[#BF616A]/60 bg-[#BF616A]/15 p-3 text-xs text-[#ECEFF4] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#BF616A] shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-[#D8DEE9]/70 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Lista de Pets Cadastrados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
                Pets Cadastrados ({pets.length})
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#88C0D0]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando pets...</span>
              </div>
            ) : pets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#4C566A] bg-[#3B4252]/40 p-6 text-center text-xs text-[#D8DEE9]/60">
                Nenhum pet cadastrado para este tutor ainda. Adicione o primeiro abaixo.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {pets.map((pet) => {
                  const isDocilidadeCritica = pet.docilidade === 'arisco' || pet.docilidade === 'morde';
                  const hasAlergia = Boolean(pet.alergias_observacoes?.trim());

                  return (
                    <div
                      key={pet.id}
                      className={`rounded-xl border p-4 bg-[#3B4252] transition ${
                        isDocilidadeCritica
                          ? 'border-[#BF616A]/70'
                          : hasAlergia
                            ? 'border-[#EBCB8B]/60'
                            : 'border-[#4C566A]/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[#ECEFF4]">
                              {pet.nome}
                            </span>
                            <span className="rounded-md bg-[#2E3440] border border-[#4C566A] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#88C0D0]">
                              {ESPECIE_OPTIONS.find((e) => e.value === pet.especie)?.label || pet.especie}
                            </span>
                            {pet.porte && (
                              <span className="rounded-md bg-[#434C5E] px-2 py-0.5 text-[10px] font-medium text-[#ECEFF4]">
                                Porte {PORTE_OPTIONS.find((p) => p.value === pet.porte)?.label || pet.porte}
                              </span>
                            )}
                            {pet.peso_kg !== null && (
                              <span className="rounded-md bg-[#2E3440] px-2 py-0.5 text-[10px] font-mono text-[#A3BE8C]">
                                {pet.peso_kg} kg
                              </span>
                            )}
                          </div>

                          {pet.raca && (
                            <p className="text-xs text-[#D8DEE9]/80">
                              Raça: <strong className="text-[#ECEFF4]">{pet.raca}</strong>
                            </p>
                          )}

                          {/* Badges e Alertas de Docilidade / Alergias */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {isDocilidadeCritica ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#BF616A]/20 border border-[#BF616A]/60 px-2.5 py-0.5 text-[10px] font-bold text-[#BF616A]">
                                <ShieldAlert className="w-3 h-3" />
                                Atenção: {pet.docilidade === 'morde' ? 'Morde / Reativo' : 'Arisco'}
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                                  pet.docilidade === 'agitado'
                                    ? 'bg-[#EBCB8B]/15 border-[#EBCB8B]/50 text-[#EBCB8B]'
                                    : 'bg-[#A3BE8C]/15 border-[#A3BE8C]/40 text-[#A3BE8C]'
                                }`}
                              >
                                Temperamento: {DOCILIDADE_OPTIONS.find((d) => d.value === pet.docilidade)?.label}
                              </span>
                            )}

                            {hasAlergia && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#EBCB8B]/20 border border-[#EBCB8B]/60 px-2.5 py-0.5 text-[10px] font-bold text-[#EBCB8B]">
                                <AlertTriangle className="w-3 h-3" />
                                Alergia / Restrição
                              </span>
                            )}
                          </div>

                          {hasAlergia && (
                            <div className="mt-2 rounded-lg bg-[#EBCB8B]/10 border border-[#EBCB8B]/40 p-2.5 text-xs text-[#EBCB8B]">
                              <strong className="block text-[10px] uppercase tracking-wider mb-0.5">
                                Alergias & Observações:
                              </strong>
                              <span className="text-[#ECEFF4]">{pet.alergias_observacoes}</span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={deletingId === pet.id}
                          onClick={() => handleDeletePet(pet.id)}
                          className="rounded-lg border border-[#BF616A]/40 bg-[#BF616A]/10 p-2 text-[#BF616A] hover:bg-[#BF616A] hover:text-[#ECEFF4] transition disabled:opacity-50"
                          title="Excluir pet"
                        >
                          {deletingId === pet.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Formulário de Novo Pet */}
          <form
            onSubmit={handleCreatePet}
            className="rounded-2xl border border-[#4C566A]/60 bg-[#3B4252] p-5 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-[#4C566A]/40 pb-2.5">
              <Plus className="w-4 h-4 text-[#88C0D0]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#ECEFF4]">
                Cadastrar Novo Pet
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                  Nome do Pet *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Thor, Mel, Luna"
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                  Espécie
                </label>
                <select
                  value={especie}
                  onChange={(e) => setEspecie(e.target.value as EspeciePet)}
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                >
                  {ESPECIE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                  Raça
                </label>
                <input
                  type="text"
                  value={raca}
                  onChange={(e) => setRaca(e.target.value)}
                  placeholder="Ex: Shih-tzu, SRD, Golden"
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                    Porte
                  </label>
                  <select
                    value={porte}
                    onChange={(e) => setPorte(e.target.value as PortePet)}
                    className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-2.5 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                  >
                    {PORTE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={pesoKg}
                    onChange={(e) => setPesoKg(e.target.value)}
                    placeholder="Ex: 8.5"
                    className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-2.5 py-2 text-xs text-[#ECEFF4] font-mono placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                  Docilidade / Temperamento
                </label>
                <select
                  value={docilidade}
                  onChange={(e) => setDocilidade(e.target.value as DocilidadePet)}
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none"
                >
                  {DOCILIDADE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-[#D8DEE9] block mb-1">
                  Alergias e Observações de Manejo
                </label>
                <textarea
                  rows={2}
                  value={alergiasObservacoes}
                  onChange={(e) => setAlergiasObservacoes(e.target.value)}
                  placeholder="Ex: Alergia a shampoo com perfume, sensível ao secador, usa focinheira..."
                  className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#88C0D0] hover:bg-[#88C0D0]/90 px-4 py-2.5 text-xs font-bold text-[#2E3440] transition disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Salvar Pet</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
