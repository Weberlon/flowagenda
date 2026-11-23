'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  type AnamnesePodologica,
  type FichaHistoricoItem,
  type RegiaoPodalEstado,
  type StatusRegiaoPodal,
} from '@/types/niche';
import {
  X,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Footprints,
  FileText,
  History,
  Plus,
  Trash2,
} from 'lucide-react';

interface FichaPodologicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  lojistaId: string;
  clienteId: string;
  clienteNome: string;
  onSaved?: () => void;
}

type AbaPodologia = 'mapeamento' | 'anamnese' | 'evolucao';

const STATUS_PODAL_OPTIONS: Array<{
  value: StatusRegiaoPodal;
  label: string;
  corTexto: string;
  bgClasse: string;
  bordaClasse: string;
}> = [
  {
    value: 'saudavel',
    label: 'Saudável',
    corTexto: 'text-[#ECEFF4]',
    bgClasse: 'bg-[#3B4252]',
    bordaClasse: 'border-[#4C566A]',
  },
  {
    value: 'onicocriptose',
    label: 'Unha Encravada (Onicocriptose)',
    corTexto: 'text-[#BF616A]',
    bgClasse: 'bg-[#BF616A]/20',
    bordaClasse: 'border-[#BF616A]',
  },
  {
    value: 'onicomicose',
    label: 'Micose (Onicomicose)',
    corTexto: 'text-[#EBCB8B]',
    bgClasse: 'bg-[#EBCB8B]/20',
    bordaClasse: 'border-[#EBCB8B]',
  },
  {
    value: 'ortese',
    label: 'Órtese Aplicada',
    corTexto: 'text-[#88C0D0]',
    bgClasse: 'bg-[#88C0D0]/20',
    bordaClasse: 'border-[#88C0D0]',
  },
  {
    value: 'calosidade',
    label: 'Calosidade / Hiperqueratose',
    corTexto: 'text-[#B48EAD]',
    bgClasse: 'bg-[#B48EAD]/20',
    bordaClasse: 'border-[#B48EAD]',
  },
  {
    value: 'atencao',
    label: 'Fissura / Atenção',
    corTexto: 'text-[#A3BE8C]',
    bgClasse: 'bg-[#A3BE8C]/20',
    bordaClasse: 'border-[#A3BE8C]',
  },
];

const REGIOES_BASE: Array<{ codigo: string; pe: 'direito' | 'esquerdo'; nomeRegiao: string }> = [
  { codigo: 'D_D1', pe: 'direito', nomeRegiao: '1º Pododáctilo (Hálux)' },
  { codigo: 'D_D2', pe: 'direito', nomeRegiao: '2º Pododáctilo' },
  { codigo: 'D_D3', pe: 'direito', nomeRegiao: '3º Pododáctilo' },
  { codigo: 'D_D4', pe: 'direito', nomeRegiao: '4º Pododáctilo' },
  { codigo: 'D_D5', pe: 'direito', nomeRegiao: '5º Pododáctilo' },
  { codigo: 'D_PLANTA', pe: 'direito', nomeRegiao: 'Região Plantar / Arco' },
  { codigo: 'D_CALCANEO', pe: 'direito', nomeRegiao: 'Calcâneo / Calcanhar' },
  { codigo: 'E_D1', pe: 'esquerdo', nomeRegiao: '1º Pododáctilo (Hálux)' },
  { codigo: 'E_D2', pe: 'esquerdo', nomeRegiao: '2º Pododáctilo' },
  { codigo: 'E_D3', pe: 'esquerdo', nomeRegiao: '3º Pododáctilo' },
  { codigo: 'E_D4', pe: 'esquerdo', nomeRegiao: '4º Pododáctilo' },
  { codigo: 'E_D5', pe: 'esquerdo', nomeRegiao: '5º Pododáctilo' },
  { codigo: 'E_PLANTA', pe: 'esquerdo', nomeRegiao: 'Região Plantar / Arco' },
  { codigo: 'E_CALCANEO', pe: 'esquerdo', nomeRegiao: 'Calcâneo / Calcanhar' },
];

