import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { processPendingChatQueue } from '@/lib/ai-worker';

/**
 * ==============================================================================
 * FlowAgenda — Rota Cron / Worker de Processamento da Fila de IA (chat_queue)
 * Arquivo: app/api/cron/process-chat-queue/route.ts
 * ==============================================================================
 *
 * Seleciona mensagens com debounce vencido (status = 'pending' e scheduled_for <= now()),
 * consolida conversas sequenciais por (lojista_id, remote_jid), invoca o modelo
 * 'deepseek-chat' sob Guardrails Deskcomm, envia a resposta na Evolution API e
 * abate 1 crédito de IA (exceto para Membros Fundadores: is_founder = true).
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return true;
  }

  const url = new URL(request.url);
  const authHeader = (request.headers.get('authorization') || '').trim();
  const querySecret = (url.searchParams.get('secret') || url.searchParams.get('key') || '').trim();

  const expectedBearer = `Bearer ${cronSecret}`;
  return (
    timingSafeCompare(authHeader, expectedBearer) ||
    timingSafeCompare(authHeader, cronSecret) ||
    (Boolean(querySecret) && timingSafeCompare(querySecret, cronSecret))
  );
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
      { status: 401 }
    );
  }

  try {
    const summary = await processPendingChatQueue();
    return NextResponse.json(summary, { status: 200 });
  } catch (error: any) {
    console.error('[Cron process-chat-queue] Erro fatal:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erro interno ao processar fila chat_queue',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

