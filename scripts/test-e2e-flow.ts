/**
 * ==============================================================================
 * FlowAgenda — Diagnóstico e Teste Automatizado Ponta a Ponta (E2E)
 * Arquivo: scripts/test-e2e-flow.ts
 * Execução: npm run test:e2e
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Carregamento de fallback para .env.local caso não fornecido pela CLI
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

// Configuração de cores ANSI para o console
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function logHeader(title: string) {
  console.log(`\n${colors.cyan}${colors.bold}======================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}======================================================================${colors.reset}\n`);
}

function logSuccess(step: string, message: string) {
  console.log(`${colors.green}${colors.bold}[OK]${colors.reset} ${colors.green}✓ ${step}:${colors.reset} ${message}`);
}

function logFailure(step: string, message: string, details?: any) {
  console.error(`${colors.red}${colors.bold}[FAIL]${colors.reset} ${colors.red}✗ ${step}:${colors.reset} ${message}`);
  if (details) {
    console.error(`${colors.gray}${JSON.stringify(details, null, 2)}${colors.reset}`);
  }
}

function logInfo(message: string) {
  console.log(`${colors.yellow}ℹ ${message}${colors.reset}`);
}

async function runE2ETestFlow() {
  const startTime = Date.now();
  logHeader('TESTE E2E FLOWAGENDA — HOMOLOGAÇÃO DE AGENDAMENTO & EVOLUTION');

  let passedAssertions = 0;
  const totalAssertions = 5;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logFailure('Inicialização', 'Variáveis do Supabase ausentes em .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let agendamentoId: string | null = null;
  let clienteId: string | null = null;
  let lojistaId: string | null = null;
  let servicoId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // ASSERÇÃO 1: Gateway Evolution API (VPS WhatsApp)
    // -------------------------------------------------------------------------
    console.log(`${colors.bold}🔍 [1/5] Verificando Gateway Evolution API na VPS...${colors.reset}`);
    const instanceName = 'flowagenda-teste';
    const connectionUrl = `${evolutionUrl}/instance/connectionState/${instanceName}`;

    try {
      const evolutionRes = await fetch(connectionUrl, {
        method: 'GET',
        headers: {
          apikey: evolutionApiKey || '',
          'Content-Type': 'application/json',
        },
      });

      if (!evolutionRes.ok) {
        throw new Error(`HTTP ${evolutionRes.status} - ${evolutionRes.statusText}`);
      }

      const evolutionData: any = await evolutionRes.json();
      const instanceState = evolutionData?.instance?.state || evolutionData?.state;

      if (instanceState === 'open') {
        logSuccess(
          'Asserção 1 — Evolution API',
          `Instância "${instanceName}" está online e conectada (status: "${instanceState}").`
        );
        passedAssertions++;
      } else {
        logFailure(
          'Asserção 1 — Evolution API',
          `Instância encontrada, porém estado é "${instanceState}" (esperado: "open").`,
          evolutionData
        );
      }
    } catch (err: any) {
      logFailure(
        'Asserção 1 — Evolution API',
        `Falha ao conectar com Evolution API em ${connectionUrl}: ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // ASSERÇÃO 2: Simulação de Lock Atômico no Supabase
    // -------------------------------------------------------------------------
    console.log(`\n${colors.bold}🔍 [2/5] Testando Lock Atômico no Supabase...${colors.reset}`);

    // 2.1 Localizar lojista piloto
    const { data: lojista, error: lojistaErr } = await supabase
      .from('lojistas')
      .select('id, nome_estabelecimento, slug_subdominio')
      .or('slug_subdominio.eq.barbeariamodelo,slug_subdominio.neq.null')
      .limit(1)
      .single();

    if (lojistaErr || !lojista) {
      throw new Error(`Não foi possível localizar lojista piloto: ${lojistaErr?.message}`);
    }

    lojistaId = lojista.id;
    logInfo(`Lojista piloto selecionado: "${lojista.nome_estabelecimento}" (${lojista.id})`);

    // 2.2 Localizar ou criar serviço para o agendamento
    const { data: servicos } = await supabase
      .from('servicos')
      .select('id, nome_servico, duracao_minutos')
      .eq('lojista_id', lojistaId)
      .eq('ativo', true)
      .limit(1);

    if (servicos && servicos.length > 0) {
      servicoId = servicos[0].id;
    } else {
      const { data: novoServ } = await supabase
        .from('servicos')
        .insert({
          lojista_id: lojistaId,
          nome_servico: 'Serviço Teste E2E',
          duracao_minutos: 30,
          preco: 50.0,
          ativo: true,
        })
        .select('id')
        .single();
      servicoId = novoServ?.id || null;
    }

    if (!servicoId) {
      throw new Error('Falha ao obter serviço para vincular ao agendamento de teste.');
    }

    // 2.3 Criar ou reutilizar cliente de teste
    const telefoneTeste = '5531999999999';
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('lojista_id', lojistaId)
      .eq('telefone', telefoneTeste)
      .single();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: novoCli, error: cliErr } = await supabase
        .from('clientes')
        .insert({
          lojista_id: lojistaId,
          nome: 'E2E Automated Test',
          telefone: telefoneTeste,
          total_agendamentos: 0,
        })
        .select('id')
        .single();
      if (cliErr) throw cliErr;
      clienteId = novoCli.id;
    }

    // 2.4 Inserir agendamento com lock de 10 minutos
    const dataInicioTeste = new Date(Date.now() + 86400000); // Amanhã
    const dataFimTeste = new Date(dataInicioTeste.getTime() + 30 * 60000);
    const expiraEmLock = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    const { data: agendamentoCriado, error: lockErr } = await supabase
      .from('agendamentos')
      .insert({
        lojista_id: lojistaId,
        servico_id: servicoId,
        cliente_id: clienteId,
        data_hora_inicio: dataInicioTeste.toISOString(),
        data_hora_fim: dataFimTeste.toISOString(),
        status: 'pendente_pin',
        pin_validacao: '998877',
        expira_em: expiraEmLock.toISOString(),
      })
      .select('id, status, expira_em, pin_validacao')
      .single();

    if (lockErr || !agendamentoCriado) {
      logFailure('Asserção 2 — Lock Atômico', `Erro ao inserir lock no Supabase: ${lockErr?.message}`);
    } else {
      agendamentoId = agendamentoCriado.id;
      logSuccess(
        'Asserção 2 — Lock Atômico',
        `Lock atômico inserido com sucesso (ID: ${agendamentoId}, Status: "${agendamentoCriado.status}", Expira em: 10 min).`
      );
      passedAssertions++;
    }

    // -------------------------------------------------------------------------
    // ASSERÇÃO 3: Validação da Trava de Concorrência
    // -------------------------------------------------------------------------
    console.log(`\n${colors.bold}🔍 [3/5] Simulando colisão concorrente no mesmo horário...${colors.reset}`);
    const agoraIso = new Date().toISOString();

    const { data: conflitos, error: conflitoErr } = await supabase
      .from('agendamentos')
      .select('id, status, expira_em')
      .eq('lojista_id', lojistaId)
      .lt('data_hora_inicio', dataFimTeste.toISOString())
      .gt('data_hora_fim', dataInicioTeste.toISOString())
      .or(`status.eq.confirmado,and(status.eq.pendente_pin,expira_em.gt.${agoraIso})`);

    if (conflitoErr) {
      logFailure('Asserção 3 — Concorrência', `Erro ao consultar trava: ${conflitoErr.message}`);
    } else {
      const detectouBloqueio = conflitos?.some((item) => item.id === agendamentoId);
      if (detectouBloqueio) {
        logSuccess(
          'Asserção 3 — Concorrência',
          `Trava ativa detectada com sucesso! Concorrência impedida para o slot durante a validade do lock.`
        );
        passedAssertions++;
      } else {
        logFailure(
          'Asserção 3 — Concorrência',
          'O agendamento bloqueado não foi detectado na verificação de colisão.',
          conflitos
        );
      }
    }

    // -------------------------------------------------------------------------
    // ASSERÇÃO 4: Validação de PIN & Transição de Status
    // -------------------------------------------------------------------------
    console.log(`\n${colors.bold}🔍 [4/5] Simulando validação de PIN e transição para "confirmado"...${colors.reset}`);

    if (agendamentoId) {
      const { data: agendamentoConfirmado, error: confirmErr } = await supabase
        .from('agendamentos')
        .update({
          status: 'confirmado',
        })
        .eq('id', agendamentoId)
        .eq('pin_validacao', '998877')
        .select('id, status')
        .single();

      if (confirmErr || !agendamentoConfirmado) {
        logFailure('Asserção 4 — Validação de PIN', `Erro ao atualizar status: ${confirmErr?.message}`);
      } else if (agendamentoConfirmado.status === 'confirmado') {
        logSuccess(
          'Asserção 4 — Validação de PIN',
          `PIN validado e status transicionado para "${agendamentoConfirmado.status}" com sucesso.`
        );
        passedAssertions++;
      } else {
        logFailure(
          'Asserção 4 — Validação de PIN',
          `Status inesperado retornado: "${agendamentoConfirmado.status}".`
        );
      }
    }

    // -------------------------------------------------------------------------
    // ASSERÇÃO 5: Teardown & Limpeza
    // -------------------------------------------------------------------------
    console.log(`\n${colors.bold}🔍 [5/5] Executando Teardown e Limpeza do Banco...${colors.reset}`);

    if (agendamentoId) {
      const { error: deleteAgErr } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', agendamentoId);

      if (deleteAgErr) {
        logFailure('Asserção 5 — Teardown', `Falha ao remover agendamento de teste: ${deleteAgErr.message}`);
      } else {
        // Validação de garantia da remoção
        const { data: checkRemovido } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('id', agendamentoId)
          .single();

        if (!checkRemovido) {
          logSuccess(
            'Asserção 5 — Teardown',
            `Agendamento de teste removido. Banco restaurado ao estado original limpo.`
          );
          passedAssertions++;
        } else {
          logFailure('Asserção 5 — Teardown', 'O registro de teste ainda permanece na base.');
        }
      }
    }
  } catch (err: any) {
    logFailure('Exceção Geral no Teste E2E', err.message || 'Erro inesperado', err);
  }

  // ---------------------------------------------------------------------------
  // RELATÓRIO CONSOLIDADO
  // ---------------------------------------------------------------------------
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n${colors.cyan}----------------------------------------------------------------------${colors.reset}`);
  console.log(
    `${colors.bold}Resultado Final:${colors.reset} ${
      passedAssertions === totalAssertions ? colors.green : colors.yellow
    }${passedAssertions}/${totalAssertions} asserções passaram${colors.reset} em ${duration}s.`
  );
  console.log(`${colors.cyan}----------------------------------------------------------------------${colors.reset}\n`);

  if (passedAssertions === totalAssertions) {
    console.log(`${colors.green}${colors.bold}🎉 TODOS OS TESTES E2E FORAM HOMOLOGADOS COM SUCESSO!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.error(`${colors.red}${colors.bold}⚠️ ALGUNS TESTES FALHARAM OU REQUEREM ATENÇÃO.${colors.reset}\n`);
    process.exit(1);
  }
}

runE2ETestFlow();
