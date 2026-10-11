-- Migration: Suporte a White Label e Configurações Visuais Dinâmicas por Tenant
-- Tabela: public.lojistas

ALTER TABLE public.lojistas 
ADD COLUMN IF NOT EXISTS configuracoes JSONB DEFAULT jsonb_build_object(
  'mostrar_badge_plataforma', true,
  'cor_primaria', '#0F172A',
  'cor_secundaria', '#38BDF8',
  'favicon_url', NULL
);

-- Popula os lojistas existentes garantindo isolamento por Tier
-- Tier 1: exibe selo da plataforma por padrão
-- Tier 2 e Tier 3: White Label completo (sem selo por padrão)
UPDATE public.lojistas
SET configuracoes = jsonb_build_object(
  'mostrar_badge_plataforma', CASE WHEN tier = 'tier_1' THEN true ELSE false END,
  'cor_primaria', COALESCE(cor_primaria, '#0F172A'),
  'cor_secundaria', '#38BDF8',
  'favicon_url', NULL
)
WHERE configuracoes IS NULL;