export function FichaPodologicaModal({
  isOpen,
  onClose,
  lojistaId,
  clienteId,
  clienteNome,
  onSaved,
}: FichaPodologicaModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [aba, setAba] = useState<AbaPodologia>('mapeamento');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [regioes, setRegioes] = useState<Record<string, RegiaoPodalEstado>>({});
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<string>('D_D1');
  const [anamnese, setAnamnese] = useState<AnamnesePodologica>({
    peDiabetico: false,
    alteracaoVascular: false,
    usoAnticoagulante: false,
    alergias: '',
    tipoPisada: '',
    calcadoHabitual: '',
    alertaCritico: false,
  });
  const [historico, setHistorico] = useState<FichaHistoricoItem[]>([]);
  const [novoProcedimento, setNovoProcedimento] = useState('');
  const [retornoDias, setRetornoDias] = useState<number>(30);
  const [cuidadosDomiciliares, setCuidadosDomiciliares] = useState('');

  const carregarFicha = useCallback(async () => {
    if (!isOpen || !lojistaId || !clienteId) return;
    setCarregando(true);
    setErro(null);

    try {
      const { data, error } = await supabase
        .from('fichas_clinicas')
        .select('dados_json, observacoes_gerais')
        .eq('lojista_id', lojistaId)
        .eq('cliente_id', clienteId)
        .eq('tipo_ficha', 'ficha_podologica')
        .maybeSingle();

      if (error) {
        setErro('Não foi possível carregar a ficha podológica.');
        return;
      }

      if (data?.dados_json) {
        const dj = data.dados_json as any;
        setRegioes(dj.regioesPodais || {});
        setAnamnese({
          peDiabetico: Boolean(dj.anamnesePodologica?.peDiabetico),
          alteracaoVascular: Boolean(dj.anamnesePodologica?.alteracaoVascular),
          usoAnticoagulante: Boolean(dj.anamnesePodologica?.usoAnticoagulante),
          alergias: dj.anamnesePodologica?.alergias || '',
          tipoPisada: dj.anamnesePodologica?.tipoPisada || '',
          calcadoHabitual: dj.anamnesePodologica?.calcadoHabitual || '',
          alertaCritico: Boolean(dj.anamnesePodologica?.alertaCritico),
        });
        setHistorico(Array.isArray(dj.historico) ? dj.historico : []);
        setRetornoDias(Number(dj.retornoRecomendadoDias) || 30);
        setCuidadosDomiciliares(dj.cuidadosDomiciliares || data.observacoes_gerais || '');
      }
    } finally {
      setCarregando(false);
    }
  }, [clienteId, isOpen, lojistaId, supabase]);

  useEffect(() => {
    carregarFicha();
  }, [carregarFicha]);

  if (!isOpen) return null;

  const infoRegiaoAtual =
    REGIOES_BASE.find((r) => r.codigo === regiaoSelecionada) || REGIOES_BASE[0];
  const estadoAtual: RegiaoPodalEstado = regioes[regiaoSelecionada] || {
    codigo: infoRegiaoAtual.codigo,
    pe: infoRegiaoAtual.pe,
    nomeRegiao: infoRegiaoAtual.nomeRegiao,
    status: 'saudavel',
    observacao: '',
  };

  const atualizarRegiao = (patch: Partial<RegiaoPodalEstado>) => {
    setRegioes((prev) => ({
      ...prev,
      [regiaoSelecionada]: {
        ...estadoAtual,
        ...patch,
        atualizado_em: new Date().toISOString(),
      },
    }));
  };

  const adicionarEvolucao = () => {
    const texto = novoProcedimento.trim();
    if (!texto) return;
    setHistorico((prev) => [
      {
        id: `${Date.now()}`,
        data: new Date().toLocaleDateString('pt-BR'),
        resumo: texto,
      },
      ...prev,
    ]);
    setNovoProcedimento('');
  };

  const salvarFicha = async () => {
    setSalvando(true);
    setErro(null);
    setSucesso(null);

    try {
      const { error } = await supabase.from('fichas_clinicas').upsert(
        {
          lojista_id: lojistaId,
          cliente_id: clienteId,
          tipo_ficha: 'ficha_podologica',
          dados_json: {
            regioesPodais: regioes,
            anamnesePodologica: {
              ...anamnese,
              alertaCritico: Boolean(
                anamnese.alertaCritico || anamnese.peDiabetico || anamnese.usoAnticoagulante
              ),
            },
            historico,
            retornoRecomendadoDias: retornoDias,
            cuidadosDomiciliares,
          },
          observacoes_gerais: cuidadosDomiciliares || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lojista_id,cliente_id,tipo_ficha' }
      );

      if (error) {
        setErro(`Erro ao salvar ficha podológica: ${error.message}`);
        return;
      }

      setSucesso('Ficha podológica salva com sucesso.');
      onSaved?.();
    } finally {
      setSalvando(false);
    }
  };

  const renderPe = (pe: 'direito' | 'esquerdo', titulo: string) => {
    const lista = REGIOES_BASE.filter((r) => r.pe === pe);
    return (
      <div className="rounded-2xl border border-[#4C566A] bg-[#2E3440] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
            {titulo}
          </h3>
          <span className="text-[11px] font-mono text-[#D8DEE9]/60">
            {lista.filter((r) => (regioes[r.codigo]?.status || 'saudavel') !== 'saudavel').length}{' '}
            ocorrência(s)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {lista.map((reg) => {
            const st = regioes[reg.codigo]?.status || 'saudavel';
            const opt =
              STATUS_PODAL_OPTIONS.find((o) => o.value === st) || STATUS_PODAL_OPTIONS[0];
            const selecionada = regiaoSelecionada === reg.codigo;

            return (
              <button
                key={reg.codigo}
                type="button"
                onClick={() => setRegiaoSelecionada(reg.codigo)}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                  opt.bgClasse
                } ${opt.bordaClasse} ${
                  selecionada ? 'ring-2 ring-[#88C0D0]' : 'hover:opacity-90'
                }`}
              >
                <span className="font-semibold text-[#ECEFF4]">{reg.nomeRegiao}</span>
                <span className={`text-[10px] font-bold ${opt.corTexto}`}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha Podológica de ${clienteNome}`}
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[#4C566A] bg-[#2E3440] text-[#ECEFF4] shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 border-b border-[#4C566A] bg-[#3B4252] px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2E3440] border border-[#4C566A] text-[#88C0D0]">
              <Footprints className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold truncate">
                  Ficha Podológica — {clienteNome}
                </h2>
                {anamnese.peDiabetico && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#BF616A]/50 bg-[#BF616A]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#BF616A]">
                    <AlertTriangle className="h-3 w-3" />
                    Pé Diabético
                  </span>
                )}
              </div>
              <p className="text-xs text-[#D8DEE9]/70">
                Mapeamento podal, anamnese clínica, órteses e retorno programado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ficha podológica"
            className="rounded-xl border border-[#4C566A] bg-[#2E3440] p-2 text-[#D8DEE9] hover:bg-[#434C5E] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-2 border-b border-[#4C566A] bg-[#2E3440] px-6 py-3">
          {[
            { id: 'mapeamento', label: 'Mapeamento Podal', icon: Footprints },
            { id: 'anamnese', label: 'Anamnese & Pé Diabético', icon: FileText },
            { id: 'evolucao', label: 'Procedimentos & Retorno', icon: History },
          ].map((item) => {
            const Icon = item.icon;
            const ativa = aba === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setAba(item.id as AbaPodologia)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  ativa
                    ? 'bg-[#88C0D0] text-[#2E3440]'
                    : 'bg-[#3B4252] text-[#D8DEE9] hover:bg-[#434C5E]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {carregando ? (
            <div className="flex items-center justify-center py-12 text-sm text-[#88C0D0] gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando ficha podológica...</span>
            </div>
          ) : (
            <>
              {aba === 'mapeamento' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-4">{renderPe('direito', 'Pé Direito')}</div>
                  <div className="lg:col-span-4">{renderPe('esquerdo', 'Pé Esquerdo')}</div>

                  {/* Painel de Edição da Região Selecionada */}
                  <div className="lg:col-span-4 rounded-2xl border border-[#4C566A] bg-[#3B4252] p-4 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#88C0D0]">
                        {infoRegiaoAtual.pe === 'direito' ? 'Pé Direito' : 'Pé Esquerdo'}
                      </span>
                      <h4 className="text-sm font-bold text-[#ECEFF4] mt-0.5">
                        {infoRegiaoAtual.nomeRegiao}
                      </h4>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#D8DEE9]">
                        Condição Clínica
                      </label>
                      <select
                        value={estadoAtual.status}
                        onChange={(e) =>
                          atualizarRegiao({ status: e.target.value as StatusRegiaoPodal })
                        }
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4]"
                      >
                        {STATUS_PODAL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#D8DEE9]">
                        Anotação da Região
                      </label>
                      <textarea
                        rows={4}
                        value={estadoAtual.observacao || ''}
                        onChange={(e) => atualizarRegiao({ observacao: e.target.value })}
                        placeholder="Ex.: Espícula lateral removida, aplicada órtese fibra de memória..."
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] p-3 text-xs text-[#ECEFF4] placeholder-[#D8DEE9]/40"
                      />
                    </div>
                  </div>
                </div>
              )}

              {aba === 'anamnese' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-2xl border border-[#4C566A] bg-[#3B4252] p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#EBCB8B]">
                      Fatores de Risco & Atenção
                    </h3>

                    {[
                      {
                        key: 'peDiabetico' as const,
                        label: 'Paciente Diabético (Protocolo Pé Diabético)',
                      },
                      {
                        key: 'alteracaoVascular' as const,
                        label: 'Alteração Vascular / Neuropatia Periférica',
                      },
                      {
                        key: 'usoAnticoagulante' as const,
                        label: 'Uso contínuo de anticoagulantes',
                      },
                      {
                        key: 'alertaCritico' as const,
                        label: 'Sinalizar alerta clínico na pré-triagem',
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-2.5 rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2.5 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(anamnese[item.key])}
                          onChange={(e) =>
                            setAnamnese((prev) => ({
                              ...prev,
                              [item.key]: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 accent-[#88C0D0]"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[#4C566A] bg-[#3B4252] p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
                      Avaliação Complementar
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Alergias (látex, iodo, anestésicos, esmaltes)
                      </label>
                      <input
                        type="text"
                        value={anamnese.alergias || ''}
                        onChange={(e) =>
                          setAnamnese((prev) => ({ ...prev, alergias: e.target.value }))
                        }
                        placeholder="Ex.: Nenhuma relatada ou sensibilidade a iodo"
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Tipo de Pisada</label>
                      <select
                        value={anamnese.tipoPisada || ''}
                        onChange={(e) =>
                          setAnamnese((prev) => ({
                            ...prev,
                            tipoPisada: e.target.value as AnamnesePodologica['tipoPisada'],
                          }))
                        }
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4]"
                      >
                        <option value="">Não avaliada</option>
                        <option value="neutra">Neutra</option>
                        <option value="pronada">Pronada</option>
                        <option value="supinada">Supinada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Calçado Habitual
                      </label>
                      <input
                        type="text"
                        value={anamnese.calcadoHabitual || ''}
                        onChange={(e) =>
                          setAnamnese((prev) => ({ ...prev, calcadoHabitual: e.target.value }))
                        }
                        placeholder="Ex.: Bico fino, bota de trabalho, tênis esportivo"
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {aba === 'evolucao' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[#4C566A] bg-[#3B4252] p-4 space-y-2">
                      <label className="block text-xs font-bold text-[#88C0D0]">
                        Periodicidade Recomendada de Retorno
                      </label>
                      <select
                        value={retornoDias}
                        onChange={(e) => setRetornoDias(Number(e.target.value))}
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4]"
                      >
                        <option value={15}>A cada 15 dias (acompanhamento de órtese/curativo)</option>
                        <option value={30}>A cada 30 dias (podoprofilaxia mensal)</option>
                        <option value={45}>A cada 45 dias (manutenção preventiva)</option>
                      </select>
                    </div>

                    <div className="rounded-2xl border border-[#4C566A] bg-[#3B4252] p-4 space-y-2">
                      <label className="block text-xs font-bold text-[#88C0D0]">
                        Orientações Domiciliares
                      </label>
                      <input
                        type="text"
                        value={cuidadosDomiciliares}
                        onChange={(e) => setCuidadosDomiciliares(e.target.value)}
                        placeholder="Ex.: Secar entre os dedos, aplicar óleo antifúngico 2x ao dia..."
                        className="w-full rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4]"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#4C566A] bg-[#3B4252] p-4 space-y-3">
                    <label className="block text-xs font-bold text-[#ECEFF4]">
                      Registrar Procedimento / Evolução
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={novoProcedimento}
                        onChange={(e) => setNovoProcedimento(e.target.value)}
                        placeholder="Ex.: Podoprofilaxia completa + desbastamento plantar + alta frequência"
                        className="flex-1 rounded-xl border border-[#4C566A] bg-[#2E3440] px-3 py-2 text-xs text-[#ECEFF4]"
                      />
                      <button
                        type="button"
                        onClick={adicionarEvolucao}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#A3BE8C] px-4 py-2 text-xs font-bold text-[#2E3440] hover:bg-[#A3BE8C]/90 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    <div className="space-y-2 pt-2">
                      {historico.length === 0 ? (
                        <p className="text-xs text-[#D8DEE9]/60 italic">
                          Nenhum procedimento registrado nesta ficha ainda.
                        </p>
                      ) : (
                        historico.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#4C566A] bg-[#2E3440] px-3.5 py-2.5 text-xs"
                          >
                            <div>
                              <span className="font-mono text-[10px] text-[#88C0D0] mr-2">
                                {h.data}
                              </span>
                              <span>{h.resumo}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setHistorico((prev) => prev.filter((item) => item.id !== h.id))
                              }
                              aria-label="Remover registro"
                              className="text-[#BF616A] hover:opacity-80 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {erro && (
            <div className="rounded-xl border border-[#BF616A]/50 bg-[#BF616A]/15 px-4 py-2.5 text-xs text-[#BF616A]">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="flex items-center gap-2 rounded-xl border border-[#A3BE8C]/50 bg-[#A3BE8C]/15 px-4 py-2.5 text-xs text-[#A3BE8C]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{sucesso}</span>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-3 border-t border-[#4C566A] bg-[#3B4252] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#4C566A] bg-[#2E3440] px-4 py-2 text-xs font-semibold text-[#ECEFF4] hover:bg-[#434C5E] cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={salvarFicha}
            className="inline-flex items-center gap-2 rounded-xl bg-[#88C0D0] px-5 py-2 text-xs font-bold text-[#2E3440] hover:bg-[#88C0D0]/90 disabled:opacity-50 cursor-pointer"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{salvando ? 'Salvando...' : 'Salvar Ficha Podológica'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
