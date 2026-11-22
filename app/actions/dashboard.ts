'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { fetchInstanceConnectionStatus } from '@/lib/evolution';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const DURACOES_PERMITIDAS = [15, 30, 45, 60] as const;

async function syncKnowledgeBaseServicos(dbClient: any, lojistaId: string) {
  try {
    const { data: lojista } = await dbClient
      .from('lojistas')
      .select('id, knowledge_base')
      .eq('id', lojistaId)
      .maybeSingle();

    if (!lojista?.knowledge_base) return;

    const { data: servicosAtivos } = await dbClient
      .from('servicos')
      .select('nome_servico, preco, duracao_minutos')
      .eq('lojista_id', lojistaId)
      .eq('ativo', true)
      .order('nome_servico', { ascending: true });

    const catalogoTexto =
      servicosAtivos && servicosAtivos.length > 0
        ? servicosAtivos
            .map(
              (s: any) =>
                `- **${s.nome_servico}**: R$ ${Number(s.preco || 0)
                  .toFixed(2)
                  .replace('.', ',')} (${s.duracao_minutos} min)`
            )
            .join('\n')
        : '- Consultar tabela de serviços e valores no link de agendamento.';

    const kbAtual: string = lojista.knowledge_base;
    let kbNova = kbAtual;

    if (/## 2\. Serviços e Preços/i.test(kbAtual)) {
      kbNova = kbAtual.replace(
        /(## 2\. Serviços e Preços\r?\n)([\s\S]*?)(?=\r?\n## \d+\.|$)/i,
        `$1${catalogoTexto}\n`
      );
    } else if (/## Catálogo Atualizado de Serviços e Preços/i.test(kbAtual)) {
      kbNova = kbAtual.replace(
        /(## Catálogo Atualizado de Serviços e Preços\r?\n)([\s\S]*?)(?=\r?\n## |$)/i,
        `$1${catalogoTexto}\n`
      );
    } else {
      kbNova = `${kbAtual.trim()}\n\n## Catálogo Atualizado de Serviços e Preços\n${catalogoTexto}`;
    }

    if (kbNova !== kbAtual) {
      await dbClient
        .from('lojistas')
        .update({ knowledge_base: kbNova })
        .eq('id', lojistaId);
    }
  } catch (err) {
    console.warn('[syncKnowledgeBaseServicos] Aviso ao sincronizar serviços na knowledge_base:', err);
  }
}

async function resolveDashboardLojista(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const selectFields =
    'id, nome_estabelecimento, slug_subdominio, ticket_medio_padrao, tier, business_niche';

  if (profile?.role === 'super_admin') {
    const cookieStore = await cookies();
    const impersonateTenantId = cookieStore.get('flow_impersonate_tenant_id')?.value;
    if (impersonateTenantId) {
      const { data: targetLojista } = await supabase
        .from('lojistas')
        .select(selectFields)
        .eq('id', impersonateTenantId)
        .single();
      if (targetLojista) return targetLojista;
    }
  }

  const { data: lojista } = await supabase
    .from('lojistas')
    .select(selectFields)
    .eq('user_id', userId)
    .single();

  return lojista;
}

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const lojista = await resolveDashboardLojista(supabase, user.id);

  if (!lojista) throw new Error('Tenant not found');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isSuperAdmin = profile?.role === 'super_admin';
  const dbClient =
    isSuperAdmin && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : supabase;

  const ticketMedioPadrao = Number(lojista.ticket_medio_padrao) || 65;

  // 1. Busca catálogo de serviços do lojista
  const { data: servicos } = await dbClient
    .from('servicos')
    .select('id, nome_servico, duracao_minutos, intervalo_minutos, preco, ativo')
    .eq('lojista_id', lojista.id)
    .order('nome_servico', { ascending: true });

  const servicoMap = new Map<string, any>(
    servicos?.map((s: any) => [s.id, s]) || []
  );

  // 2. Busca profissionais cadastrados
  const { data: profissionais } = await dbClient
    .from('profissionais')
    .select('id, nome, ativo')
    .eq('lojista_id', lojista.id)
    .order('nome', { ascending: true });

  const profissionalMap = new Map<string, any>(
    profissionais?.map((p: any) => [p.id, p]) || []
  );

  // 2b. Busca clientes do lojista para agendamento manual
  const { data: clientes } = await dbClient
    .from('clientes')
    .select('id, nome, telefone')
    .eq('lojista_id', lojista.id)
    .order('nome', { ascending: true })
    .limit(500);

  // 3. Delimitações temporais para cálculos analíticos
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // 4. Busca agendamentos do lojista (desde o início do mês anterior)
  const { data: todosAgendamentos } = await dbClient
    .from('agendamentos')
    .select(`
      id, data_hora_inicio, data_hora_fim, data_horario, status,
      servico_id, profissional_id, cliente_id, pin_validacao, asaas_payment_id,
      confirmacao_cliente_at, cancelado_origem,
      cliente:clientes(nome, telefone),
      servico:servicos(nome_servico, duracao_minutos, preco),
      profissional:profissionais(nome)
    `)
    .eq('lojista_id', lojista.id)
    .gte('data_hora_inicio', startOfLastMonth.toISOString())
    .order('data_hora_inicio', { ascending: true });

  const agendamentosList = todosAgendamentos || [];

  // 5. Agendamentos do Mês Atual vs Mês Anterior
  const currentMonthAppointments = agendamentosList.filter((a: any) => {
    const dt = new Date(a.data_hora_inicio || a.data_horario);
    return dt >= startOfCurrentMonth && dt < startOfNextMonth;
  });

  const lastMonthAppointments = agendamentosList.filter((a: any) => {
    const dt = new Date(a.data_hora_inicio || a.data_horario);
    return dt >= startOfLastMonth && dt < startOfCurrentMonth;
  });

  // KPI 1: Faturamento Previsto no Mês (confirmados/concluídos ou ativos no lock)
  const faturamentoPrevistoMes = currentMonthAppointments
    .filter((a: any) =>
      ['confirmado', 'concluido', 'locked', 'awaiting_payment_confirmation'].includes(a.status)
    )
    .reduce((acc: number, a: any) => {
      const s = a.servico_id ? servicoMap.get(a.servico_id) : a.servico;
      const preco = Number(s?.preco) || ticketMedioPadrao;
      return acc + preco;
    }, 0);

  // KPI 2: Agendamentos do Mês e Variação %
  const agendamentosMes = currentMonthAppointments.length;
  const agendamentosMesAnterior = lastMonthAppointments.length;
  let variacaoPercentual = 0;
  if (agendamentosMesAnterior > 0) {
    variacaoPercentual = Math.round(
      ((agendamentosMes - agendamentosMesAnterior) / agendamentosMesAnterior) * 100
    );
  } else {
    variacaoPercentual = agendamentosMes > 0 ? 100 : 0;
  }

  // KPI 3: Fechados pela Secretária IA (WhatsApp Bot)
  const fechadosSecretariaIa = currentMonthAppointments.filter(
    (a: any) =>
      Boolean(a.pin_validacao) ||
      Boolean(a.confirmacao_cliente_at) ||
      a.cancelado_origem === 'whatsapp_bot'
  ).length;

  // KPI 4: Taxa de Comparecimento (%)
  const concluidosMes = currentMonthAppointments.filter((a: any) => a.status === 'concluido').length;
  const canceladosMes = currentMonthAppointments.filter((a: any) => a.status === 'cancelado').length;
  const confirmadosMes = currentMonthAppointments.filter((a: any) => a.status === 'confirmado').length;
  const totalComparecimentoBase = concluidosMes + canceladosMes;
  let taxaComparecimento = 100;
  if (totalComparecimentoBase > 0) {
    taxaComparecimento = Math.min(
      100,
      Math.max(0, Math.round((concluidosMes / totalComparecimentoBase) * 100))
    );
  } else if (confirmadosMes > 0) {
    taxaComparecimento = 95; // Assiduidade prevista saudável
  }

  // 6. Gráfico de Área Suave: Evolução dos Últimos 14 Dias
  const evolucao14Dias: Array<{
    data: string;
    label: string;
    faturamento: number;
    agendamentos: number;
  }> = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ymd = d.toISOString().split('T')[0];
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    const dayAppointments = agendamentosList.filter((a: any) => {
      const aDate = (a.data_hora_inicio || a.data_horario || '').split('T')[0];
      return aDate === ymd;
    });

    const faturamentoDia = dayAppointments
      .filter((a: any) =>
        ['confirmado', 'concluido', 'locked', 'awaiting_payment_confirmation'].includes(a.status)
      )
      .reduce((acc: number, a: any) => {
        const s = a.servico_id ? servicoMap.get(a.servico_id) : a.servico;
        const preco = Number(s?.preco) || ticketMedioPadrao;
        return acc + preco;
      }, 0);

    evolucao14Dias.push({
      data: ymd,
      label,
      faturamento: Number(faturamentoDia.toFixed(2)),
      agendamentos: dayAppointments.length,
    });
  }

  // 7. Gráfico de Rosca/Donut: Canais de Aquisição
  let iaCount = 0;
  let linkPublicoCount = 0;
  let manualCount = 0;

  for (const a of currentMonthAppointments) {
    if (a.pin_validacao || a.confirmacao_cliente_at || a.cancelado_origem === 'whatsapp_bot') {
      iaCount++;
    } else if (a.asaas_payment_id || a.cliente_id) {
      linkPublicoCount++;
    } else {
      manualCount++;
    }
  }

  const canais = [
    { name: 'Secretária IA', value: iaCount, color: '#88C0D0' },
    { name: 'Link Público', value: linkPublicoCount, color: '#A3BE8C' },
    { name: 'Agendamento Manual', value: manualCount, color: '#B48EAD' },
  ];

  // 8. Medidor Semicircular: Ocupação da Agenda
  const activeProsCount = Math.max(
    profissionais?.filter((p: any) => p.ativo).length || 1,
    1
  );
  const capacidadeHoras = 8 * 22 * activeProsCount; // 8h/dia * 22 dias comerciais

  const minutosOcupados = currentMonthAppointments
    .filter((a: any) => ['confirmado', 'concluido'].includes(a.status))
    .reduce((acc: number, a: any) => {
      const s = a.servico_id ? servicoMap.get(a.servico_id) : a.servico;
      return acc + (Number(s?.duracao_minutos) || 45);
    }, 0);

  const horasAgendadas = Number((minutosOcupados / 60).toFixed(1));
  const ocupacaoPercentual = Math.min(
    Math.round((horasAgendadas / Math.max(capacidadeHoras, 1)) * 100),
    100
  );

  // 9. Barras Horizontais: Top Serviços
  const servicoCounts = new Map<string, { nome: string; quantidade: number; receita: number }>();
  for (const a of currentMonthAppointments) {
    const s = a.servico_id ? servicoMap.get(a.servico_id) : a.servico;
    const nome = s?.nome_servico || 'Serviço Geral';
    const preco = Number(s?.preco) || ticketMedioPadrao;
    const curr = servicoCounts.get(nome) || { nome, quantidade: 0, receita: 0 };
    curr.quantidade += 1;
    if (['confirmado', 'concluido'].includes(a.status)) {
      curr.receita += preco;
    }
    servicoCounts.set(nome, curr);
  }
  const topServicos = Array.from(servicoCounts.values())
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  // 10. Barras Horizontais: Top Profissionais
  const proCounts = new Map<string, { nome: string; agendamentos: number }>();
  for (const a of currentMonthAppointments) {
    const p = a.profissional_id ? profissionalMap.get(a.profissional_id) : a.profissional;
    const nome = p?.nome || 'Profissional Titular';
    const curr = proCounts.get(nome) || { nome, agendamentos: 0 };
    curr.agendamentos += 1;
    proCounts.set(nome, curr);
  }
  const topProfissionais = Array.from(proCounts.values())
    .sort((a, b) => b.agendamentos - a.agendamentos)
    .slice(0, 5);

  // 11. Tabela Moderna: Agendamentos do Dia
  const todayYmd = now.toISOString().split('T')[0];
  const agendamentosHoje = agendamentosList
    .filter((a: any) => {
      const aDate = (a.data_hora_inicio || a.data_horario || '').split('T')[0];
      return aDate === todayYmd;
    })
    .sort(
      (a: any, b: any) =>
        new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime()
    )
    .map((agendamento: any) => {
      const horaInicio = new Date(agendamento.data_hora_inicio).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const horaFim = new Date(agendamento.data_hora_fim).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const s = agendamento.servico_id
        ? servicoMap.get(agendamento.servico_id)
        : agendamento.servico;
      const p = agendamento.profissional_id
        ? profissionalMap.get(agendamento.profissional_id)
        : agendamento.profissional;

      return {
        id: agendamento.id,
        horaInicio,
        horaFim,
        clienteNome: agendamento.cliente?.nome || 'Cliente',
        clienteTelefone: agendamento.cliente?.telefone || '',
        servicoNome: s?.nome_servico || 'Serviço',
        servicoDuracao: s?.duracao_minutos || 45,
        servicoPreco: Number(s?.preco) || ticketMedioPadrao,
        profissionalNome: p?.nome || 'Titular',
        status: agendamento.status,
      };
    });

  // 12. Status da Instância do WhatsApp
  const { data: configRobo } = await dbClient
    .from('configuracoes_robo')
    .select('instance_name')
    .eq('lojista_id', lojista.id)
    .single();

  let whatsappStatus = null;
  if (configRobo?.instance_name) {
    whatsappStatus = await fetchInstanceConnectionStatus(configRobo.instance_name);
  }

  return {
    lojista: {
      id: lojista.id,
      nome_estabelecimento: lojista.nome_estabelecimento,
      slug_subdominio: lojista.slug_subdominio,
      ticket_medio_padrao: ticketMedioPadrao,
      tier: lojista.tier || 'tier_1',
      business_niche: lojista.business_niche || null,
    },
    lojistaId: lojista.id,
    whatsappStatus,
    kpis: {
      faturamentoPrevistoMes,
      agendamentosMes,
      variacaoPercentual,
      fechadosSecretariaIa,
      taxaComparecimento,
      ticketMedio: ticketMedioPadrao,
    },
    evolucao14Dias,
    canais,
    ocupacao: {
      percentual: ocupacaoPercentual,
      horasAgendadas,
      capacidadeHoras,
    },
    topServicos,
    topProfissionais,
    agendamentosHoje,
    servicos: (servicos || []).filter((s: any) => s.ativo !== false),
    profissionais: (profissionais || []).filter((p: any) => p.ativo !== false),
    clientes: clientes || [],
    // Compatibilidade com código legado
    agendamentos: agendamentosHoje,
  };
}

