'use client';

import { useState, useEffect } from 'react';
import { buscarHorariosDisponiveisAction, reservarHorarioAction, validarPinAction } from '@/app/actions/agendamento';

export default function AgendamentoClient({ lojista, servicos }: { lojista: any, servicos: any[] }) {
  const [step, setStep] = useState<'servico' | 'data_hora' | 'lock_pin' | 'sucesso'>('servico');
  const [selectedServico, setSelectedServico] = useState<any>(null);
  
  // Data e Horários
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [selectedHorario, setSelectedHorario] = useState<any>(null);

  // Lock & Form
  const [reservaId, setReservaId] = useState<string>('');
  const [lockExpires, setLockExpires] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('10:00');
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [pin, setPin] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);

  // Generate 14 business days
  const diasUteis = [];
  let d = new Date();
  while(diasUteis.length < 14) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      diasUteis.push({
        iso: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
      });
    }
    d.setDate(d.getDate() + 1);
  }

  // Fetch horários
  useEffect(() => {
    if (step === 'data_hora' && selectedServico && selectedDate) {
      setLoadingHorarios(true);
      buscarHorariosDisponiveisAction(lojista.id, selectedServico.id, selectedDate)
        .then(res => setHorarios(res))
        .catch(err => alert(err.message))
        .finally(() => setLoadingHorarios(false));
    }
  }, [selectedDate, step, selectedServico, lojista.id]);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'lock_pin' && lockExpires) {
      interval = setInterval(() => {
        const diff = lockExpires.getTime() - new Date().getTime();
        if (diff <= 0) {
          clearInterval(interval);
          alert('Tempo esgotado! O horário foi liberado.');
          setStep('servico');
        } else {
          const m = Math.floor(diff / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, lockExpires]);

  const handleReservar = async () => {
    if (!selectedHorario) return;
    setLoadingForm(true);
    try {
      const res = await reservarHorarioAction(lojista.id, selectedServico.id, selectedHorario.inicio, selectedHorario.fim);
      setReservaId(res.reservaId);
      setLockExpires(new Date(res.expiracaoIso));
      setStep('lock_pin');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoadingForm(false);
    }
  };

  const handleValidarPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingForm(true);
    try {
      await validarPinAction(reservaId, pin, nome, telefone, lojista.id);
      setStep('sucesso');
    } catch(error: any) {
      alert(error.message);
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      
      {/* Passo 1: Serviços */}
      {step === 'servico' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Selecione o Serviço</h2>
            <p className="text-slate-500">Escolha o que deseja fazer hoje.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {servicos.map(s => (
              <div 
                key={s.id}
                onClick={() => { setSelectedServico(s); setStep('data_hora'); }}
                className="cursor-pointer rounded-xl border border-slate-200 p-4 transition-all hover:border-[var(--tenant-primary)] hover:shadow-md flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold text-slate-900">{s.nome_servico}</h3>
                  <p className="text-sm text-slate-500">{s.duracao_minutos} minutos</p>
                </div>
                <div className="font-bold tabular-nums text-slate-900">
                  R$ {s.preco.toFixed(2).replace('.', ',')}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">Tem alguma dúvida?</h4>
                <p className="text-sm text-slate-500">Fale com nosso atendimento humano.</p>
              </div>
              <a 
                href={`https://wa.me/${lojista.whatsapp_notificacao || ''}?text=${encodeURIComponent('Olá, tenho uma dúvida antes de agendar. Pode me ajudar?')}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-semibold hover:bg-slate-300 transition"
              >
                Falar com Atendimento
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Passo 2: Data e Hora */}
      {step === 'data_hora' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <button onClick={() => setStep('servico')} className="text-sm text-slate-500 hover:text-slate-900 flex items-center">
            &larr; Voltar
          </button>
          
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quando?</h2>
            <p className="text-slate-500">{selectedServico?.nome_servico} ({selectedServico?.duracao_minutos} min)</p>
          </div>

          {/* Dates Horizontal Scroll */}
          <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide">
            {diasUteis.map(d => (
              <button
                key={d.iso}
                onClick={() => setSelectedDate(d.iso)}
                className={`flex-shrink-0 flex flex-col items-center justify-center h-16 w-16 rounded-xl border transition-all ${
                  selectedDate === d.iso 
                  ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)] text-white shadow-md' 
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-medium uppercase">{d.label.split(',')[0]}</span>
                <span className="text-lg font-bold">{d.iso.split('-')[2]}</span>
              </button>
            ))}
          </div>

          {/* Times Grid */}
          <div>
            <h3 className="font-medium text-slate-900 mb-3">Horários Disponíveis</h3>
            {loadingHorarios ? (
              <div className="h-20 flex items-center justify-center"><div className="animate-pulse bg-slate-200 h-8 w-8 rounded-full"></div></div>
            ) : horarios.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum horário disponível neste dia.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {horarios.map(h => (
                  <button
                    key={h.inicio}
                    onClick={() => setSelectedHorario(h)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all border ${
                      selectedHorario?.inicio === h.inicio
                      ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)] text-white'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {h.horaFormatada}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedHorario && (
            <button 
              onClick={handleReservar}
              disabled={loadingForm}
              className="w-full mt-4 bg-[var(--tenant-primary)] text-white py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition"
            >
              {loadingForm ? 'Reservando...' : 'Confirmar Horário'}
            </button>
          )}
        </div>
      )}

      {/* Passo 3: Lock & Validação PIN */}
      {step === 'lock_pin' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h2 className="text-xl font-bold text-amber-900 mb-1">Horário Reservado!</h2>
            <p className="text-sm text-amber-800">Complete seus dados em até:</p>
            <div className="text-3xl font-black text-amber-600 tabular-nums my-2 tracking-tighter">
              {timeLeft}
            </div>
            <p className="text-xs text-amber-700">Um código (PIN) foi enviado para o seu WhatsApp (Simulado localmente).</p>
          </div>

          <form onSubmit={handleValidarPin} className="space-y-4 text-left">
            <div>
              <label className="text-sm font-medium text-slate-700">Seu Nome</label>
              <input required type="text" value={nome} onChange={e => setNome(e.target.value)} className="mt-1 w-full rounded-lg border-slate-300 border p-2 focus:ring-[var(--tenant-primary)]" placeholder="João Silva" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Telefone (WhatsApp)</label>
              <input required type="text" value={telefone} onChange={e => setTelefone(e.target.value)} className="mt-1 w-full rounded-lg border-slate-300 border p-2 focus:ring-[var(--tenant-primary)]" placeholder="11999999999" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Código de Validação (PIN 6 dígitos)</label>
              <input required type="text" maxLength={6} value={pin} onChange={e => setPin(e.target.value)} className="mt-1 w-full rounded-lg border-slate-300 border p-2 text-center tracking-widest font-bold text-xl focus:ring-[var(--tenant-primary)]" placeholder="000000" />
              <p className="text-xs text-slate-500 mt-1">Olhe no terminal do servidor para ver o PIN gerado.</p>
            </div>
            <button type="submit" disabled={loadingForm} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition">
              {loadingForm ? 'Validando...' : 'Validar e Confirmar'}
            </button>
          </form>
        </div>
      )}

      {/* Passo 4: Sucesso */}
      {step === 'sucesso' && (
        <div className="text-center py-8 animate-in zoom-in">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Agendado!</h2>
          <p className="text-slate-600 mb-6">Tudo certo, {nome}. Te esperamos no dia {selectedDate.split('-').reverse().join('/')} às {selectedHorario?.horaFormatada}.</p>
          <button onClick={() => window.location.reload()} className="text-sm font-semibold text-[var(--tenant-primary)] hover:underline">
            Fazer outro agendamento
          </button>
        </div>
      )}
    </div>
  );
}
