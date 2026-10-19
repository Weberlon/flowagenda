'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

// ---------------------------------------------------------------------------
// Declarações de Tipos para Web Speech API (evitando 'any')
// ---------------------------------------------------------------------------

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: ISpeechRecognitionConstructor;
  webkitSpeechRecognition?: ISpeechRecognitionConstructor;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: ISpeechRecognitionResultList;
}

interface ISpeechRecognitionResultList {
  length: number;
  [index: number]: ISpeechRecognitionResult;
}

interface ISpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: ISpeechRecognitionAlternative;
}

interface ISpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Props do Componente
// ---------------------------------------------------------------------------

export interface VoiceNoteRecorderProps {
  clienteId: string;
  lojistaId: string;
  profissionalId?: string;
  onNoteSaved?: () => void;
}

type ModoGravacao = 'gemini' | 'local';

interface NotaEstruturada {
  procedimento: string;
  observacoes: string;
  proximo_passo: string;
}

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------

export default function VoiceNoteRecorder({
  clienteId,
  lojistaId,
  profissionalId,
  onNoteSaved,
}: VoiceNoteRecorderProps) {
  const [modo, setModo] = useState<ModoGravacao>('gemini');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal de Revisão
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [nota, setNota] = useState<NotaEstruturada>({
    procedimento: '',
    observacoes: '',
    proximo_passo: '',
  });

  // Texto temporário durante Ditado Local
  const [localTranscript, setLocalTranscript] = useState<string>('');

  // Refs de gravação
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<ISpeechRecognition | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const MAX_SECONDS = 60;

  // -------------------------------------------------------------------------
  // Gerenciamento de Wake Lock API (Evita que o celular apague a tela)
  // -------------------------------------------------------------------------
  const acquireWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && typeof navigator.wakeLock.request === 'function') {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Ignora silenciosamente caso o dispositivo bloqueie ou não suporte
      wakeLockRef.current = null;
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      wakeLockRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Cleanup geral ao desmontar
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.abort();
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // -------------------------------------------------------------------------
  // Início e Controle de Tempo
  // -------------------------------------------------------------------------
  const startTimer = useCallback(() => {
    setTimerSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev >= MAX_SECONDS - 1) {
          stopRecording();
          return MAX_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // MODO A: Gravação de Áudio com MediaRecorder (Gemini)
  // -------------------------------------------------------------------------
  const startGeminiRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Deixa o navegador usar o padrão
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        await processGeminiAudio(audioBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Coleta dados em fatias de 250ms

      await acquireWakeLock();
      startTimer();
      setIsRecording(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Permissão de microfone negada.';
      setErrorMessage(`Erro ao acessar microfone: ${msg}`);
      setIsRecording(false);
    }
  };

  const processGeminiAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'gravacao.webm');

      const response = await fetch('/api/crm/voice-notes', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const result = (await response.json()) as {
        procedimento: string;
        observacoes: string;
        proximo_passo: string;
        status: 'SUCESSO' | 'AUDIO_INAUDIVEL';
      };

      if (result.status === 'AUDIO_INAUDIVEL') {
        setErrorMessage('O áudio gravado não continha fala audível. Tente gravar novamente mais perto do microfone.');
        return;
      }

      setNota({
        procedimento: result.procedimento || '',
        observacoes: result.observacoes || '',
        proximo_passo: result.proximo_passo || '',
      });
      setShowReviewModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar áudio na IA.';
      setErrorMessage(`Erro no processamento da IA: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------------------
  // MODO B: Ditado Local On-Device (Web Speech API)
  // -------------------------------------------------------------------------
  const startLocalRecording = async () => {
    setErrorMessage(null);
    setLocalTranscript('');

    const windowWithSpeech = window as unknown as IWindowWithSpeech;
    const SpeechConstructor =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechConstructor) {
      setErrorMessage(
        'Seu navegador não suporta a Web Speech API on-device. Recomendamos usar o Google Chrome ou alternar para o modo "IA Estruturada".'
      );
      return;
    }

    try {
      const recognition = new SpeechConstructor();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      let transcriptAccumulator = '';

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            transcriptAccumulator += item[0].transcript + ' ';
          } else {
            interim += item[0].transcript;
          }
        }
        setLocalTranscript((transcriptAccumulator + interim).trim());
      };

      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        if (event.error !== 'no-speech') {
          setErrorMessage(`Erro no reconhecimento de voz local: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Se ainda estava marcado como gravando quando parou espontaneamente
        setIsRecording(false);
        stopTimer();
        releaseWakeLock();
      };

      speechRecognitionRef.current = recognition;
      recognition.start();

      await acquireWakeLock();
      startTimer();
      setIsRecording(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível iniciar o ditado local.';
      setErrorMessage(msg);
      setIsRecording(false);
    }
  };

  // -------------------------------------------------------------------------
  // Disparador Unificado de Parada
  // -------------------------------------------------------------------------
  const stopRecording = () => {
    stopTimer();
    releaseWakeLock();
    setIsRecording(false);

    if (modo === 'gemini') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } else {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      // No modo local, ao parar transferimos a transcrição para o formulário de revisão
      setTimeout(() => {
        setNota((prev) => ({
          ...prev,
          procedimento: prev.procedimento || localTranscript || 'Procedimento realizado (ditado local)',
          observacoes: prev.observacoes || (localTranscript ? `Transcrição bruta: ${localTranscript}` : ''),
        }));
        setShowReviewModal(true);
      }, 300);
    }
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (modo === 'gemini') {
        startGeminiRecording();
      } else {
        startLocalRecording();
      }
    }
  };

  // -------------------------------------------------------------------------
  // Persistência no Supabase Client (RLS Seguro)
  // -------------------------------------------------------------------------
  const handleSalvarNota = async () => {
    if (!nota.procedimento.trim()) {
      setErrorMessage('O campo Procedimento é obrigatório.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      const payload = {
        cliente_id: clienteId,
        lojista_id: lojistaId,
        profissional_id: profissionalId || null,
        procedimento: nota.procedimento.trim(),
        observacoes: nota.observacoes.trim() || null,
        proximo_passo: nota.proximo_passo.trim() || null,
        modo_gravacao: modo,
      };

      const { error } = await supabase
        .from('cliente_historico_notas')
        .insert([payload]);

      if (error) {
        throw new Error(error.message);
      }

      // Sucesso: fecha modal e limpa estado
      setShowReviewModal(false);
      setNota({ procedimento: '', observacoes: '', proximo_passo: '' });
      setLocalTranscript('');

      if (onNoteSaved) {
        onNoteSaved();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar no banco de dados.';
      setErrorMessage(`Falha ao salvar nota: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Formatação MM:SS do timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 rounded-2xl bg-[#2E3440] border border-[#3B4252] text-[#ECEFF4] shadow-xl">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#88C0D0] animate-pulse" />
          <h3 className="text-sm font-semibold tracking-wide uppercase text-[#88C0D0]">
            Anotação Rápida por Voz
          </h3>
        </div>
        <span className="text-xs text-[#81A1C1] bg-[#3B4252] px-2 py-0.5 rounded-full font-mono">
          {formatTimer(timerSeconds)} / {formatTimer(MAX_SECONDS)}
        </span>
      </div>

      {/* TOGGLE EM PÍLULA: MODO A vs MODO B */}
      <div className="relative flex p-1 mb-5 bg-[#3B4252] rounded-xl border border-[#434C5E]">
        <button
          type="button"
          disabled={isRecording || isProcessing}
          onClick={() => setModo('gemini')}
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            modo === 'gemini'
              ? 'bg-[#5E81AC] text-white shadow-md'
              : 'text-[#D8DEE9] hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
          IA Estruturada (Nuvem)
        </button>
        <button
          type="button"
          disabled={isRecording || isProcessing}
          onClick={() => setModo('local')}
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            modo === 'local'
              ? 'bg-[#8FBCBB] text-[#2E3440] font-semibold shadow-md'
              : 'text-[#D8DEE9] hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Ditado Local (On-Device)
        </button>
      </div>

      {/* ÁREA CENTRAL DE GRAVAÇÃO */}
      <div className="flex flex-col items-center justify-center py-4">
        {/* BOTÃO CIRCULAR DE GRAVAÇÃO COM PULSO */}
        <div className="relative flex items-center justify-center">
          {/* Ondas concêntricas durante gravação */}
          {isRecording && (
            <>
              <motion.div
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                className="absolute w-20 h-20 rounded-full bg-[#BF616A] pointer-events-none"
              />
              <motion.div
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.3, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                className="absolute w-20 h-20 rounded-full bg-[#BF616A] pointer-events-none"
              />
            </>
          )}

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleToggleRecord}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none focus:ring-4 ${
              isRecording
                ? 'bg-[#BF616A] hover:bg-[#d07079] focus:ring-[#BF616A]/40'
                : 'bg-gradient-to-br from-[#88C0D0] to-[#5E81AC] hover:opacity-95 focus:ring-[#88C0D0]/40'
            }`}
          >
            {isProcessing ? (
              <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : isRecording ? (
              // Ícone Parar (Quadrado)
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              // Ícone Microfone
              <svg className="w-8 h-8 text-[#2E3440]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            )}
          </button>
        </div>

        {/* STATUS TEXTUAL */}
        <p className="mt-4 text-xs text-center text-[#D8DEE9]">
          {isProcessing ? (
            <span className="text-[#EBCB8B] font-medium flex items-center gap-1.5 justify-center">
              Processando via Gemini 1.5 Flash...
            </span>
          ) : isRecording ? (
            <span className="text-[#BF616A] font-semibold tracking-wide">
              Gravando... Toque no botão para concluir ({MAX_SECONDS - timerSeconds}s restantes)
            </span>
          ) : (
            <span className="text-[#81A1C1]">
              Toque no microfone para iniciar a anotação
            </span>
          )}
        </p>

        {/* TRANSCRIÇÃO EM TEMPO REAL NO MODO LOCAL */}
        {modo === 'local' && isRecording && localTranscript && (
          <div className="mt-3 w-full p-2.5 bg-[#3B4252] rounded-lg border border-[#434C5E] text-xs text-[#E5E9F0] max-h-24 overflow-y-auto italic">
            &ldquo;{localTranscript}&rdquo;
          </div>
        )}
      </div>

      {/* FEEDBACK DE ERRO */}
      {errorMessage && (
        <div className="mt-3 p-2.5 bg-[#BF616A]/20 border border-[#BF616A]/40 rounded-xl text-xs text-[#ECEFF4] flex items-start gap-2">
          <svg className="w-4 h-4 text-[#BF616A] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-[#D8DEE9] hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* MODAL DE REVISÃO E CONFIRMAÇÃO (Nord Theme) */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-[#2E3440] border border-[#434C5E] rounded-2xl p-6 text-[#ECEFF4] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#3B4252]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#A3BE8C]" />
                  <h4 className="text-base font-bold text-white">Revisar Nota de Atendimento</h4>
                </div>
                <span className="text-xs uppercase tracking-wider px-2 py-0.5 bg-[#3B4252] text-[#88C0D0] rounded">
                  {modo === 'gemini' ? 'Gemini 1.5' : 'On-Device'}
                </span>
              </div>

              {/* CAMPOS EDITÁVEIS */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#D8DEE9] font-semibold mb-1">
                    Procedimento Realizado *
                  </label>
                  <textarea
                    rows={2}
                    value={nota.procedimento}
                    onChange={(e) => setNota({ ...nota, procedimento: e.target.value })}
                    placeholder="Ex: Corte degrade navalhado e alinhamento de barba"
                    className="w-full px-3 py-2 bg-[#3B4252] border border-[#4C566A] rounded-lg text-[#ECEFF4] placeholder-[#81A1C1] focus:outline-none focus:border-[#88C0D0] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[#D8DEE9] font-semibold mb-1">
                    Observações e Preferências do Cliente
                  </label>
                  <textarea
                    rows={3}
                    value={nota.observacoes}
                    onChange={(e) => setNota({ ...nota, observacoes: e.target.value })}
                    placeholder="Ex: Prefere barba mais baixa na lateral; cliente sensível na lâmina"
                    className="w-full px-3 py-2 bg-[#3B4252] border border-[#4C566A] rounded-lg text-[#ECEFF4] placeholder-[#81A1C1] focus:outline-none focus:border-[#88C0D0] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[#D8DEE9] font-semibold mb-1">
                    Próximo Passo / Retorno Sugerido
                  </label>
                  <input
                    type="text"
                    value={nota.proximo_passo}
                    onChange={(e) => setNota({ ...nota, proximo_passo: e.target.value })}
                    placeholder="Ex: Retorno em 20 dias para manutenção do corte"
                    className="w-full px-3 py-2 bg-[#3B4252] border border-[#4C566A] rounded-lg text-[#ECEFF4] placeholder-[#81A1C1] focus:outline-none focus:border-[#88C0D0] transition-colors"
                  />
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3B4252]">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#D8DEE9] hover:text-white bg-[#3B4252] hover:bg-[#434C5E] rounded-lg transition-colors"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSalvarNota}
                  className="px-5 py-2 text-xs font-semibold text-[#2E3440] bg-[#A3BE8C] hover:bg-[#b0c89a] rounded-lg transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirmar e Salvar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