export async function getServicosData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const lojista = await resolveDashboardLojista(supabase, user.id);

  if (!lojista) throw new Error('Tenant not found');

  const { data: servicos } = await supabase
    .from('servicos')
    .select('*')
    .eq('lojista_id', lojista.id)
    .order('created_at', { ascending: false });

  return { servicos, lojistaId: lojista.id };
}

export async function addServicoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const lojista = await resolveDashboardLojista(supabase, user.id);
  if (!lojista) throw new Error('Tenant not found');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const dbClient =
    profile?.role === 'super_admin' && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : supabase;

  const nome_servico = (formData.get('nome_servico') as string)?.trim();
  const duracao_minutos = parseInt(formData.get('duracao_minutos') as string, 10);
  const preco = parseFloat(formData.get('preco') as string);
  const ativo = formData.get('ativo') === 'on';

  if (!DURACOES_PERMITIDAS.includes(duracao_minutos as any)) {
    throw new Error('Duração inválida. Valores permitidos: 15, 30, 45 ou 60 minutos.');
  }

  const { error } = await dbClient.from('servicos').insert({
    lojista_id: lojista.id,
    nome_servico,
    duracao_minutos,
    preco,
    ativo,
  });

  if (error) throw new Error(error.message);

  // Sincroniza automaticamente o catálogo atualizado dentro de lojistas.knowledge_base
  await syncKnowledgeBaseServicos(dbClient, lojista.id);

  return { success: true };
}

