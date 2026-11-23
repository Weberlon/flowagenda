/**
 * ==============================================================================
 * FlowAgenda — Sincronização Automática de Etapas do Kanban por Lojista
 * Arquivo: lib/kanban-sync.ts
 * ==============================================================================
 */

export type EventoKanbanCliente =
  | 'agendamento_confirmado'
  | 'atendimento_concluido'
  | 'no_show';

export async function sincronizarEtapaKanbanCliente(params: {
  supabase: any;
  lojistaId: string;
  clienteId?: string | null;
  evento: EventoKanbanCliente;
}): Promise<void> {
  const { supabase, lojistaId, clienteId, evento } = params;
  if (!lojistaId || !clienteId) return;

  try {
    let novaEtapa: 'agendado' | 'atendido' | 'fidelizado' | 'no_show' = 'agendado';

    if (evento === 'agendamento_confirmado') {
      novaEtapa = 'agendado';
    } else if (evento === 'no_show') {
      novaEtapa = 'no_show';
    } else if (evento === 'atendimento_concluido') {
      // Conta atendimentos concluídos deste cliente dentro do mesmo lojista
      const { count } = await supabase
        .from('agendamentos')
        .select('id', { count: 'exact', head: true })
        .eq('lojista_id', lojistaId)
        .eq('cliente_id', clienteId)
        .eq('status', 'concluido');

      novaEtapa = (count || 0) >= 2 ? 'fidelizado' : 'atendido';
    }

    await supabase
      .from('clientes')
      .update({
        etapa_kanban: novaEtapa,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clienteId)
      .eq('lojista_id', lojistaId);
  } catch (err) {
    console.warn('[Kanban Sync] Falha não-bloqueante ao sincronizar etapa_kanban:', err);
  }
}
