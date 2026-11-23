import { NicheDictionary } from '@/lib/niche-dictionary';
import { EspeciePet, PortePet } from '@/types/niche';

/**
 * ==============================================================================
 * FlowAgenda — Contexto e Pré-Triagem Multi-Nicho para Secretária IA
 * Arquivo: lib/ai-niche-context.ts
 * ==============================================================================
 */

export interface ClienteBasico {
  id: string;
  nome: string;
  telefone: string;
}

function normalizeEspecie(raw?: string | null): EspeciePet {
  const val = (raw || '').toLowerCase().trim();
  if (val.includes('gat') || val.includes('felin')) return 'gato';
  if (val.includes('ave') || val.includes('passar') || val.includes('calopsita')) return 'ave';
  if (val.includes('roed') || val.includes('hamster') || val.includes('coelh')) return 'roedor';
  if (val.includes('cachor') || val.includes('cao') || val.includes('cão') || val.includes('dog')) return 'cachorro';
  return 'outro';
}

function normalizePorte(raw?: string | null): PortePet | null {
  const val = (raw || '').toLowerCase().trim();
  if (!val) return null;
  if (val.includes('peq') || val.includes('mini')) return 'pequeno';
  if (val.includes('med')) return 'medio';
  if (val.includes('gig')) return 'gigante';
  if (val.includes('gran')) return 'grande';
  return null;
}

/**
 * Localiza cliente pelo telefone (match exato ou últimos 8 dígitos) dentro do tenant.
 */
export async function resolveClienteByPhone(
  supabase: any,
  lojistaId: string,
  rawPhone: string
): Promise<ClienteBasico | null> {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits || digits.length < 8) return null;

  const ultimos8 = digits.slice(-8);

  const { data: exact } = await supabase
    .from('clientes')
    .select('id, nome, telefone')
    .eq('lojista_id', lojistaId)
    .eq('telefone', digits)
    .limit(1)
    .maybeSingle();

  if (exact) return exact as ClienteBasico;

  const { data: approx } = await supabase
    .from('clientes')
    .select('id, nome, telefone')
    .eq('lojista_id', lojistaId)
    .like('telefone', `%${ultimos8}`)
    .limit(1)
    .maybeSingle();

  return (approx as ClienteBasico) || null;
}

/**
 * Carrega contexto de pets (pet_shop) ou resumo clínico confidencial (dentista / clinica_estetica)
 * para enriquecer o System Prompt da Secretária IA.
 */
