'use client';

import React, { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { 
  buscarHorariosDisponiveisBookingLockAction, 
  createBookingReservation, 
  validarPinBookingAction, 
  verificarStatusAgendamentoAction,
  SlotDisponivel 
} from '@/app/actions/booking-lock';

interface Servico {
  id: string;
  nome_servico: string;
  duracao_minutos: number;
  intervalo_minutos?: number;
  preco: number;
  exige_sinal?: boolean;
  valor_sinal?: number;
}

interface Profissional {
  id: string;
  nome: string;
  foto_url?: string | null;
  bio?: string | null;
  ativo: boolean;
}

interface Lojista {
  id: string;
  nome_estabelecimento: string;
  whatsapp_notificacao?: string | null;
  cor_primaria?: string | null;
  logo_url?: string | null;
}

interface AgendamentoClientProps {
  lojista: Lojista;
  servicos: Servico[];
  profissionais: Profissional[];
}

type BookingStep = 
  | 'servico' 
  | 'profissional' 
  | 'data_hora' 
  | 'identificacao' 
  | 'checkout_pix' 
  | 'lock_pin' 
  | 'sucesso';

export default function AgendamentoClient({
  lojista,
  servicos,
  profissionais,
}: AgendamentoClientProps) {
  const [step, setStep] = useState<BookingStep>('servico');

  // Seleções do Fluxo
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  const [isQualquerProfissional, setIsQualquerProfissional] = useState(true);

  // Data e Horários
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [horarios, setHorarios] = useState<SlotDisponivel[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [selectedHorario, setSelectedHorario] = useState<SlotDisponivel | null>(null);

  // Identificação do Cliente
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  // Lock Provisório & Temporizadores
  const [reservaId, setReservaId] = useState<string>('');
  const [lockExpires, setLockExpires] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('10:00');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado Rota PIN (Sem Sinal)
  const [pin, setPin] = useState('');

  // Estado Rota Pix (Com Sinal Asaas)
  const [pixQrCode, setPixQrCode] = useState<string>('');
  const [pixCopiaECola, setPixCopiaECola] = useState<string>('');
  const [copiadoPix, setCopiadoPix] = useState(false);

  const [isPendingReserve, startTransitionReserve] = useTransition();
  const [isPendingPin, startTransitionPin] = useTransition();

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Gerar os próximos 14 dias no calendário
  const diasDisponiveis = React.useMemo(() => {
    const list = [];
    const hoje = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(hoje.getDate() + i);
      list.push({
        iso: d.toISOString().split('T')[0],
        diaSemana: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        diaNumero: d.getDate(),
        mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      });
    }
    return list;
  }, []);

  // Buscar horários sempre que data, serviço ou profissional mudar
  useEffect(() => {
    if (step === 'data_hora' && selectedServico && selectedDate) {
      setLoadingHorarios(true);
      setErrorMessage(null);

      const profId = isQualquerProfissional ? 'qualquer' : selectedProfissional?.id;

      buscarHorariosDisponiveisBookingLockAction(lojista.id, selectedServico.id, selectedDate, profId)
        .then((res) => {
          setHorarios(res);
          setSelectedHorario(null);
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Erro ao buscar horários disponíveis.';
          setErrorMessage(msg);
          setHorarios([]);
        })
        .finally(() => setLoadingHorarios(false));
    }
  }, [selectedDate, step, selectedServico, selectedProfissional, isQualquerProfissional, lojista.id]);

  // Cronômetro decrescente do Lock (10 min no PIN / 13 min no Pix)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if ((step === 'lock_pin' || step === 'checkout_pix') && lockExpires) {
      interval = setInterval(() => {
        const diff = lockExpires.getTime() - Date.now();
        if (diff <= 0) {
          clearInterval(interval);
          alert('O tempo limite de reserva expirou. Por favor, escolha um novo horário.');
          setStep('data_hora');
        } else {
          const m = Math.floor(diff / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, lockExpires]);

  // Polling de pagamento Pix (monitora transição para confirmado pelo webhook)
  useEffect(() => {
    if (step === 'checkout_pix' && reservaId) {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await verificarStatusAgendamentoAction(reservaId);
          if (res.status === 'confirmado') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStep('sucesso');
          }
        } catch {
          // Ignora falhas esporádicas no polling
        }
      }, 4000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [step, reservaId]);

  // Submeter Reserva e Criar Lock
  const handleIniciarReserva = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHorario || !selectedServico) return;
    setErrorMessage(null);

    const cleanTelefone = telefone.replace(/\D/g, '');
    if (cleanTelefone.length < 10) {
      setErrorMessage('Informe o telefone WhatsApp com DDD.');
      return;
    }

    startTransitionReserve(async () => {
      try {
        const profId = isQualquerProfissional
          ? 'qualquer'
          : selectedProfissional?.id || selectedHorario.profissionalId;

        const res = await createBookingReservation({
          lojista_id: lojista.id,
          servico_id: selectedServico.id,
          profissional_id: profId,
          data_horario: selectedHorario.inicio,
          cliente_nome: nome.trim(),
          cliente_telefone: cleanTelefone,
        });

        if (!res.success) {
          setErrorMessage(res.error);
          return;
        }

        setReservaId(res.agendamentoId);

        if (res.mode === 'pix') {
          setPixQrCode(res.qrCode);
          setPixCopiaECola(res.copiaECola);
          setLockExpires(new Date(Date.now() + 13 * 60 * 1000));
          setStep('checkout_pix');
        } else {
          setLockExpires(new Date(Date.now() + 10 * 60 * 1000));
          setStep('lock_pin');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao processar reserva.';
        setErrorMessage(msg);
      }
    });
  };

  // Validar PIN de confirmação
  const handleConfirmarPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransitionPin(async () => {
      try {
        const res = await validarPinBookingAction(reservaId, pin, telefone, lojista.id);
        if (res.success) {
          setStep('sucesso');
        } else {
          setErrorMessage(res.error || 'Não foi possível confirmar seu agendamento. Tente novamente.');
        }
      } catch (err: unknown) {
        setErrorMessage('Não foi possível confirmar seu agendamento. Tente novamente.');
      }
    });
  };

  // Copiar código Copia e Cola
  const handleCopiarPix = async () => {
    try {
      await navigator.clipboard.writeText(pixCopiaECola);
      setCopiadoPix(true);
      setTimeout(() => setCopiadoPix(false), 3000);
    } catch {
      // Fallback manual
      setCopiadoPix(true);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl bg-[#2E3440] border border-[#3B4252] p-6 sm:p-8 text-[#ECEFF4] shadow-2xl">
      {/* MENSAGEM DE ERRO */}
      {errorMessage && (
        <div className="mb-6 rounded-2xl bg-[#BF616A]/20 border border-[#BF616A]/50 p-4 text-xs font-medium text-[#ECEFF4] flex items-start gap-2.5">
          <span className="text-base text-[#BF616A] leading-none">⚠️</span>
          <span className="flex-1 leading-relaxed">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-[#D8DEE9]/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* PASSO 1: SELEÇÃO DE SERVIÇO                          */}
      {/* ==================================================== */}
      {step === 'servico' && (
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B4252] text-[#88C0D0] text-xs font-semibold uppercase tracking-wider mb-2">
              Passo 1 de 4
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Escolha o serviço
            </h2>
            <p className="text-xs text-[#D8DEE9]/70 mt-1">
              Escolha o atendimento desejado no {lojista.nome_estabelecimento}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {servicos.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedServico(s);
                  // Se houver mais de 1 profissional, abre etapa de seleção; senão vai para data
                  if (profissionais && profissionais.length > 1) {
                    setStep('profissional');
                  } else {
                    setIsQualquerProfissional(true);
                    if (profissionais.length === 1) setSelectedProfissional(profissionais[0]);
                    setStep('data_hora');
                  }
                }}
                className="text-left rounded-2xl border border-[#434C5E] bg-[#242933] p-4 hover:border-[#88C0D0] hover:bg-[#3B4252]/40 transition-all group flex flex-col justify-between shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-[#ECEFF4] group-hover:text-[#88C0D0] transition-colors">
                      {s.nome_servico}
                    </h3>
                    <span className="text-sm font-black text-[#A3BE8C] font-mono whitespace-nowrap">
                      R$ {Number(s.preco).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-[#81A1C1]">
                    <span>⏱️ {s.duracao_minutos} min</span>
                    {s.intervalo_minutos && s.intervalo_minutos > 0 ? (
                      <span className="text-[#D8DEE9]/50">• +{s.intervalo_minutos}m buffer</span>
                    ) : null}
                  </div>
                </div>

                {s.exige_sinal && s.valor_sinal && Number(s.valor_sinal) > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#3B4252] flex items-center justify-between text-[10px]">
                    <span className="text-[#EBCB8B] font-bold">⭐ Exige Sinal Pix</span>
                    <span className="text-[#ECEFF4] font-mono">
                      R$ {Number(s.valor_sinal).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PASSO 2: SELEÇÃO DE PROFISSIONAL                     */}
      {/* ==================================================== */}
      {step === 'profissional' && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setStep('servico')}
            className="text-xs font-semibold text-[#81A1C1] hover:text-[#88C0D0] flex items-center gap-1.5 transition-colors"
          >
            ← Trocar de Serviço
          </button>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B4252] text-[#88C0D0] text-xs font-semibold uppercase tracking-wider mb-2">
              Passo 2 de 4
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Selecione o profissional
            </h2>
            <p className="text-xs text-[#D8DEE9]/70 mt-1">
              {selectedServico?.nome_servico} • R$ {Number(selectedServico?.preco).toFixed(2).replace('.', ',')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Opção Qualquer Profissional */}
            <button
              type="button"
              onClick={() => {
                setIsQualquerProfissional(true);
                setSelectedProfissional(null);
                setStep('data_hora');
              }}
              className="text-left rounded-2xl border-2 border-dashed border-[#88C0D0]/60 bg-[#242933] p-4 hover:border-[#88C0D0] hover:bg-[#3B4252]/40 transition-all flex items-center gap-3.5 sm:col-span-2 group"
            >
              <div className="w-12 h-12 rounded-full bg-[#88C0D0]/20 text-[#88C0D0] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
                👥
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white group-hover:text-[#88C0D0] transition-colors">
                    Qualquer Profissional Disponível
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C]">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-[#D8DEE9]/70 mt-0.5">
                  Maior quantidade de horários livres e atendimento mais rápido.
                </p>
              </div>
            </button>

            {/* Profissionais Nominais */}
            {profissionais.map((prof) => (
              <button
                key={prof.id}
                type="button"
                onClick={() => {
                  setIsQualquerProfissional(false);
                  setSelectedProfissional(prof);
                  setStep('data_hora');
                }}
                className="text-left rounded-2xl border border-[#434C5E] bg-[#242933] p-4 hover:border-[#88C0D0] hover:bg-[#3B4252]/40 transition-all flex items-center gap-3.5 group shadow-md"
              >
                {prof.foto_url ? (
                  <img
                    src={prof.foto_url}
                    alt={prof.nome}
                    className="w-12 h-12 rounded-full object-cover border border-[#4C566A]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#5E81AC] text-white flex items-center justify-center font-bold text-base shadow-inner">
                    {prof.nome.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm text-[#ECEFF4] group-hover:text-[#88C0D0] transition-colors">
                    {prof.nome}
                  </h3>
                  {prof.bio && (
                    <p className="text-[11px] text-[#D8DEE9]/60 line-clamp-1 mt-0.5">
                      {prof.bio}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PASSO 3: ESCOLHA DE DATA E HORÁRIO                   */}
      {/* ==================================================== */}
      {step === 'data_hora' && (
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => {
              if (profissionais && profissionais.length > 1) {
                setStep('profissional');
              } else {
                setStep('servico');
              }
            }}
            className="text-xs font-semibold text-[#81A1C1] hover:text-[#88C0D0] flex items-center gap-1.5 transition-colors"
          >
            ← Voltar
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B4252] text-[#88C0D0] text-xs font-semibold uppercase tracking-wider mb-2">
                Passo 3 de 4
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Escolha o melhor dia e horário
              </h2>
              <p className="text-xs text-[#D8DEE9]/70 mt-0.5">
                {selectedServico?.nome_servico} • {isQualquerProfissional ? 'Qualquer Profissional' : selectedProfissional?.nome}
              </p>
            </div>
            <div className="text-lg font-black text-[#A3BE8C] font-mono">
              R$ {Number(selectedServico?.preco).toFixed(2).replace('.', ',')}
            </div>
          </div>

          {/* Carrossel de Datas Próximas */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]/70 mb-2 block">
              Próximos Dias
            </label>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {diasDisponiveis.map((d) => {
                const isSelected = selectedDate === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setSelectedDate(d.iso)}
                    className={`shrink-0 flex flex-col items-center justify-center h-20 w-16 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-[#88C0D0] bg-[#5E81AC] text-white shadow-lg scale-102'
                        : 'border-[#434C5E] text-[#D8DEE9] bg-[#242933] hover:bg-[#3B4252]'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">{d.diaSemana}</span>
                    <span className="text-xl font-black leading-tight my-0.5">{d.diaNumero}</span>
                    <span className="text-[9px] uppercase opacity-75">{d.mes}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grade de Horários */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#D8DEE9]/70 block">
              Horários Livres
            </label>

            {loadingHorarios && (
              <div className="py-12 text-center text-xs text-[#88C0D0] animate-pulse">
                Consultando grade de atendimento em tempo real...
              </div>
            )}

            {!loadingHorarios && horarios.length === 0 && (
              <div className="rounded-2xl border border-[#434C5E] bg-[#242933] p-8 text-center text-xs text-[#D8DEE9]/50">
                Não há horários disponíveis para esta data. Por favor, escolha outro dia acima.
              </div>
            )}

            {!loadingHorarios && horarios.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {horarios.map((slot) => {
                  const isSelected = selectedHorario?.inicio === slot.inicio;
                  return (
                    <button
                      key={slot.inicio}
                      type="button"
                      onClick={() => setSelectedHorario(slot)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all font-mono ${
                        isSelected
                          ? 'border-[#A3BE8C] bg-[#A3BE8C] text-[#242933] shadow-md scale-105'
                          : 'border-[#434C5E] bg-[#242933] text-[#ECEFF4] hover:border-[#88C0D0] hover:bg-[#3B4252]'
                      }`}
                    >
                      {slot.horaFormatada}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedHorario && (
            <div className="pt-4 border-t border-[#3B4252] flex items-center justify-between">
              <span className="text-xs text-[#D8DEE9]/80">
                Horário selecionado: <strong className="text-white font-mono">{selectedHorario.horaFormatada}</strong>
              </span>
              <button
                type="button"
                onClick={() => setStep('identificacao')}
                className="px-6 py-2.5 rounded-xl bg-[#88C0D0] text-[#242933] text-xs font-black hover:bg-[#9cd4e4] transition shadow-md"
              >
                Prosseguir →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* PASSO 4: IDENTIFICAÇÃO E CONFIRMAÇÃO                 */}
      {/* ==================================================== */}
      {step === 'identificacao' && (
        <form onSubmit={handleIniciarReserva} className="space-y-6">
          <button
            type="button"
            onClick={() => setStep('data_hora')}
            className="text-xs font-semibold text-[#81A1C1] hover:text-[#88C0D0] flex items-center gap-1.5 transition-colors"
          >
            ← Voltar para Horários
          </button>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B4252] text-[#88C0D0] text-xs font-semibold uppercase tracking-wider mb-2">
              Passo 4 de 4
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Seus Dados de Contato
            </h2>
            <p className="text-xs text-[#D8DEE9]/70 mt-1">
              Informe seu WhatsApp para receber a confirmação e lembretes do agendamento.
            </p>
          </div>

          {/* Resumo Card */}
          <div className="p-4 rounded-2xl bg-[#242933] border border-[#434C5E] space-y-2 text-xs">
            <div className="flex justify-between items-center text-[#D8DEE9]">
              <span>Serviço:</span>
              <strong className="text-white">{selectedServico?.nome_servico}</strong>
            </div>
            <div className="flex justify-between items-center text-[#D8DEE9]">
              <span>Profissional:</span>
              <strong className="text-white">
                {isQualquerProfissional ? 'Qualquer Disponível' : selectedProfissional?.nome}
              </strong>
            </div>
            <div className="flex justify-between items-center text-[#D8DEE9]">
              <span>Data e Horário:</span>
              <strong className="text-[#88C0D0] font-mono">
                {selectedDate.split('-').reverse().join('/')} às {selectedHorario?.horaFormatada}
              </strong>
            </div>
            <div className="flex justify-between items-center text-[#D8DEE9] pt-2 border-t border-[#3B4252]">
              <span>Valor Total:</span>
              <strong className="text-[#A3BE8C] font-mono text-sm">
                R$ {Number(selectedServico?.preco).toFixed(2).replace('.', ',')}
              </strong>
            </div>
            {selectedServico?.exige_sinal && Number(selectedServico.valor_sinal) > 0 && (
              <div className="flex justify-between items-center text-[#EBCB8B] font-bold">
                <span>Sinal Necessário (Pix):</span>
                <span className="font-mono">
                  R$ {Number(selectedServico.valor_sinal).toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#D8DEE9] block mb-1.5 uppercase tracking-wider">
                Seu Nome Completo *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Oliveira"
                className="w-full rounded-xl border border-[#4C566A] bg-[#242933] p-3 text-xs text-[#ECEFF4] placeholder-[#81A1C1] focus:outline-none focus:border-[#88C0D0]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#D8DEE9] block mb-1.5 uppercase tracking-wider">
                WhatsApp com DDD *
              </label>
              <input
                type="tel"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))}
                placeholder="DDD + Celular (ex: 31 99999-8888)"
                className="w-full rounded-xl border border-[#4C566A] bg-[#242933] p-3 text-xs text-[#ECEFF4] font-mono placeholder-[#81A1C1] focus:outline-none focus:border-[#88C0D0]"
              />
              <span className="text-[11px] text-[#81A1C1] mt-1 block">
                {selectedServico?.exige_sinal && Number(selectedServico.valor_sinal) > 0
                  ? 'Você pagará o sinal via Pix na próxima tela para garantir a vaga.'
                  : 'Enviaremos um código PIN de 6 dígitos no WhatsApp para travar seu horário.'}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPendingReserve}
            className="w-full py-3.5 rounded-2xl bg-[#88C0D0] text-[#242933] font-black text-xs uppercase tracking-wider hover:bg-[#9cd4e4] disabled:opacity-50 transition shadow-xl"
          >
            {isPendingReserve
              ? 'Processando Trava de Horário...'
              : selectedServico?.exige_sinal && Number(selectedServico.valor_sinal) > 0
              ? 'Garantir Horário com Sinal Pix'
              : 'Garantir Horário (Lock 10 min)'}
          </button>
        </form>
      )}

      {/* ==================================================== */}
      {/* PASSO 5A: CHECKOUT PIX (COM SINAL ASAAS)             */}
      {/* ==================================================== */}
      {step === 'checkout_pix' && (
        <div className="space-y-6 text-center">
          <div className="bg-[#EBCB8B]/10 border border-[#EBCB8B]/30 rounded-3xl p-6 space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EBCB8B]/20 px-3 py-1 text-xs font-semibold text-[#EBCB8B] border border-[#EBCB8B]/40">
              <span className="h-2 w-2 rounded-full bg-[#EBCB8B] animate-ping" />
              Horário Travado no Pix
            </span>

            <h2 className="text-xl font-bold text-white pt-2">
              Pague o Sinal via Pix para Confirmar
            </h2>

            <p className="text-xs text-[#D8DEE9]">
              Seu horário está bloqueado temporariamente. O pagamento deve ser concluído em:
            </p>

            <div className="text-4xl font-black text-[#EBCB8B] tabular-nums font-mono py-1">
              {timeLeft}
            </div>

            <p className="text-xs text-[#D8DEE9]/70">
              Assim que o Pix for compensado, sua reserva será confirmada automaticamente.
            </p>
          </div>

          {/* QR Code Pix */}
          {pixQrCode && (
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl max-w-xs mx-auto shadow-xl">
              <img
                src={`data:image/png;base64,${pixQrCode}`}
                alt="QR Code Pix"
                className="w-48 h-48 object-contain"
              />
              <span className="text-[10px] text-slate-600 font-bold mt-2">
                Abra o app do seu banco e aponte a câmera
              </span>
            </div>
          )}

          {/* Código Copia e Cola */}
          {pixCopiaECola && (
            <div className="space-y-2 max-w-md mx-auto text-left">
              <label className="text-xs font-bold text-[#D8DEE9] block text-center uppercase tracking-wider">
                Ou use o Pix Copia e Cola
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixCopiaECola}
                  className="flex-1 px-3 py-2 bg-[#242933] border border-[#4C566A] rounded-xl text-xs text-[#ECEFF4] font-mono truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopiarPix}
                  className="px-4 py-2 bg-[#88C0D0] text-[#242933] text-xs font-black rounded-xl hover:bg-[#9cd4e4] transition whitespace-nowrap"
                >
                  {copiadoPix ? '✓ Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          <div className="text-xs text-[#81A1C1] animate-pulse">
            Aguardando compensação do banco... A tela avançará automaticamente.
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PASSO 5B: CONFIRMAÇÃO POR PIN (SEM SINAL)            */}
      {/* ==================================================== */}
      {step === 'lock_pin' && (
        <form onSubmit={handleConfirmarPin} className="space-y-6 text-center">
          <div className="bg-[#5E81AC]/15 border border-[#5E81AC]/30 rounded-3xl p-6 space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5E81AC]/25 px-3 py-1 text-xs font-semibold text-[#88C0D0] border border-[#88C0D0]/40">
              <span className="h-2 w-2 rounded-full bg-[#88C0D0] animate-ping" />
              Horário Bloqueado para Você
            </span>

            <h2 className="text-xl font-bold text-white pt-2">
              Confirme seu Agendamento
            </h2>

            <p className="text-xs text-[#D8DEE9]">
              O horário permanecerá reservado exclusivamente para você durante:
            </p>

            <div className="text-4xl font-black text-[#88C0D0] tabular-nums font-mono py-1">
              {timeLeft}
            </div>

            <p className="text-xs text-[#D8DEE9]/70">
              Enviamos um código PIN de 6 dígitos no seu WhatsApp.
            </p>
          </div>

          <div className="space-y-2 max-w-xs mx-auto text-left">
            <label className="text-xs font-bold text-[#D8DEE9] block text-center uppercase tracking-wider">
              Digite o Código PIN
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full rounded-2xl border border-[#4C566A] bg-[#242933] p-3 text-center tracking-widest font-mono font-bold text-2xl text-white focus:border-[#88C0D0] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPendingPin || pin.length < 6}
            className="w-full py-3.5 rounded-2xl bg-[#A3BE8C] text-[#242933] text-xs font-black uppercase tracking-wider hover:bg-[#b0c89a] disabled:opacity-50 transition shadow-xl"
          >
            {isPendingPin ? 'Validando PIN...' : 'Confirmar e Finalizar Agendamento'}
          </button>
        </form>
      )}

      {/* ==================================================== */}
      {/* PASSO 6: CONFIRMAÇÃO DE SUCESSO                      */}
      {/* ==================================================== */}
      {step === 'sucesso' && (
        <div className="text-center py-8 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#A3BE8C]/20 border border-[#A3BE8C]/40 text-[#A3BE8C] text-2xl shadow-xl">
            ✓
          </div>

          <h2 className="text-2xl font-black text-white">Agendamento Confirmado!</h2>

          <p className="text-xs text-[#D8DEE9]/80 max-w-md mx-auto leading-relaxed">
            Perfeito, <strong className="text-white">{nome}</strong>! Sua reserva no{' '}
            <strong className="text-white">{lojista.nome_estabelecimento}</strong> está garantida
            para o dia{' '}
            <strong className="text-[#88C0D0] font-mono">
              {selectedDate.split('-').reverse().join('/')}
            </strong>{' '}
            às{' '}
            <strong className="text-[#88C0D0] font-mono">
              {selectedHorario?.horaFormatada}
            </strong>.
          </p>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-[#3B4252] text-[#ECEFF4] hover:bg-[#434C5E] text-xs font-bold transition border border-[#4C566A]"
            >
              Novo Agendamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
