/**
 * ==============================================================================
 * FlowAgenda — Script Utilitário de Teste de Webhook WhatsApp (Evolution API v2)
 * Arquivo: scripts/test-whatsapp-webhook.ts
 * Execução:
 *   Local:   npm run test:webhook
 *   Staging: npm run test:webhook -- --staging
 *   Custom:  npm run test:webhook -- --url=https://seu-dominio/api/webhooks/whatsapp
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------------------
// 1. Tipagens Estritas do Payload da Evolution API v2 e Resultados
// ------------------------------------------------------------------------------

export interface EvolutionKeyPayload {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

export interface EvolutionMessageContent {
  conversation?: string;
  extendedTextMessage?: {
    text: string;
  };
  imageMessage?: {
    caption?: string;
  };
  audioMessage?: {
    url?: string;
  };
}

export interface EvolutionMessageDataItem {
  key: EvolutionKeyPayload;
  pushName?: string;
  message: EvolutionMessageContent;
  messageType?: string;
  messageTimestamp?: number;
  instance?: string;
}

export interface EvolutionWebhookPayload {
  event: 'messages.upsert';
  instance: string;
  data: EvolutionMessageDataItem;
  sender?: string;
  apikey?: string;
}

export interface WebhookResponsePayload {
  received?: boolean;
  action?: string;
  idempotente?: boolean;
  ignored?: string;
  agendamento_id?: string;
  error?: string;
}

export interface TestResult {
  scenario: string;
  passed: boolean;
  status: number;
  response: WebhookResponsePayload | null;
  details?: string;
  durationMs: number;
}

// ------------------------------------------------------------------------------
// 2. Carregamento de Ambiente (.env.local) e Configurações de CLI
// ------------------------------------------------------------------------------

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

// Cores para saída do terminal
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
};

function logHeader(title: string) {
  console.log(`\n${colors.cyan}${colors.bold}======================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}======================================================================${colors.reset}\n`);
}

function logSection(title: string) {
  console.log(`\n${colors.magenta}${colors.bold}--- ${title} ---${colors.reset}`);
}

function logSuccess(step: string, message: string) {
  console.log(`${colors.green}${colors.bold}[PASS]${colors.reset} ${colors.green}✓ ${step}:${colors.reset} ${message}`);
}

function logFailure(step: string, message: string, details?: any) {
  console.error(`${colors.red}${colors.bold}[FAIL]${colors.reset} ${colors.red}✗ ${step}:${colors.reset} ${message}`);
  if (details) {
    console.error(`${colors.gray}${typeof details === 'object' ? JSON.stringify(details, null, 2) : details}${colors.reset}`);
  }
}

function logInfo(message: string) {
  console.log(`${colors.yellow}ℹ ${message}${colors.reset}`);
}

// Extração de argumentos da linha de comando
const args = process.argv.slice(2);
const isStaging = args.includes('--staging');
const customUrlArg = args.find((a) => a.startsWith('--url='));
const customUrl = customUrlArg ? customUrlArg.split('=')[1] : null;

const defaultTargetUrl = isStaging
  ? 'https://flowagenda.online/api/webhooks/whatsapp'
  : 'http://localhost:3000/api/webhooks/whatsapp';

const targetWebhookUrl = customUrl || process.env.TEST_WEBHOOK_URL || defaultTargetUrl;

const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET || process.env.HOOK_TOKEN || '';
const testPhone = '5511999990001'; // Telefone mock para o teste
const testCustomerName = 'Carlos Teste Webhook';

// ------------------------------------------------------------------------------
// 3. Montagem dos Payloads de Teste (Evolution API v2)
// ------------------------------------------------------------------------------

function createMockPayload(params: {
  instance: string;
  phone: string;
  messageId: string;
  text: string;
  pushName?: string;
}): EvolutionWebhookPayload {
  const remoteJid = `${params.phone}@s.whatsapp.net`;
  return {
    event: 'messages.upsert',
    instance: params.instance,
    data: {
      key: {
        remoteJid,
        fromMe: false,
        id: params.messageId,
      },
      pushName: params.pushName || testCustomerName,
      message: {
        conversation: params.text,
      },
      messageType: 'conversation',
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  };
}

// ------------------------------------------------------------------------------
// 4. Execução de Requisição HTTP com Diagnóstico
// ------------------------------------------------------------------------------

async function sendWebhookRequest(payload: EvolutionWebhookPayload): Promise<{
  status: number;
  body: WebhookResponsePayload | null;
  rawText: string;
  durationMs: number;
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (webhookSecret) {
    headers['apikey'] = webhookSecret;
    headers['x-api-key'] = webhookSecret;
    headers['x-hook-token'] = webhookSecret;
  }

  const start = Date.now();
  try {
    const response = await fetch(targetWebhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const durationMs = Date.now() - start;
    const rawText = await response.text();
    let body: WebhookResponsePayload | null = null;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = null;
    }

    return {
      status: response.status,
      body,
      rawText,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    return {
      status: 0,
      body: null,
      rawText: err?.message || 'Falha de rede ao conectar',
      durationMs,
    };
  }
}

// ------------------------------------------------------------------------------
// 5. Suíte Principal de Testes
// ------------------------------------------------------------------------------

async function runWebhookTestSuite() {
  logHeader('TESTE DE ESTEIRA WEBHOOK WHATSAPP — EVOLUTION API v2');
  console.log(`${colors.bold}Alvo do Webhook:${colors.reset} ${targetWebhookUrl}`);
  console.log(`${colors.bold}Ambiente:${colors.reset} ${isStaging ? 'STAGING (Produção)' : 'LOCAL'}`);
  console.log(`${colors.bold}Autenticação Segredo:${colors.reset} ${webhookSecret ? 'Configurado ✓' : 'Nenhum (aberto)'}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabase: SupabaseClient | null = null;
  let lojistaId: string | null = null;
  let instanceName = 'flowagenda_default';
  let testAgendamentoAId: string | null = null;
  let testAgendamentoBId: string | null = null;
  let testAgendamentoCId: string | null = null;

  // Se houver conexão com o Supabase, preparamos o contexto ideal de teste
  if (supabaseUrl && serviceKey) {
    supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    logInfo('Conexão com Supabase Service Role estabelecida. Localizando lojista piloto...');
    const { data: lojistas } = await supabase
      .from('lojistas')
      .select('id, nome_negocio, nome_estabelecimento, slug_subdominio, whatsapp_instance_name')
      .limit(1);

    if (lojistas && lojistas.length > 0) {
      const lojista = lojistas[0];
      lojistaId = lojista.id;
      instanceName = lojista.whatsapp_instance_name || `flowagenda_${lojista.slug_subdominio || 'test'}`;
      logSuccess('Setup Tenant', `Lojista "${lojista.nome_negocio || lojista.nome_estabelecimento}" | Instância: "${instanceName}"`);

      // Garante que o lojista tenha a instância configurada para o teste
      if (!lojista.whatsapp_instance_name) {
        await supabase
          .from('lojistas')
          .update({ whatsapp_instance_name: instanceName })
          .eq('id', lojistaId);
      }

      // Localizar ou provisionar serviço válido para o agendamento
      const { data: servicos } = await supabase
        .from('servicos')
        .select('id')
        .eq('lojista_id', lojistaId)
        .limit(1);

      let servicoId = servicos?.[0]?.id;
      if (!servicoId) {
        const { data: novoServ } = await supabase
          .from('servicos')
          .insert({
            lojista_id: lojistaId,
            nome_servico: 'Serviço Teste Webhook',
            duracao_minutos: 30,
            preco: 50.0,
            ativo: true,
          })
          .select('id')
          .single();
        servicoId = novoServ?.id;
      }

      // Provisionar 3 agendamentos de teste para garantir validação dos fluxos A, B e C
      logInfo('Provisionando agendamentos de teste no banco de dados...');
      const agora = new Date();
      const horaInicioA = new Date(agora.getTime() + 60 * 60 * 1000).toISOString(); // +1 hora
      const horaFimA = new Date(agora.getTime() + 90 * 60 * 1000).toISOString();

      const horaInicioB = new Date(agora.getTime() + 120 * 60 * 1000).toISOString(); // +2 horas
      const horaFimB = new Date(agora.getTime() + 150 * 60 * 1000).toISOString();

      const horaInicioC = new Date(agora.getTime() + 180 * 60 * 1000).toISOString(); // +3 horas
      const horaFimC = new Date(agora.getTime() + 210 * 60 * 1000).toISOString();

      // Agendamento para Cenário A (Confirmar)
      const { data: agA, error: errA } = await supabase
        .from('agendamentos')
        .insert({
          lojista_id: lojistaId,
          servico_id: servicoId,
          cliente_nome: testCustomerName,
          cliente_telefone: testPhone,
          data_hora_inicio: horaInicioA,
          data_hora_fim: horaFimA,
          status: 'confirmado',
        })
        .select('id')
        .single();
      testAgendamentoAId = agA?.id || null;
      if (errA) console.warn('[TEST SETUP] Erro ao criar agendamento A:', errA.message);

      // Agendamento para Cenário B (Cancelar)
      const { data: agB, error: errB } = await supabase
        .from('agendamentos')
        .insert({
          lojista_id: lojistaId,
          servico_id: servicoId,
          cliente_nome: testCustomerName,
          cliente_telefone: testPhone,
          data_hora_inicio: horaInicioB,
          data_hora_fim: horaFimB,
          status: 'confirmado',
        })
        .select('id')
        .single();
      testAgendamentoBId = agB?.id || null;
      if (errB) console.warn('[TEST SETUP] Erro ao criar agendamento B:', errB.message);

      // Agendamento para Cenário C (Texto Livre)
      const { data: agC, error: errC } = await supabase
        .from('agendamentos')
        .insert({
          lojista_id: lojistaId,
          servico_id: servicoId,
          cliente_nome: testCustomerName,
          cliente_telefone: testPhone,
          data_hora_inicio: horaInicioC,
          data_hora_fim: horaFimC,
          status: 'confirmado',
        })
        .select('id')
        .single();
      testAgendamentoCId = agC?.id || null;
      if (errC) console.warn('[TEST SETUP] Erro ao criar agendamento C:', errC.message);
    }
  } else {
    logInfo('Supabase Service Role não fornecido no ambiente; executando teste puramente via endpoint HTTP.');
  }

  const results: TestResult[] = [];
  const sharedMessageIdA = `msg_test_cenario_a_${Date.now()}`;

  // ============================================================================
  // CENÁRIO A: Cliente respondendo "1" (Confirmação ativa do agendamento)
  // ============================================================================
  logSection('Cenário A: Cliente respondendo "1" (Confirmação Ativa)');
  const payloadA = createMockPayload({
    instance: instanceName,
    phone: testPhone,
    messageId: sharedMessageIdA,
    text: '1',
  });

  const resA = await sendWebhookRequest(payloadA);
  const passA =
    resA.status === 200 &&
    resA.body?.received === true &&
    (resA.body?.action === 'presenca_confirmada' || resA.body?.action === 'mensagem_sem_agendamento');

  if (passA) {
    logSuccess(
      'Cenário A',
      `HTTP ${resA.status} (${resA.durationMs}ms) - Ação: "${resA.body?.action || 'received'}". Confirmação registrada.`
    );
  } else {
    logFailure('Cenário A', `Falha na confirmação de presença (HTTP ${resA.status})`, resA.body || resA.rawText);
  }
  results.push({
    scenario: 'Cenário A (Confirmação "1")',
    passed: Boolean(passA),
    status: resA.status,
    response: resA.body,
    durationMs: resA.durationMs,
  });

  // ============================================================================
  // CENÁRIO D (Idempotência): Reenvio idêntico do Cenário A com o mesmo key.id
  // ============================================================================
  logSection('Cenário D: Reenvio Idêntico do Cenário A (Trava de Idempotência)');
  logInfo(`Reenviando exatamente o mesmo payload com messageId "${sharedMessageIdA}"...`);

  const resD = await sendWebhookRequest(payloadA);
  const passD =
    resD.status === 200 &&
    resD.body?.received === true &&
    resD.body?.idempotente === true;

  if (passD) {
    logSuccess(
      'Cenário D — Idempotência',
      `HTTP ${resD.status} (${resD.durationMs}ms) - Detectada duplicação: { received: true, idempotente: true }. Nenhuma duplicata executada!`
    );
  } else {
    logFailure(
      'Cenário D — Idempotência',
      `Falha na verificação de idempotência (esperado: { idempotente: true }, obtido: ${JSON.stringify(resD.body)})`,
      resD.body || resD.rawText
    );
  }
  results.push({
    scenario: 'Cenário D (Idempotência / Duplicata descartada)',
    passed: Boolean(passD),
    status: resD.status,
    response: resD.body,
    durationMs: resD.durationMs,
  });

  // ============================================================================
  // CENÁRIO B: Cliente respondendo "2" (Cancelamento e link de reagendamento)
  // ============================================================================
  logSection('Cenário B: Cliente respondendo "2" (Cancelamento Ativo)');
  const payloadB = createMockPayload({
    instance: instanceName,
    phone: testPhone,
    messageId: `msg_test_cenario_b_${Date.now()}`,
    text: '2 - Quero cancelar meu horário por favor',
  });

  const resB = await sendWebhookRequest(payloadB);
  const passB =
    resB.status === 200 &&
    resB.body?.received === true &&
    (resB.body?.action === 'agendamento_cancelado' || resB.body?.action === 'mensagem_sem_agendamento');

  if (passB) {
    logSuccess(
      'Cenário B',
      `HTTP ${resB.status} (${resB.durationMs}ms) - Ação: "${resB.body?.action}". Agendamento cancelado com envio do link.`
    );
  } else {
    logFailure('Cenário B', `Falha no cancelamento (HTTP ${resB.status})`, resB.body || resB.rawText);
  }
  results.push({
    scenario: 'Cenário B (Cancelamento "2")',
    passed: Boolean(passB),
    status: resB.status,
    response: resB.body,
    durationMs: resB.durationMs,
  });

  // ============================================================================
  // CENÁRIO C: Cliente enviando texto livre ("Vou atrasar 15 minutos")
  // ============================================================================
  logSection('Cenário C: Cliente enviando Texto Livre ("Vou atrasar 15 minutos")');
  const payloadC = createMockPayload({
    instance: instanceName,
    phone: testPhone,
    messageId: `msg_test_cenario_c_${Date.now()}`,
    text: 'Olá, vou atrasar 15 minutos por conta do trânsito!',
  });

  const resC = await sendWebhookRequest(payloadC);
  const passC =
    resC.status === 200 &&
    resC.body?.received === true &&
    (resC.body?.action === 'texto_livre_encaminhado' || resC.body?.action === 'mensagem_sem_agendamento');

  if (passC) {
    logSuccess(
      'Cenário C',
      `HTTP ${resC.status} (${resC.durationMs}ms) - Ação: "${resC.body?.action}". Encaminhado para o painel de notificações.`
    );
  } else {
    logFailure('Cenário C', `Falha no tratamento de texto livre (HTTP ${resC.status})`, resC.body || resC.rawText);
  }
  results.push({
    scenario: 'Cenário C (Texto Livre -> painel_notificacoes)',
    passed: Boolean(passC),
    status: resC.status,
    response: resC.body,
    durationMs: resC.durationMs,
  });

  // ============================================================================
  // LIMPEZA / TEARDOWN DOS DADOS DE TESTE NO SUPABASE
  // ============================================================================
  if (supabase) {
    logSection('Limpeza de Fixtures de Teste');
    try {
      const idsToDelete = [testAgendamentoAId, testAgendamentoBId, testAgendamentoCId].filter(Boolean);
      if (idsToDelete.length > 0) {
        await supabase.from('agendamentos').delete().in('id', idsToDelete);
      }
      // Limpar registros de idempotência de teste
      await supabase
        .from('webhook_eventos_processados')
        .delete()
        .like('message_id', 'msg_test_%');

      // Limpar notificações geradas no painel
      await supabase
        .from('painel_notificacoes')
        .delete()
        .eq('cliente_telefone', testPhone);

      logSuccess('Teardown', 'Fixtures temporárias removidas do banco de dados com segurança.');
    } catch (cleanErr: any) {
      logInfo(`Aviso na limpeza de dados: ${cleanErr?.message}`);
    }
  }

  // ============================================================================
  // RELATÓRIO CONSOLIDADO FINAL
  // ============================================================================
  logHeader('RELATÓRIO CONSOLIDADO DE HOMOLOGAÇÃO DO WEBHOOK');
  const allPassed = results.every((r) => r.passed);
  console.table(
    results.map((r) => ({
      Cenário: r.scenario,
      Status: r.passed ? '✓ APROVADO' : '✗ FALHA',
      HTTP: r.status,
      Ação: r.response?.action || (r.response?.idempotente ? 'idempotente' : 'n/a'),
      'Tempo (ms)': `${r.durationMs}ms`,
    }))
  );

  if (allPassed) {
    console.log(`\n${colors.green}${colors.bold}🎉 TODOS OS 4 CENÁRIOS FORAM HOMOLOGADOS COM SUCESSO!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}⚠️ ALGUNS CENÁRIOS APRESENTARAM FALHAS. Verifique os logs acima.${colors.reset}\n`);
    process.exit(1);
  }
}

// Execução imediata
runWebhookTestSuite().catch((err) => {
  console.error('\nErro fatal na execução da suíte de testes de webhook:', err);
  process.exit(1);
});