export async function loadNicheClientContext(params: {
  supabase: any;
  lojistaId: string;
  clienteId: string | null;
  nicheDict: NicheDictionary;
}): Promise<{ contextText: string; triagemInstructions: string }> {
  const { supabase, lojistaId, clienteId, nicheDict } = params;

  const contextLines: string[] = [];
  let triagemInstructions = '';

  // 1. Nicho Pet Shop
  if (nicheDict.features.hasPets) {
    let pets: any[] = [];
    if (clienteId) {
      const { data } = await supabase
        .from('pets')
        .select('nome, especie, raca, porte, docilidade, alergias_observacoes')
        .eq('lojista_id', lojistaId)
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(10);
      pets = data || [];
    }

    if (pets.length > 0) {
      const resumoPets = pets
        .map((p) => {
          const partes = [p.especie, p.raca, p.porte ? `Porte ${p.porte}` : null].filter(Boolean);
          const alerta =
            p.docilidade === 'arisco' || p.docilidade === 'morde'
              ? ` [Temperamento: ${p.docilidade}]`
              : '';
          const alergia = p.alergias_observacoes ? ` [Obs/Alergia: ${p.alergias_observacoes}]` : '';
          return `${p.nome} (${partes.join(', ')})${alerta}${alergia}`;
        })
        .join('; ');
      contextLines.push(`Tutor possui os seguintes pets cadastrados: ${resumoPets}.`);
      triagemInstructions =
        'Se o tutor ainda não tiver dito qual dos pets cadastrados será atendido (ou se for um novo pet), pergunte de forma cordial e natural antes de concluir. Caso informe um novo pet, chame a ferramenta registrar_pre_triagem_nicho. Se o cliente responder de forma direta ("só marca pra mim às 15h") sem querer detalhar, NÃO insista e envie o link de agendamento normalmente.';
    } else {
      contextLines.push('Tutor ainda não possui pets cadastrados no sistema.');
      triagemInstructions =
        'Antes de encaminhar para o fechamento do agendamento, pergunte de forma natural o nome do pet e o porte/espécie (ex.: cachorro pequeno, gato). Assim que o cliente informar, chame a ferramenta registrar_pre_triagem_nicho. Se o cliente for direto e não quiser detalhar na hora, NÃO insista nem trave o atendimento — prossiga normalmente.';
    }
  }

  // 2. Nicho Odontologia / Clínica de Estética / Podologia
  if (
    nicheDict.features.hasOdontograma ||
    nicheDict.features.hasMapaEstetico ||
    nicheDict.features.hasFichaPodologica
  ) {
    if (clienteId) {
      const { data: fichas } = await supabase
        .from('fichas_clinicas')
        .select('tipo_ficha, dados_json, observacoes_gerais, updated_at')
        .eq('lojista_id', lojistaId)
        .eq('cliente_id', clienteId)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (fichas && fichas.length > 0) {
        const pontosApoio: string[] = [];
        for (const f of fichas) {
          const dj = (f.dados_json || {}) as any;
          if (dj.anamnese?.alertaCritico || dj.anamnesePodologica?.alertaCritico) {
            pontosApoio.push('Alerta clínico crítico registrado na ficha.');
          }
          if (dj.anamnesePodologica?.peDiabetico) {
            pontosApoio.push('Paciente marcado como Pé Diabético (atenção redobrada no protocolo).');
          }
          if (dj.anamnese?.alergias || dj.anamnesePodologica?.alergias) {
            pontosApoio.push(
              `Alergias registradas: ${dj.anamnese?.alergias || dj.anamnesePodologica?.alergias}.`
            );
          }
          if (dj.triagemIa?.objetivoOuQueixa) {
            pontosApoio.push(`Último objetivo/queixa informado: ${dj.triagemIa.objetivoOuQueixa}.`);
          }
          if (dj.triagemIa?.alergiasOuRestricoes) {
            pontosApoio.push(`Restrição em pré-triagem: ${dj.triagemIa.alergiasOuRestricoes}.`);
          }
        }

        if (pontosApoio.length > 0) {
          contextLines.push(
            `[APOIO CONFIDENCIAL DE TRIAGEM — NÃO EXPONHA DADOS SENSÍVEIS NO CHAT]: ${pontosApoio.join(
              ' '
            )}`
          );
        }
      }
    }

    triagemInstructions = nicheDict.features.hasFichaPodologica
      ? 'Antes de concluir o agendamento, pergunte brevemente qual é a queixa ou procedimento desejado (ex.: unha encravada, podoprofilaxia, calosidade, micose ou órtese) e se o(a) paciente é diabético(a) ou possui alguma alergia importante. Assim que responder, chame a ferramenta registrar_pre_triagem_nicho. Se o paciente for direto e não quiser detalhar agora, NÃO insista nem bloqueie o agendamento.'
      : 'Antes de concluir o agendamento, pergunte brevemente qual é o objetivo ou queixa principal do atendimento e se possui alguma alergia ou restrição importante. Assim que o paciente responder, chame a ferramenta registrar_pre_triagem_nicho. Se o paciente responder de forma direta e não quiser detalhar agora, NÃO insista nem bloqueie o agendamento — prossiga normalmente.';
  }

  // 3. Nicho Psicologia / Terapia (Sigilo Estrito LGPD + Triagem Administrativa)
  if (nicheDict.features.hasProntuarioPsico) {
    if (clienteId) {
      // LÊ APENAS tipo_ficha = 'triagem_ia' (JAMAIS lê 'evolucao_psicologica' para preservar sigilo clínico)
      const { data: triagemRow } = await supabase
        .from('fichas_clinicas')
        .select('dados_json, observacoes_gerais')
        .eq('lojista_id', lojistaId)
        .eq('cliente_id', clienteId)
        .eq('tipo_ficha', 'triagem_ia')
        .maybeSingle();

      if (triagemRow?.dados_json?.triagemIa) {
        const ti = triagemRow.dados_json.triagemIa;
        const metaPartes = [
          ti.modalidade_preferida ? `Modalidade: ${ti.modalidade_preferida}` : null,
          ti.faixa_etaria ? `Público: ${ti.faixa_etaria}` : null,
          ti.tipo_atendimento ? `Tipo: ${ti.tipo_atendimento}` : null,
        ].filter(Boolean);
        if (metaPartes.length > 0) {
          contextLines.push(
            `Preferência logística registrada do(a) paciente: ${metaPartes.join(' | ')}.`
          );
        }
      }
    }

    triagemInstructions =
      'ATENDIMENTO PSICOLÓGICO (SIGILO E TRIAGEM ADMINISTRATIVA): ' +
      'Adote tom acolhedor, calmo, empático e discreto. É PROIBIDO pedir relatos de sintomas emocionais, traumas, diagnósticos ou detalhes clínicos pelo WhatsApp; caso o paciente comece a detalhar questões pessoais, acolha com gentileza e diga: "Para preservar seu sigilo e privacidade, não precisa detalhar questões pessoais por aqui — isso será conversado diretamente em sessão com o(a) profissional." ' +
      'Antes de concluir o agendamento, se ainda não estiver claro, pergunte brevemente apenas: (1) Modalidade desejada (Online ou Presencial) e (2) Para quem é o atendimento (Adulto, Adolescente ou Infantil — e se é primeira sessão ou retorno). Assim que informar, chame registrar_pre_triagem_nicho. Se o paciente quiser apenas marcar o horário sem responder perguntas, confirme normalmente sem insistir.';
  }

  return {
    contextText: contextLines.join('\n'),
    triagemInstructions,
  };
}