export async function createDashboardAgendamentoAction(input: {
  clienteId: string;
  servicoId: string;
  profissionalId: string;
  dataYmd: string;
  horaHm: string;
  petId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Não autorizado.' };

  const lojista = await resolveDashboardLojista(supabase, user.id);
  if (!lojista) return { success: false, error: 'Estabelecimento não encontrado.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const dbClient =
    profile?.role === 'super_admin' && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : supabase;

  if (!input.clienteId || !input.servicoId || !input.profissionalId || !input.dataYmd || !input.horaHm) {
    return { success: false, error: 'Preencha cliente, serviço, profissional, data e horário.' };
  }

  const { data: servico } = await dbClient
    .from('servicos')
    .select('id, duracao_minutos, intervalo_minutos, ativo')
    .eq('id', input.servicoId)
    .eq('lojista_id', lojista.id)
    .maybeSingle();

  if (!servico || !servico.ativo) {
    return { success: false, error: 'Serviço selecionado inválido ou inativo.' };
  }

  const duracao = Number(servico.duracao_minutos);
  if (!DURACOES_PERMITIDAS.includes(duracao as any)) {
    return { success: false, error: 'Duração de serviço inválida. Permitido: 15, 30, 45 ou 60 min.' };
  }

  const intervalo = Number(servico.intervalo_minutos) || 0;
  const totalMinutos = duracao + intervalo;

  const [year, month, day] = input.dataYmd.split('-').map(Number);
  const [hour, minute] = input.horaHm.split(':').map(Number);

  // Horário de Brasília (UTC-3)
  const startDate = new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0));
  const endDate = new Date(startDate.getTime() + totalMinutos * 60000);
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  const agoraIso = new Date().toISOString();

  // Checagem de conflito filtrando por lojista_id E profissional_id
  const { data: conflitos } = await dbClient
    .from('agendamentos')
    .select('id')
    .eq('lojista_id', lojista.id)
    .eq('profissional_id', input.profissionalId)
    .lt('data_hora_inicio', endIso)
    .gt('data_hora_fim', startIso)
    .or(`status.eq.confirmado,and(status.eq.pendente_pin,expira_em.gt.${agoraIso})`);

  if (conflitos && conflitos.length > 0) {
    return {
      success: false,
      error: 'Já existe um agendamento ativo para este profissional no horário selecionado.',
    };
  }

  const insertPayload: Record<string, any> = {
    lojista_id: lojista.id,
    cliente_id: input.clienteId,
    servico_id: input.servicoId,
    profissional_id: input.profissionalId,
    data_hora_inicio: startIso,
    data_hora_fim: endIso,
    status: 'confirmado',
  };

  if (input.petId) {
    insertPayload.pet_id = input.petId;
  }

  const { error: insertError } = await dbClient
    .from('agendamentos')
    .insert(insertPayload);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
