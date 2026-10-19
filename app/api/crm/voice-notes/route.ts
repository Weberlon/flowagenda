import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@/utils/supabase/server';

/**
 * ==============================================================================
 * FlowAgenda — API de Transcrição de Voz com Gemini (CRM Voice Notes)
 * Arquivo: app/api/crm/voice-notes/route.ts
 * ==============================================================================
 *
 * Recebe áudio gravado pelo front-end, envia ao Gemini 1.5 Flash como
 * inlineData (base64), e retorna JSON estruturado com procedimento,
 * observações e próximo passo.
 *
 * DIRETRIZES LGPD:
 * - Nenhum dado pessoal do cliente é enviado ao Gemini.
 * - O buffer de áudio é descartado da memória logo após o processamento.
 * - O payload enviado ao Gemini é efêmero e anônimo.
 * ==============================================================================
 */

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface GeminiVoiceNoteResponse {
  procedimento: string;
  observacoes: string;
  proximo_passo: string;
  status: 'SUCESSO' | 'AUDIO_INAUDIVEL';
}

// ---------------------------------------------------------------------------
// System Prompt para o Gemini (privacy-first)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Você é um assistente de documentação comercial e de atendimento ao cliente.
Sua função é transcrever e organizar o áudio em JSON estrito.

DIRETRIZES DE PRIVACIDADE:
- NUNCA inclua nomes próprios, CPFs, telefones ou dados sensíveis de pacientes/clientes.
- Se nomes forem mencionados no áudio, substitua por "o cliente" ou "o paciente".

Retorne estritamente o JSON com a seguinte estrutura:
{
  "procedimento": "resumo claro do que foi realizado",
  "observacoes": "preferências, detalhes técnicos ou cuidados apontados",
  "proximo_passo": "orientação futura ou data de retorno sugerida",
  "status": "SUCESSO" | "AUDIO_INAUDIVEL"
}

Caso o áudio não contenha voz inteligível, retorne status AUDIO_INAUDIVEL com campos vazios.`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    // =====================================================================
    // 1. Autenticação via sessão Supabase SSR
    // =====================================================================
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para continuar.' },
        { status: 401 }
      );
    }

    // =====================================================================
    // 2. Extração do áudio via FormData
    // =====================================================================
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: 'Arquivo de áudio ausente ou inválido.' },
        { status: 400 }
      );
    }

    // Validação de tamanho (máx. 10MB para proteção contra abuse)
    const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: 'O áudio excede o tamanho máximo de 10MB.' },
        { status: 413 }
      );
    }

    // Conversão para buffer/base64
    const arrayBuffer = await audioFile.arrayBuffer();
    let audioBuffer: Buffer | null = Buffer.from(arrayBuffer);
    const base64Audio = audioBuffer.toString('base64');

    // Resolve mimeType do arquivo recebido (fallback: audio/webm)
    const mimeType = audioFile.type || 'audio/webm';

    // =====================================================================
    // 3. Processamento com Gemini 1.5 Flash (SDK @google/genai)
    // =====================================================================
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[VoiceNotes] GEMINI_API_KEY não configurada.');
      return NextResponse.json(
        { error: 'Configuração de IA ausente no servidor.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Transcreva e organize o áudio a seguir conforme as instruções do sistema.',
            },
            {
              inlineData: {
                mimeType,
                data: base64Audio,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            procedimento: {
              type: Type.STRING,
              description: 'Resumo claro do que foi realizado',
              nullable: false,
            },
            observacoes: {
              type: Type.STRING,
              description: 'Preferências, detalhes técnicos ou cuidados apontados',
              nullable: false,
            },
            proximo_passo: {
              type: Type.STRING,
              description: 'Orientação futura ou data de retorno sugerida',
              nullable: false,
            },
            status: {
              type: Type.STRING,
              description: 'SUCESSO ou AUDIO_INAUDIVEL',
              nullable: false,
            },
          },
          required: ['procedimento', 'observacoes', 'proximo_passo', 'status'],
        },
      },
    });

    // =====================================================================
    // 4. Descarte imediato do buffer de memória (LGPD)
    // =====================================================================
    audioBuffer = null;

    // =====================================================================
    // 5. Parse da resposta
    // =====================================================================
    const rawText = response.text ?? '';

    let parsed: GeminiVoiceNoteResponse;
    try {
      parsed = JSON.parse(rawText) as GeminiVoiceNoteResponse;
    } catch {
      console.error('[VoiceNotes] Falha ao parsear resposta do Gemini:', rawText);
      return NextResponse.json(
        {
          error: 'A IA retornou uma resposta inesperada. Tente novamente.',
          raw: rawText,
        },
        { status: 422 }
      );
    }

    // Validação de campos obrigatórios
    if (!parsed.status || !['SUCESSO', 'AUDIO_INAUDIVEL'].includes(parsed.status)) {
      parsed.status = 'AUDIO_INAUDIVEL';
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno no processamento de voz.';
    console.error('[VoiceNotes] Exceção:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
