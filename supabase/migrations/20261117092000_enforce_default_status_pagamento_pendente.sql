-- ==============================================================================
-- Migration: Garante DEFAULT 'pendente' para status_pagamento em public.lojistas
-- Arquivo: supabase/migrations/20261117092000_enforce_default_status_pagamento_pendente.sql
-- ==============================================================================

ALTER TABLE public.lojistas
  ALTER COLUMN status_pagamento SET DEFAULT 'pendente';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lojistas'
      AND column_name = 'is_founder'
  ) THEN
    ALTER TABLE public.lojistas
      ALTER COLUMN is_founder SET DEFAULT false;
  END IF;
END $$;
