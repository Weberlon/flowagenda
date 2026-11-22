-- Migração idempotente para publicação de Sites e Landing Pages por Lojista
-- Não altera status_pagamento DEFAULT nem regras de is_founder em public.lojistas

CREATE TABLE IF NOT EXISTS public.sites_lojistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lojista_id UUID NOT NULL UNIQUE REFERENCES public.lojistas(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
  liberacao_manual BOOLEAN NOT NULL DEFAULT false,
  dominio_proprio TEXT,
  blueprint JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sites_lojistas_slug ON public.sites_lojistas (slug);
CREATE INDEX IF NOT EXISTS idx_sites_lojistas_status ON public.sites_lojistas (status);

ALTER TABLE public.sites_lojistas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de sites publicados" ON public.sites_lojistas;
CREATE POLICY "Leitura publica de sites publicados"
  ON public.sites_lojistas
  FOR SELECT
  USING (status = 'publicado');
