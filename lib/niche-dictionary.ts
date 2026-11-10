/**
 * ==============================================================================
 * FlowAgenda — Dicionário Dinâmico Multi-Nicho (Data-Driven UI)
 * Arquivo: lib/niche-dictionary.ts
 * ==============================================================================
 *
 * Adapta os rótulos da interface (CRM, Kanban, Tabelas, Filtros e Modais)
 * conforme o `business_niche` configurado pelo lojista, mantendo fallback
 * seguro para "Cliente", "Profissional" e "Agendamento".
 */

export interface NicheDictionary {
  nicheKey: string;
  clienteSingular: string;
  clientePlural: string;
  profissionalSingular: string;
  profissionalPlural: string;
  agendamentoSingular: string;
  agendamentoPlural: string;
  visitaSingular: string;
  visitaPlural: string;
  historicoLabel: string;
  etapasKanban: {
    lead: string;
    agendado: string;
    atendido: string;
    no_show: string;
    fidelizado: string;
  };
  sugestoesTags: string[];
  sugestoesMetadataKeys: string[];
}

const DEFAULT_DICTIONARY: NicheDictionary = {
  nicheKey: 'default',
  clienteSingular: 'Cliente',
  clientePlural: 'Clientes',
  profissionalSingular: 'Profissional',
  profissionalPlural: 'Profissionais',
  agendamentoSingular: 'Agendamento',
  agendamentoPlural: 'Agendamentos',
  visitaSingular: 'visita',
  visitaPlural: 'visitas',
  historicoLabel: 'Histórico de Procedimentos',
  etapasKanban: {
    lead: 'Novos Contatos',
    agendado: 'Agendados',
    atendido: 'Atendidos',
    no_show: 'Faltas / No-Show',
    fidelizado: 'Fidelizados',
  },
  sugestoesTags: ['VIP', 'Pontual', 'Recorrente', 'Sensível', 'Indicação'],
  sugestoesMetadataKeys: ['preferencia_horario', 'profissional_preferido', 'observacao_ia'],
};

