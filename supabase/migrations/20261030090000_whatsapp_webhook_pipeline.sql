-- ==============================================================================
-- FLOWAGENDA MIGRATION: 20261030090000_whatsapp_webhook_pipeline.sql
-- Descrição: Tabelas e colunas para a esteira de webhooks do WhatsApp via Evolution API v2:
--            - Idempotência (webhook_eventos_processados)
--            - Alertas para equipe/lojista (painel_notificacoes)
--            - Status de confirmação e origem de cancelamento em agendamentos
-- ==============================================================================

-- 1. Colunas adicionais na tabela agendamentos
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS confirmacao_cliente_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelado_origem TEXT;

-- Índice para busca rápida de confirmação/status
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_telefone
  ON public.agendamentos (lojista_id, status, data_hora_inicio);

-- 2. Tabela de Idempotência Atômica de Webhooks
CREATE TABLE IF NOT EXISTS public.webhook_eventos_processados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  telefone TEXT,
  texto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_webhook_eventos_msg_instance UNIQUE (message_id, instance_name)
);

CREATE INDEX IF NOT EXISTS idx_webhook_eventos_msg_id
  ON public.webhook_eventos_processados (message_id);

CREATE INDEX IF NOT EXISTS idx_webhook_eventos_created_at
  ON public.webhook_eventos_processados (created_at DESC);

-- 3. Tabela de Notificações/Alertas do Painel do Lojista
CREATE TABLE IF NOT EXISTS public.painel_notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lojista_id UUID NOT NULL REFERENCES public.lojistas(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  cliente_telefone TEXT,
  tipo_evento TEXT NOT NULL, -- 'cancelamento_ativo', 'duvida_ou_audio', 'texto_livre'
  conteudo TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_painel_notificacoes_lojista
  ON public.painel_notificacoes (lojista_id, created_at DESC);

-- 4. Habilitar RLS
ALTER TABLE public.webhook_eventos_processados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.painel_notificacoes ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Service role manages webhook events" ON public.webhook_eventos_processados;
CREATE POLICY "Service role manages webhook events"
  ON public.webhook_eventos_processados
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Lojista views own panel notifications" ON public.painel_notificacoes;
CREATE POLICY "Lojista views own panel notifications"
  ON public.painel_notificacoes
  FOR SELECT
  TO authenticated
  USING (
    lojista_id IN (
      SELECT id FROM public.lojistas WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Lojista updates own panel notifications" ON public.painel_notificacoes;
CREATE POLICY "Lojista updates own panel notifications"
  ON public.painel_notificacoes
  FOR UPDATE
  TO authenticated
  USING (
    lojista_id IN (
      SELECT id FROM public.lojistas WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages panel notifications" ON public.painel_notificacoes;
CREATE POLICY "Service role manages panel notifications"
  ON public.painel_notificacoes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
