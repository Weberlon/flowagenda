-- ==============================================================================
-- FlowAgenda — Migration: Suporte a Sinal Pix, Id Asaas e Status de Estorno
-- Arquivo: supabase/migrations/20261018234500_asaas_pix_and_refund_status.sql
-- ==============================================================================

-- 1. Status de estorno por colisão concorrente
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'estornado_concorrencia';

-- 2. Campos de integração Asaas e dados de contato direto na reserva
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cliente_nome VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cliente_telefone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS valor_sinal NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_agendamentos_asaas_payment 
  ON public.agendamentos (asaas_payment_id) 
  WHERE asaas_payment_id IS NOT NULL;

-- 3. Parâmetros de sinal financeiro no catálogo de serviços
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS exige_sinal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_sinal NUMERIC(10,2) DEFAULT 0;
