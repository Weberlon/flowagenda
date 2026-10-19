-- ==============================================================================
-- FlowAgenda — Migration: Constraint de Validação de Subdomínio / Slug
-- Arquivo: supabase/migrations/20261018200000_subdomain_slug_validation.sql
-- ==============================================================================

-- 1. Aplicar a constraint de formato e reserva na coluna oficial 'slug_subdominio'
ALTER TABLE public.lojistas
  DROP CONSTRAINT IF EXISTS check_lojistas_slug_subdominio_format;

ALTER TABLE public.lojistas
  ADD CONSTRAINT check_lojistas_slug_subdominio_format
  CHECK (
    slug_subdominio ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND slug_subdominio NOT IN (
      'app', 'admin', 'api', 'www', 'auth', 'login', 'dashboard', 'webhook'
    )
  );

-- 2. Compatibilidade / Alias: caso o schema também possua a coluna 'slug'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lojistas' AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.lojistas DROP CONSTRAINT IF EXISTS check_lojistas_slug_format;
    ALTER TABLE public.lojistas ADD CONSTRAINT check_lojistas_slug_format
      CHECK (
        slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        AND slug NOT IN (
          'app', 'admin', 'api', 'www', 'auth', 'login', 'dashboard', 'webhook'
        )
      );
  END IF;
END $$;