/**
 * Grava pré-triagem coletada pela Secretária IA sem duplicar pets nem sobrescrever prontuários visuais.
 */
export async function saveNichePreTriagem(params: {
  supabase: any;
  lojistaId: string;
  clienteId: string | null;
  telefone: string;
  senderName: string | null;
  nicheDict: NicheDictionary;
  args: {
    pet_nome?: string;
    pet_especie?: string;
    pet_porte?: string;
    pet_raca?: string;
    pet_alergias?: string;
    objetivo_queixa?: string;
    alergias_restricoes?: string;
    modalidade_preferida?: string;
    faixa_etaria?: string;
    tipo_atendimento?: string;
  };
}): Promise<{ ok: boolean; detail: string }> {
  const { supabase, lojistaId, telefone, senderName, nicheDict, args } = params;
  let { clienteId } = params;

  const cleanPhone = telefone.replace(/\D/g, '');
  if (!clienteId && cleanPhone.length >= 8) {
    const existing = await resolveClienteByPhone(supabase, lojistaId, cleanPhone);
    if (existing) {
      clienteId = existing.id;
    } else {
      const { data: novoCli } = await supabase
        .from('clientes')
        .insert({
          lojista_id: lojistaId,
          nome: senderName?.trim() || 'Cliente WhatsApp',
          telefone: cleanPhone,
          total_agendamentos: 0,
          etapa_kanban: 'lead',
        })
        .select('id')
        .maybeSingle();
      if (novoCli?.id) clienteId = novoCli.id;
    }
  }

  if (!clienteId) {
    return { ok: false, detail: 'Cliente não identificado para vincular pré-triagem.' };
  }

  // Caso A: Pet Shop -> cria pet se não existir (comparação case-insensitive)
  if (nicheDict.features.hasPets && args.pet_nome?.trim()) {
    const petNomeTrim = args.pet_nome.trim();
    const { data: existingPets } = await supabase
      .from('pets')
      .select('id, nome')
      .eq('lojista_id', lojistaId)
      .eq('cliente_id', clienteId);

    const alreadyExists = (existingPets || []).some(
      (p: any) => (p.nome || '').toLowerCase().trim() === petNomeTrim.toLowerCase()
    );

    if (!alreadyExists) {
      await supabase.from('pets').insert({
        lojista_id: lojistaId,
        cliente_id: clienteId,
        nome: petNomeTrim,
        especie: normalizeEspecie(args.pet_especie),
        raca: args.pet_raca?.trim() || null,
        porte: normalizePorte(args.pet_porte),
        docilidade: 'docil',
        alergias_observacoes: args.pet_alergias?.trim() || null,
      });
    }

    return { ok: true, detail: `Pet ${petNomeTrim} registrado/identificado para o tutor.` };
  }

  // Caso B: Odontologia ou Estética -> upsert em fichas_clinicas (tipo_ficha = 'triagem_ia')
  if (
    (nicheDict.features.hasOdontograma || nicheDict.features.hasMapaEstetico) &&
    (args.objetivo_queixa?.trim() || args.alergias_restricoes?.trim())
  ) {
    const resumo = [
      args.objetivo_queixa?.trim() ? `Objetivo: ${args.objetivo_queixa.trim()}` : null,
      args.alergias_restricoes?.trim() ? `Alergias/Restrições: ${args.alergias_restricoes.trim()}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const { error: upsertErr } = await supabase
      .from('fichas_clinicas')
      .upsert(
        {
          lojista_id: lojistaId,
          cliente_id: clienteId,
          tipo_ficha: 'triagem_ia',
          dados_json: {
            triagemIa: {
              objetivoOuQueixa: args.objetivo_queixa?.trim() || undefined,
              alergiasOuRestricoes: args.alergias_restricoes?.trim() || undefined,
              atualizadoEm: new Date().toISOString(),
            },
          },
          observacoes_gerais: resumo || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lojista_id,cliente_id,tipo_ficha' }
      );

    if (upsertErr) {
      // Fallback seguro caso tipo_ficha tenha restrição de CHECK no banco remoto
      const { data: cliData } = await supabase
        .from('clientes')
        .select('custom_metadata')
        .eq('id', clienteId)
        .maybeSingle();

      await supabase
        .from('clientes')
        .update({
          custom_metadata: {
            ...(cliData?.custom_metadata || {}),
            triagem_ia_resumo: resumo,
            triagem_ia_at: new Date().toISOString(),
          },
        })
        .eq('id', clienteId);
    }

    return { ok: true, detail: `Pré-triagem clínica registrada: ${resumo}` };
  }

  // Caso C: Psicologia / Terapia -> apenas metadados administrativos em triagem_ia
  if (
    nicheDict.features.hasProntuarioPsico &&
    (args.modalidade_preferida?.trim() ||
      args.faixa_etaria?.trim() ||
      args.tipo_atendimento?.trim())
  ) {
    const modalidade = args.modalidade_preferida?.trim();
    const faixa = args.faixa_etaria?.trim();
    const tipoAtend = args.tipo_atendimento?.trim();

    const tipoLabel =
      tipoAtend === 'primeira_consulta'
        ? '1ª Sessão'
        : tipoAtend === 'retorno'
          ? 'Retorno'
          : tipoAtend;

    const resumoAdmin = [
      modalidade ? modalidade.charAt(0).toUpperCase() + modalidade.slice(1) : null,
      faixa ? faixa.charAt(0).toUpperCase() + faixa.slice(1) : null,
      tipoLabel || null,
    ]
      .filter(Boolean)
      .join(' • ');

    const { error: upsertErr } = await supabase
      .from('fichas_clinicas')
      .upsert(
        {
          lojista_id: lojistaId,
          cliente_id: clienteId,
          tipo_ficha: 'triagem_ia',
          dados_json: {
            triagemIa: {
              modalidade_preferida: modalidade || undefined,
              faixa_etaria: faixa || undefined,
              tipo_atendimento: tipoAtend || undefined,
              atualizadoEm: new Date().toISOString(),
            },
          },
          observacoes_gerais: resumoAdmin || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lojista_id,cliente_id,tipo_ficha' }
      );

    if (upsertErr) {
      const { data: cliData } = await supabase
        .from('clientes')
        .select('custom_metadata')
        .eq('id', clienteId)
        .maybeSingle();

      await supabase
        .from('clientes')
        .update({
          custom_metadata: {
            ...(cliData?.custom_metadata || {}),
            triagem_ia_resumo: resumoAdmin,
            triagem_ia_at: new Date().toISOString(),
          },
        })
        .eq('id', clienteId);
    }

    return { ok: true, detail: `Triagem administrativa registrada: ${resumoAdmin}` };
  }

  return { ok: true, detail: 'Nenhum dado adicional necessário.' };
}
