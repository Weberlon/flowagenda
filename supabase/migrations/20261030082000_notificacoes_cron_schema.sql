-- ==============================================================================
-- FLOWAGENDA MIGRATION: 20261030082000_notificacoes_cron_schema.sql
-- Descrição: Adiciona colunas para motor de notificações automáticas via cron job,
--            status de lembretes 24h, 2h, pós-atendimento e log de falhas.
-- ==============================================================================

-- 1. Colunas adicionais na tabela agendamentos
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS lembrete_24h_status TEXT,
  ADD COLUMN IF NOT EXISTS lembrete_2h_enviado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lembrete_2h_status TEXT,
  ADD COLUMN IF NOT EXISTS pos_atendimento_status TEXT;

-- 2. Coluna whatsapp_instance_name na tabela lojistas
ALTER TABLE public.lojistas
  ADD COLUMN IF NOT EXISTS whatsapp_instance_name TEXT;

-- 3. Backfill retroativo para preencher whatsapp_instance_name com base nas instâncias já existentes
UPDATE public.lojistas l
SET whatsapp_instance_name = cr.instance_name
FROM public.configuracoes_robo cr
WHERE cr.lojista_id = l.id
  AND l.whatsapp_instance_name IS NULL
  AND cr.instance_name IS NOT NULL;

UPDATE public.lojistas l
SET whatsapp_instance_name = wi.instance_name
FROM public.whatsapp_instances wi
WHERE wi.organization_id = l.id
  AND l.whatsapp_instance_name IS NULL
  AND wi.instance_name IS NOT NULL;

-- 4. Tabela de logs de falha de notificações
CREATE TABLE IF NOT EXISTS public.notificacao_erro_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  lojista_id UUID REFERENCES public.lojistas(id) ON DELETE CASCADE,
  tipo_notificacao TEXT NOT NULL, -- 'lembrete_24h', 'lembrete_2h', 'pos_atendimento'
  telefone TEXT,
  erro TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_notificacao_erro_log_agendamento ON public.notificacao_erro_log (agendamento_id);
CREATE INDEX IF NOT EXISTS idx_notificacao_erro_log_lojista ON public.notificacao_erro_log (lojista_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_lembrete_24h ON public.agendamentos (status, data_hora_inicio) WHERE status = 'confirmado' AND (lembrete_enviado = false OR lembrete_24h_status IS NULL);
CREATE INDEX IF NOT EXISTS idx_agendamentos_lembrete_2h ON public.agendamentos (status, data_hora_inicio) WHERE status = 'confirmado' AND lembrete_2h_status IS NULL;
CREATE INDEX IF NOT EXISTS idx_agendamentos_pos_atendimento ON public.agendamentos (status, data_hora_fim) WHERE avaliacao_solicitada = false;

-- RLS para tabela notificacao_erro_log
ALTER TABLE public.notificacao_erro_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojista reads own notification errors" ON public.notificacao_erro_log;
CREATE POLICY "Lojista reads own notification errors"
  ON public.notificacao_erro_log
  FOR SELECT
  TO authenticated
  USING (
    lojista_id IN (
      SELECT id FROM public.lojistas WHERE user_id = auth.uid()
    )
  );
