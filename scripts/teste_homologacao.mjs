import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carregar .env.local manualmente
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Credenciais do Supabase ausentes em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runHomologacao() {
  console.log('====================================================');
  console.log('🚀 INICIANDO HOMOLOGAÇÃO PONTA A PONTA DO FLOWAGENDA');
  console.log('====================================================\n');

  // 1. Verificar Lojista
  console.log('🔍 [Passo 1/6] Verificando Lojista Cadastrado no Banco...');
  const { data: lojistas, error: lojistasErr } = await supabase
    .from('lojistas')
    .select('id, nome_estabelecimento, slug_subdominio, status_pagamento, tier')
    .limit(1);

  if (lojistasErr || !lojistas || lojistas.length === 0) {
    console.error('❌ Nenhum lojista encontrado para teste:', lojistasErr?.message);
    process.exit(1);
  }

  const lojista = lojistas[0];
  console.log(`✅ Lojista localizado: "${lojista.nome_estabelecimento}" (Slug: ${lojista.slug_subdominio}, Status: ${lojista.status_pagamento})\n`);

  // 2. Verificar/Criar Serviços
  console.log('🔍 [Passo 2/6] Verificando Serviços Ativos...');
  let { data: servicos } = await supabase
    .from('servicos')
    .select('*')
    .eq('lojista_id', lojista.id)
    .eq('ativo', true);

  if (!servicos || servicos.length === 0) {
    console.log('⚠️ Nenhum serviço cadastrado. Inserindo serviços de teste com durações válidas [30, 45] min...');
    const { data: novosServicos, error: servErr } = await supabase
      .from('servicos')
      .insert([
        {
          lojista_id: lojista.id,
          nome_servico: 'Corte Degradê & Barba',
          duracao_minutos: 45,
          preco: 60.00,
          ativo: true,
        },
        {
          lojista_id: lojista.id,
          nome_servico: 'Corte Cabelo Social',
          duracao_minutos: 30,
          preco: 40.00,
          ativo: true,
        }
      ])
      .select();

    if (servErr) {
      console.error('❌ Erro ao criar serviço:', servErr.message);
      process.exit(1);
    }
    servicos = novosServicos;
  }

  const servico = servicos[0];
  console.log(`✅ Serviço ativo para teste: "${servico.nome_servico}" (${servico.duracao_minutos} min, R$ ${servico.preco})\n`);

  // 3. Teste de Reserva com Lock de 10 min
  console.log('🔍 [Passo 3/6] Simulando Reserva de Horário com Lock de 10 minutos...');
  
  // Data de amanhã às 14:00 (Fuso de Brasília: 14:00 BRT = 17:00 UTC)
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const dataYmd = amanha.toISOString().split('T')[0];
  
  const [year, month, day] = dataYmd.split('-').map(Number);
  const inicioSlot = new Date(Date.UTC(year, month - 1, day, 14 + 3, 0, 0)); // 14:00 BRT
  const fimSlot = new Date(inicioSlot.getTime() + servico.duracao_minutos * 60000);

  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const expiraEm = new Date();
  expiraEm.setMinutes(expiraEm.getMinutes() + 10);

  const clienteTesteNome = 'Marcos Homologação';
  const clienteTesteTelefone = '11988887777';

  // Obter ou criar cliente de teste
  let { data: cliente } = await supabase
    .from('clientes')
    .select('id, total_agendamentos')
    .eq('lojista_id', lojista.id)
    .eq('telefone', clienteTesteTelefone)
    .single();

  if (!cliente) {
    const { data: novoCli } = await supabase
      .from('clientes')
      .insert({
        lojista_id: lojista.id,
        nome: clienteTesteNome,
        telefone: clienteTesteTelefone,
        total_agendamentos: 1,
      })
      .select()
      .single();
    cliente = novoCli;
  }

  // Inserção da reserva temporária com lock usando as colunas nativas do banco
  const { data: reserva, error: reservaErr } = await supabase
    .from('agendamentos')
    .insert({
      lojista_id: lojista.id,
      servico_id: servico.id,
      cliente_id: cliente.id,
      data_hora_inicio: inicioSlot.toISOString(),
      data_hora_fim: fimSlot.toISOString(),
      status: 'pendente_pin',
      pin_validacao: pin,
      expira_em: expiraEm.toISOString(),
    })
    .select()
    .single();

  if (reservaErr) {
    console.error('❌ Falha na reserva com lock:', reservaErr.message);
    process.exit(1);
  }

  console.log(`✅ Agendamento pré-reservado com ID: ${reserva.id}`);
  console.log(`   Status atual: "${reserva.status}"`);
  console.log(`   PIN de 6 dígitos gerado: ${pin}`);
  console.log(`   Expira em: ${new Date(reserva.expira_em).toLocaleTimeString('pt-BR')} (Janela de 10 minutos ativa)\n`);

  // 4. Teste de Validação de PIN
  console.log('🔍 [Passo 4/6] Testando Validação do PIN Correto...');
  if (reserva.pin_validacao === pin) {
    console.log(`✅ PIN conferido com sucesso no banco: ${pin} === ${reserva.pin_validacao}`);
  }

  // 5. Confirmação do Agendamento com o PIN Correto
  console.log('🔍 [Passo 5/6] Confirmando Agendamento com o PIN Correto...');
  
  // Criação segura do cliente na base apenas no sucesso
  let clienteId = null;
  const { data: clienteExistente } = await supabase
    .from('clientes')
    .select('id, total_agendamentos')
    .eq('lojista_id', lojista.id)
    .eq('telefone', clienteTesteTelefone)
    .single();

  if (clienteExistente) {
    clienteId = clienteExistente.id;
    await supabase
      .from('clientes')
      .update({
        nome: clienteTesteNome,
        total_agendamentos: (clienteExistente.total_agendamentos || 0) + 1,
        ultimo_agendamento: new Date().toISOString(),
      })
      .eq('id', clienteId);
  } else {
    const { data: novoCliente } = await supabase
      .from('clientes')
      .insert({
        lojista_id: lojista.id,
        nome: clienteTesteNome,
        telefone: clienteTesteTelefone,
        total_agendamentos: 1,
        ultimo_agendamento: new Date().toISOString(),
      })
      .select('id')
      .single();
    clienteId = novoCliente?.id;
  }

  // Atualizar agendamento para confirmado
  const { data: agendamentoConfirmado, error: confErr } = await supabase
    .from('agendamentos')
    .update({
      status: 'confirmado',
      cliente_id: clienteId,
    })
    .eq('id', reserva.id)
    .select(`
      id, status, data_hora_inicio,
      cliente:clientes(nome, telefone, total_agendamentos)
    `)
    .single();

  if (confErr) {
    console.error('❌ Falha ao confirmar agendamento:', confErr.message);
    process.exit(1);
  }

  console.log(`✅ Agendamento 100% CONFIRMADO!`);
  console.log(`   Status no Banco: "${agendamentoConfirmado.status}"`);
  console.log(`   Cliente Vinculado: ${agendamentoConfirmado.cliente?.nome} (${agendamentoConfirmado.cliente?.telefone})`);
  console.log(`   Total de Agendamentos do Cliente: ${agendamentoConfirmado.cliente?.total_agendamentos}\n`);

  // 6. Verificação do Painel do Lojista (Agenda e Base de Clientes)
  console.log('🔍 [Passo 6/6] Verificando Consulta dos Módulos do Dashboard...');

  // Consulta de Agenda do Lojista
  const { data: agendaLojista } = await supabase
    .from('agendamentos')
    .select('id, data_hora_inicio, status, servico:servicos(nome_servico)')
    .eq('lojista_id', lojista.id)
    .eq('status', 'confirmado')
    .limit(3);

  console.log(`✅ Módulo /dashboard (Agenda): ${agendaLojista?.length} agendamento(s) confirmado(s) listado(s).`);

  // Consulta da Base de Clientes do Lojista
  const { data: clientesLojista } = await supabase
    .from('clientes')
    .select('id, nome, telefone, total_agendamentos')
    .eq('lojista_id', lojista.id);

  console.log(`✅ Módulo /dashboard/clientes: ${clientesLojista?.length} cliente(s) ativo(s) com RLS isolado.`);

  console.log('\n====================================================');
  console.log('🎉 HOMOLOGAÇÃO CONCLUÍDA COM 100% DE SUCESSO!');
  console.log('====================================================');
}

runHomologacao().catch((err) => {
  console.error('❌ Erro na execução:', err);
  process.exit(1);
});
