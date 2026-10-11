-- Migration: Módulo Completo de Gestão de Clientes e CRM com Kanban
-- Tabela: public.clientes

-- 1. Cria a tabela caso não exista
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lojista_id UUID NOT NULL REFERENCES lojistas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(30) NOT NULL,
  etapa_kanban VARCHAR(50) DEFAULT 'lead',
  total_gasto NUMERIC(10,2) DEFAULT 0.00,
  total_agendamentos INT DEFAULT 0,
  ultimo_agendamento TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_lojista_cliente UNIQUE (lojista_id, telefone)
);

-- 2. Adiciona colunas do CRM caso a tabela já existisse
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS etapa_kanban VARCHAR(50) DEFAULT 'lead',
ADD COLUMN IF NOT EXISTS total_gasto NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Garante constraint unique se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_lojista_cliente'
  ) THEN
    ALTER TABLE public.clientes ADD CONSTRAINT unique_lojista_cliente UNIQUE (lojista_id, telefone);
  END IF;
END $$;

-- 4. Habilita RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- 5. Atualiza / Cria a política segura multi-tenant
DROP POLICY IF EXISTS "Lojista gerencia seus proprios clientes" ON public.clientes;
DROP POLICY IF EXISTS "Tenant owner manages clients" ON public.clientes;

CREATE POLICY "Lojista gerencia seus proprios clientes"
  ON public.clientes FOR ALL
  USING (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()))
  WITH CHECK (lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid()));
