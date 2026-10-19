-- ==============================================================================
-- FlowAgenda — Migration: Suporte a Health Check e Monitoramento de Instâncias WhatsApp
-- Arquivo: supabase/migrations/20261019001500_whatsapp_instances_health_check.sql
-- ==============================================================================

-- 1. Adicionar email ao cadastro do lojista
ALTER TABLE public.lojistas
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

UPDATE public.lojistas l
SET email = u.email
FROM auth.users u
WHERE l.user_id = u.id AND l.email IS NULL;

-- 2. Expandir whatsapp_instances para rastreamento de saúde e última verificação
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS lojista_id UUID REFERENCES public.lojistas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status_conexao TEXT DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS ultima_verificacao TIMESTAMPTZ DEFAULT now();

UPDATE public.whatsapp_instances
SET lojista_id = organization_id
WHERE lojista_id IS NULL AND organization_id IS NOT NULL;
