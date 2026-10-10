'use client';

import { useState, useEffect, useTransition } from 'react';
import { 
  buscarHorariosDisponiveisAction, 
  reservarHorarioComLockAction, 
  validarPinEConfirmarAction 
} from '@/app/actions/agendamento';

interface Servico {
  id: string;
  nome_servico: string;
  duracao_minutos: number;
  preco: number;
}

interface Lojista {
  id: string;
  nome_estabelecimento: string;
  whatsapp_notificacao?: string | null;
  cor_primaria?: string | null;
  logo_url?: string | null;
}

export default function AgendamentoClient({ 
  lojista, 
  servicos 
}: { 
  lojista: Lojista; 
  servicos: Servico[];
}) {
  const [step, setStep] = useState<'servico' | 'data_hora' | 'identificacao' | 'lock_pin' | 'sucesso'>('servico');
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  
  // Data e Horários
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [selectedHorario, setSelectedHorario] = useState<any>(null);

  // Identificação do Cliente
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  // Lock & Validação PIN
  const [reservaId, setReservaId] = useState<string>('');
  const [lockExpires, setLockExpires] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('10:00');
  const [pin, setPin] = useState('');
  const [telefoneMascarado, setTelefoneMascarado] = useState('');
  const [pinSimulado, setPinSimulado] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPendingReserve, startTransitionReserve] = useTransition();
  const [isPendingPin, startTransitionPin] = useTransition();

  // Gerar os próximos 14 dias com dia da semana amigável
  const diasDisponiveis = [];
  const hoje = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(hoje.getDate() + i);
    diasDisponiveis.push({
      iso: d.toISOString().split('T')[0],
      diaSemana: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      diaNumero: d.getDate(),
      mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    });
  }

  // Buscar horários sempre que alterar a data ou o serviço selecionado
  useEffect(() => {
    if ((step === 'data_hora' || step === 'identificacao') && selectedServico && selectedDate) {
      setLoadingHorarios(true);
      setErrorMessage(null);
      buscarHorariosDisponiveisAction(lojista.id, selectedServico.id, selectedDate)
        .then((res) => {
          setHorarios(res);
          setSelectedHorario(null);
        })
        .catch((err) => setErrorMessage(err.message))
        .finally(() => setLoadingHorarios(false));
    }
  }, [selectedDate, step, selectedServico, lojista.id]);

  // Cronômetro decrescente para o Lock de 10 minutos
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'lock_pin' && lockExpires) {
      interval = setInterval(() => {
        const diff = lockExpires.getTime() - new Date().getTime();
        if (diff <= 0) {
          clearInterval(interval);
          alert('O tempo limite de 10 minutos expirou. O horário foi liberado.');
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

  const handleIniciarReserva = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHorario || !selectedServico) return;
    setErrorMessage(null);

    startTransitionReserve(async () => {
      try {
        const res = await reservarHorarioComLockAction(
          lojista.id,
          selectedServico.id,
          selectedHorario.inicio,
          selectedHorario.fim,
          nome,
          telefone
        );

        setReservaId(res.reservaId);
        setLockExpires(new Date(res.expiracaoIso));
        setTelefoneMascarado(res.telefoneMascarado);
        setPinSimulado(res.pinSimulado);
        setStep('lock_pin');
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao reservar horário.');
      }
    });
  };

  const handleConfirmarPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransitionPin(async () => {
      try {
        await validarPinEConfirmarAction(reservaId, pin, lojista.id);
        setStep('sucesso');
      } catch (err: any) {
        setErrorMessage(err.message || 'Erro ao validar PIN.');
      }
    });
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
      
      {errorMessage && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200 text-xs font-medium text-red-800 flex items-start gap-2">
          <svg className="h-4 w-4 shrink-0 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Passo 1: Serviços */}
      {step === 'servico' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Selecione o Serviço</h2>
            <p className="text-sm text-slate-500 mt-1">Escolha o atendimento desejado para prosseguir.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {servicos.map((s) => (
              <div 
                key={s.id}
                onClick={() => { 
                  setSelectedServico(s); 
                  setStep('data_hora'); 
                }}
                className="cursor-pointer rounded-xl border border-slate-200 p-4 transition-all hover:border-slate-900 hover:shadow-md flex justify-between items-center bg-white group"
              >
                <div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-slate-950">{s.nome_servico}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{s.duracao_minutos} minutos</p>
                </div>
                <div className="font-bold tabular-nums text-slate-900 text-sm">
                  R$ {s.preco.toFixed(2).replace('.', ',')}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="bg-slate-50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="font-medium text-slate-900 text-sm">Tem alguma dúvida?</h4>
                <p className="text-xs text-slate-500">Fale diretamente com nossa recepção no WhatsApp.</p>
              </div>
              <a 
                href={`https://wa.me/${lojista.whatsapp_notificacao || ''}?text=${encodeURIComponent('Olá, tenho uma dúvida antes de agendar. Pode me ajudar?')}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
              >
                Falar com Atendimento
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Passo 2: Data e Hora */}
      {step === 'data_hora' && (
        <div className="space-y-6">
          <button 
            type="button"
            onClick={() => setStep('servico')} 
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            &larr; Trocar de Serviço
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Escolha a Data e Horário</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedServico?.nome_servico} • {selectedServico?.duracao_minutos} minutos
              </p>
            </div>
            <div className="text-sm font-bold text-slate-900">
              R$ {selectedServico?.preco.toFixed(2).replace('.', ',')}
            </div>
          </div>

          {/* Seletor de Datas */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">Datas Próximas</label>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
              {diasDisponiveis.map((d) => {
                const isSelected = selectedDate === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setSelectedDate(d.iso)}
                    className={`shrink-0 flex flex-col items-center justify-center h-18 w-16 rounded-xl border transition-all ${
                      isSelected 
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm' 
                        : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase">{d.diaSemana}</span>
                    <span className="text-lg font-bold leading-tight my-0.5">{d.diaNumero}</span>
                    <span className="text-[9px] uppercase opacity-75">{d.mes}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grade de Horários */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-2 block">Horários Disponíveis</label>
            {loadingHorarios ? (
              <div className="h-24 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full" />
              </div>
            ) : horarios.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                Nenhum horário disponível para esta data. Selecione outro dia acima.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {horarios.map((h) => {
                  const isSelected = selectedHorario?.inicio === h.inicio;
                  return (
                    <button
                      key={h.inicio}
                      type="button"
                      onClick={() => setSelectedHorario(h)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 text-slate-800 bg-white hover:border-slate-400'
                      }`}
                    >
                      {h.horaFormatada}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedHorario && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="button"
                onClick={() => setStep('identificacao')}
                className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm"
              >
                Avançar com horário das {selectedHorario.horaFormatada} &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Passo 3: Identificação do Cliente */}
      {step === 'identificacao' && (
        <form onSubmit={handleIniciarReserva} className="space-y-6">
          <button 
            type="button"
            onClick={() => setStep('data_hora')} 
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            &larr; Voltar para Horários
          </button>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Seus Dados de Contato</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enviaremos um código PIN de confirmação para o seu WhatsApp.
            </p>
          </div>

          {/* Resumo do Horário Selecionado */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1">
            <p className="text-xs font-semibold text-slate-800">
              {selectedServico?.nome_servico}
            </p>
            <p className="text-xs text-slate-500">
              📅 {selectedDate.split('-').reverse().join('/')} às {selectedHorario?.horaFormatada}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Seu Nome Completo</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Pedro Henrique"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">WhatsApp (com DDD)</label>
              <input
                type="text"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: 11999998888"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <span className="text-[11px] text-slate-400 block">
                Você receberá uma mensagem com o código PIN de 6 dígitos.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPendingReserve}
            className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition shadow-sm"
          >
            {isPendingReserve ? 'Reservando Horário e Enviando PIN...' : 'Garantir Horário (Lock 10 min)'}
          </button>
        </form>
      )}

      {/* Passo 4: Lock de 10 min & Validação PIN */}
      {step === 'lock_pin' && (
        <form onSubmit={handleConfirmarPin} className="space-y-6 text-center">
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              Horário Bloqueado para Você
            </span>
            
            <h2 className="text-lg font-bold text-amber-950 pt-2">
              Confirme seu Agendamento
            </h2>
            
            <p className="text-xs text-amber-800">
              O horário permanecerá reservado exclusivamente para você durante:
            </p>
            
            <div className="text-4xl font-black text-amber-600 tabular-nums py-1 tracking-tight">
              {timeLeft}
            </div>

            <p className="text-xs text-amber-800">
              Enviamos um código de 6 dígitos para o WhatsApp <strong>{telefoneMascarado}</strong>.
            </p>
          </div>

          {/* Dica do PIN para modo de homologação */}
          {pinSimulado && (
            <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-600 border border-slate-200 font-mono">
              [Modo Homologação]: Código PIN gerado: <strong className="text-slate-900">{pinSimulado}</strong>
            </div>
          )}

          <div className="space-y-2 max-w-xs mx-auto text-left">
            <label className="text-xs font-semibold text-slate-700 block text-center">
              Digite o Código PIN
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full rounded-xl border border-slate-300 p-3 text-center tracking-widest font-mono font-bold text-2xl text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={isPendingPin || pin.length < 6}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
          >
            {isPendingPin ? 'Validando PIN...' : 'Confirmar e Finalizar Agendamento'}
          </button>
        </form>
      )}

      {/* Passo 5: Sucesso */}
      {step === 'sucesso' && (
        <div className="text-center py-8 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-black text-slate-900">Agendamento Confirmado!</h2>
          
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            Perfeito, <strong>{nome}</strong>! Sua reserva no <strong>{lojista.nome_estabelecimento}</strong> está garantida para o dia <strong>{selectedDate.split('-').reverse().join('/')}</strong> às <strong>{selectedHorario?.horaFormatada}</strong>.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              Novo Agendamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
