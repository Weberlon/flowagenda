-- ==============================================================================
-- FlowAgenda — Migration: Histórico de Notas de Voz (CRM)
-- Arquivo: supabase/migrations/20261019010000_cliente_historico_notas.sql
-- ==============================================================================
-- Tabela dedicada a notas rápidas (voz → texto) associadas a clientes,
-- com suporte a modo IA (Gemini) e modo Ditado Local (on-device).
-- ==============================================================================

-- 1. CRIAÇÃO DA TABELA
CREATE TABLE IF NOT EXISTS public.cliente_historico_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  lojista_id UUID NOT NULL REFERENCES public.lojistas(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES public.profissionais(id) ON DELETE SET NULL,
  procedimento TEXT NOT NULL,
  observacoes TEXT,
  proximo_passo TEXT,
  modo_gravacao VARCHAR(20) NOT NULL CHECK (modo_gravacao IN ('gemini', 'local')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. COMENTÁRIO DESCRITIVO
COMMENT ON TABLE public.cliente_historico_notas IS
  'Histórico de anotações rápidas por voz do CRM FlowAgenda. Cada registro contém o resultado estruturado de um ditado de voz (via Gemini ou transcrição local no navegador).';

-- 3. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_notas_cliente
  ON public.cliente_historico_notas(cliente_id);

CREATE INDEX IF NOT EXISTS idx_notas_lojista
  ON public.cliente_historico_notas(lojista_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.cliente_historico_notas ENABLE ROW LEVEL SECURITY;

-- Política restrita: lojistas autenticados só operam sobre notas vinculadas ao seu próprio tenant.
CREATE POLICY "Lojistas operam somente suas notas" ON public.cliente_historico_notas
  FOR ALL
  USING (
    lojista_id IN (
      SELECT id FROM public.lojistas WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    lojista_id IN (
      SELECT id FROM public.lojistas WHERE user_id = auth.uid()
    )
  );

-- 5. TRIGGER DE UPDATED_AT AUTOMÁTICO (reutiliza função existente ou cria uma)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_cliente_historico_notas'
  ) THEN
    CREATE TRIGGER set_updated_at_cliente_historico_notas
      BEFORE UPDATE ON public.cliente_historico_notas
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;
