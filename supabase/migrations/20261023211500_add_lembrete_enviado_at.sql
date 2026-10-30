-- ==============================================================================
-- FLOWAGENDA MIGRATION: 20261023211500_add_lembrete_enviado_at.sql
-- Descrição: Adiciona colunas timestamptz para rastreamento de lembretes e avaliações,
--            garantindo blindagem contra reenvios e spam em execuções subsequentes.
-- ==============================================================================

-- 1. Adicionar colunas timestamptz defensivamente
ALTER TABLE public.agendamentos 
  ADD COLUMN IF NOT EXISTS lembrete_enviado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avaliacao_enviada_at TIMESTAMPTZ;

-- 2. Backfill retroativo para registros existentes com flag booleana ativa
UPDATE public.agendamentos 
SET lembrete_enviado_at = updated_at 
WHERE lembrete_enviado = true AND lembrete_enviado_at IS NULL;

UPDATE public.agendamentos 
SET avaliacao_enviada_at = updated_at 
WHERE avaliacao_solicitada = true AND avaliacao_enviada_at IS NULL;

-- 3. Índices parciais para otimização de varredura do worker de ciclo de vida (Cron)
CREATE INDEX IF NOT EXISTS idx_agendamentos_lifecycle_lembrete 
  ON public.agendamentos (status, data_hora_inicio) 
  WHERE status = 'confirmado' AND lembrete_enviado_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agendamentos_lifecycle_avaliacao 
  ON public.agendamentos (status, data_hora_fim) 
  WHERE avaliacao_enviada_at IS NULL;