export function getNicheDictionary(businessNiche?: string | null): NicheDictionary {
  if (!businessNiche || typeof businessNiche !== 'string') {
    return DEFAULT_DICTIONARY;
  }

  const normalized = businessNiche
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // 1. Clínica / Dentista / Odontologia / Saúde
  if (
    normalized.includes('dent') ||
    normalized.includes('odonto') ||
    normalized.includes('clinica') ||
    normalized.includes('medico') ||
    normalized.includes('saude') ||
    normalized.includes('fisio')
  ) {
    return {
      nicheKey: 'clinica_odonto',
      clienteSingular: 'Paciente',
      clientePlural: 'Pacientes',
      profissionalSingular: 'Dentista / Especialista',
      profissionalPlural: 'Dentistas / Especialistas',
      agendamentoSingular: 'Consulta',
      agendamentoPlural: 'Consultas',
      visitaSingular: 'consulta',
      visitaPlural: 'consultas',
      historicoLabel: 'Histórico de Atendimento',
      etapasKanban: {
        lead: 'Novos Pacientes',
        agendado: 'Consultas Marcadas',
        atendido: 'Pacientes Atendidos',
        no_show: 'Faltas / No-Show',
        fidelizado: 'Em Retorno / Fidelizados',
      },
      sugestoesTags: [
        'Primeira Consulta',
        'Limpeza / Profilaxia',
        'Clareamento',
        'Ortodontia',
        'Implante',
        'Sensível',
        'Pontual',
      ],
      sugestoesMetadataKeys: [
        'convenio_ou_particular',
        'interesse_procedimento',
        'turno_preferido',
        'dentista_preferido',
      ],
    };
  }

  // 2. Barbearia
  if (normalized.includes('barbearia') || normalized.includes('barber')) {
    return {
      nicheKey: 'barbearia',
      clienteSingular: 'Cliente',
      clientePlural: 'Clientes',
      profissionalSingular: 'Barbeiro',
      profissionalPlural: 'Barbeiros',
      agendamentoSingular: 'Agendamento',
      agendamentoPlural: 'Agendamentos',
      visitaSingular: 'corte/visita',
      visitaPlural: 'cortes/visitas',
      historicoLabel: 'Histórico de Cortes & Estilo',
      etapasKanban: {
        lead: 'Novos Contatos',
        agendado: 'Agendados',
        atendido: 'Atendidos',
        no_show: 'Faltas / No-Show',
        fidelizado: 'Fidelizados / Clube',
      },
      sugestoesTags: [
        'VIP',
        'Barba Terapia',
        'Corte Degradê',
        'Corte na Tesoura',
        'Sobrancelha',
        'Pontual',
        'Platinado',
      ],
      sugestoesMetadataKeys: [
        'estilo_corte',
        'barbeiro_preferido',
        'bebida_preferida',
        'frequencia_corte',
      ],
    };
  }

  // 3. Salão de Beleza
  if (
    normalized.includes('salao') ||
    normalized.includes('beleza') ||
    normalized.includes('cabeleireir') ||
    normalized.includes('manicure')
  ) {
    return {
      nicheKey: 'salao_beleza',
      clienteSingular: 'Cliente',
      clientePlural: 'Clientes',
      profissionalSingular: 'Profissional',
      profissionalPlural: 'Profissionais',
      agendamentoSingular: 'Agendamento',
      agendamentoPlural: 'Agendamentos',
      visitaSingular: 'atendimento',
      visitaPlural: 'atendimentos',
      historicoLabel: 'Histórico de Procedimentos & Beleza',
      etapasKanban: {
        lead: 'Novos Contatos',
        agendado: 'Horários Marcados',
        atendido: 'Atendidas',
        no_show: 'Faltas / No-Show',
        fidelizado: 'Fidelizadas / Recorrentes',
      },
      sugestoesTags: [
        'VIP',
        'Mechas / Loiro',
        'Escova / Hidratação',
        'Manicure & Pedicure',
        'Design de Sobrancelha',
        'Dia da Noiva',
        'Pontual',
      ],
      sugestoesMetadataKeys: [
        'procedimento_preferido',
        'profissional_preferida',
        'tipo_cabelo_quimica',
        'frequencia_retorno',
      ],
    };
  }

  // 4. Pet Shop / Clínica Veterinária
  if (
    normalized.includes('pet') ||
    normalized.includes('vet') ||
    normalized.includes('banho') ||
    normalized.includes('tosa')
  ) {
    return {
      nicheKey: 'pet_shop',
      clienteSingular: 'Tutor / Pet',
      clientePlural: 'Tutores / Pets',
      profissionalSingular: 'Groomer / Veterinário',
      profissionalPlural: 'Groomers / Veterinários',
      agendamentoSingular: 'Atendimento Pet',
      agendamentoPlural: 'Atendimentos Pet',
      visitaSingular: 'banho/consulta',
      visitaPlural: 'banhos/consultas',
      historicoLabel: 'Histórico de Banho, Tosa & Veterinária',
      etapasKanban: {
        lead: 'Novos Tutores',
        agendado: 'Banhos / Consultas Marcadas',
        atendido: 'Pets Atendidos',
        no_show: 'Faltas / No-Show',
        fidelizado: 'Clube / Pacote Mensal',
      },
      sugestoesTags: [
        'Banho & Tosa',
        'Tosa Higiênica',
        'Pacote Mensal',
        'Consulta Veterinária',
        'Vacinação',
        'Porte Pequeno',
        'Porte Grande',
      ],
      sugestoesMetadataKeys: [
        'nome_pet',
        'raca_porte',
        'temperamento_observacoes',
        'pacote_banho',
      ],
    };
  }

  // 5. Estética & Spa
  if (
    normalized.includes('estetica') ||
    normalized.includes('spa') ||
    normalized.includes('studio')
  ) {
    return {
      nicheKey: 'estetica_beleza',
      clienteSingular: 'Cliente',
      clientePlural: 'Clientes',
      profissionalSingular: 'Especialista',
      profissionalPlural: 'Especialistas',
      agendamentoSingular: 'Sessão',
      agendamentoPlural: 'Sessões',
      visitaSingular: 'sessão',
      visitaPlural: 'sessões',
      historicoLabel: 'Histórico de Protocolos & Sessões',
      etapasKanban: {
        lead: 'Novos Contatos',
        agendado: 'Sessões Agendadas',
        atendido: 'Sessões Realizadas',
        no_show: 'Faltas / No-Show',
        fidelizado: 'Fidelizadas / Pacote',
      },
      sugestoesTags: [
        'VIP',
        'Limpeza de Pele',
        'Laser',
        'Drenagem',
        'Mechas / Loiro',
        'Pele Sensível',
        'Pacote Ativo',
      ],
      sugestoesMetadataKeys: [
        'procedimento_interesse',
        'especialista_preferida',
        'tipo_pele_cabelo',
        'pacote_sessoes',
      ],
    };
  }

  // 4. Oficina / Estética Automotiva
  if (
    normalized.includes('oficina') ||
    normalized.includes('auto') ||
    normalized.includes('mecanica') ||
    normalized.includes('car')
  ) {
    return {
      nicheKey: 'automotivo',
      clienteSingular: 'Cliente',
      clientePlural: 'Clientes',
      profissionalSingular: 'Consultor / Técnico',
      profissionalPlural: 'Consultores / Técnicos',
      agendamentoSingular: 'Ordem de Serviço',
      agendamentoPlural: 'Ordens de Serviço',
      visitaSingular: 'atendimento',
      visitaPlural: 'atendimentos',
      historicoLabel: 'Histórico de Serviços / Veículo',
      etapasKanban: {
        lead: 'Novos Orçamentos',
        agendado: 'OS Agendadas',
        atendido: 'Serviços Concluídos',
        no_show: 'Não Compareceu',
        fidelizado: 'Clientes Recorrentes',
      },
      sugestoesTags: [
        'Revisão',
        'Polimento Técnico',
        'Vitrificação',
        'Higienização Interna',
        'Frota / VIP',
      ],
      sugestoesMetadataKeys: ['modelo_veiculo', 'placa', 'servico_solicitado', 'ano_veiculo'],
    };
  }

  // 5. Personal / Academia / Pilates / Educação
  if (
    normalized.includes('academia') ||
    normalized.includes('pilates') ||
    normalized.includes('personal') ||
    normalized.includes('escola') ||
    normalized.includes('aula')
  ) {
    return {
      nicheKey: 'educacao_fitness',
      clienteSingular: 'Aluno',
      clientePlural: 'Alunos',
      profissionalSingular: 'Instrutor',
      profissionalPlural: 'Instrutores',
      agendamentoSingular: 'Aula / Sessão',
      agendamentoPlural: 'Aulas / Sessões',
      visitaSingular: 'aula',
      visitaPlural: 'aulas',
      historicoLabel: 'Histórico de Aulas & Evolução',
      etapasKanban: {
        lead: 'Aula Experimental',
        agendado: 'Aulas Agendadas',
        atendido: 'Aulas Concluídas',
        no_show: 'Faltas',
        fidelizado: 'Alunos Ativos',
      },
      sugestoesTags: ['Experimental', 'Plano Mensal', 'Plano Anual', 'Manhã', 'Noite'],
      sugestoesMetadataKeys: ['objetivo_treino', 'horario_preferido', 'instrutor_preferido'],
    };
  }

  return DEFAULT_DICTIONARY;
}

