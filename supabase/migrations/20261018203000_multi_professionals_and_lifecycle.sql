-- ==============================================================================
-- FlowAgenda — Migration: Multi-Profissionais, Buffer Time & Lifecycle Flags
-- Arquivo: supabase/migrations/20261018203000_multi_professionals_and_lifecycle.sql
-- ==============================================================================

-- 0. COMPATIBILIDADE DE ENUM E CAMPOS BASE
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'locked';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'awaiting_payment_confirmation';

-- 1. ADICIONAR CAMPOS INSTITUCIONAIS E DE SERVIÇOS
ALTER TABLE public.lojistas
  ADD COLUMN IF NOT EXISTS google_review_url TEXT,
  ADD COLUMN IF NOT EXISTS nome_negocio VARCHAR(255),
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);

UPDATE public.lojistas
SET nome_negocio = COALESCE(nome_negocio, nome_estabelecimento),
    whatsapp = COALESCE(whatsapp, whatsapp_notificacao)
WHERE nome_negocio IS NULL OR whatsapp IS NULL;

ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS intervalo_minutos INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS data_horario TIMESTAMPTZ;

UPDATE public.agendamentos
SET data_horario = data_hora_inicio
WHERE data_horario IS NULL AND data_hora_inicio IS NOT NULL;

-- 2. CRIAR TABELA DE PROFISSIONAIS
CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lojista_id UUID NOT NULL REFERENCES public.lojistas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  foto_url TEXT,
  bio TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para busca rápida de profissionais por tenant
CREATE INDEX IF NOT EXISTS idx_profissionais_lojista_id 
  ON public.profissionais (lojista_id) 
  WHERE ativo = true;

-- 3. TABELA ASSOCIATIVA PROFISSIONAL <-> SERVIÇOS
CREATE TABLE IF NOT EXISTS public.profissional_servicos (
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profissional_id, servico_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_serv_servico 
  ON public.profissional_servicos (servico_id);

-- 4. ATUALIZAR TABELA DE AGENDAMENTOS
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS profissional_id UUID REFERENCES public.profissionais(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS servico_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lembrete_enviado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avaliacao_solicitada BOOLEAN NOT NULL DEFAULT false;

-- Índice Composto Otimizado para Verificação de Concorrência e Conflito de Grade
CREATE INDEX IF NOT EXISTS idx_agendamentos_concorrencia_slot 
  ON public.agendamentos (profissional_id, data_horario, status) 
  WHERE status IN ('locked', 'awaiting_payment_confirmation', 'confirmado');

-- 5. MIGRAÇÃO RETROATIVA DE DADOS (Popula profissionais para lojistas existentes)
DO $$ 
DECLARE 
  r_lojista RECORD; 
  v_prof_id UUID; 
BEGIN 
  FOR r_lojista IN 
    SELECT l.id, l.nome_negocio, l.whatsapp 
    FROM public.lojistas l 
    LEFT JOIN public.profissionais p ON p.lojista_id = l.id 
    WHERE p.id IS NULL 
  LOOP 
    -- Insere o profissional titular padrão para lojistas sem profissional cadastrado 
    INSERT INTO public.profissionais (lojista_id, nome, whatsapp, ativo) 
    VALUES ( 
      r_lojista.id, 
      COALESCE(r_lojista.nome_negocio, 'Profissional Titular'), 
      r_lojista.whatsapp, 
      true 
    ) RETURNING id INTO v_prof_id;      
    
    -- Vincula os serviços existentes do lojista a esse profissional titular 
    INSERT INTO public.profissional_servicos (profissional_id, servico_id) 
    SELECT v_prof_id, s.id 
    FROM public.servicos s 
    WHERE s.lojista_id = r_lojista.id 
    ON CONFLICT DO NOTHING;      
    
    -- Atualiza os agendamentos órfãos deste lojista para apontar para o novo titular 
    UPDATE public.agendamentos 
    SET profissional_id = v_prof_id 
    WHERE lojista_id = r_lojista.id AND profissional_id IS NULL; 
  END LOOP; 
END $$;

-- 6. TRIGGER DE AUTO-ONBOARDING (Gera profissional titular para novos lojistas)
CREATE OR REPLACE FUNCTION public.trg_auto_create_titular_professional()
RETURNS TRIGGER AS $$ 
DECLARE 
  v_prof_id UUID; 
BEGIN 
  INSERT INTO public.profissionais (lojista_id, nome, whatsapp, ativo) 
  VALUES ( 
    NEW.id, 
    COALESCE(NEW.nome_negocio, NEW.nome_estabelecimento, 'Profissional Titular'), 
    COALESCE(NEW.whatsapp, NEW.whatsapp_notificacao), 
    true 
  ) RETURNING id INTO v_prof_id;    
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_after_lojista_insert_titular ON public.lojistas;

CREATE TRIGGER trg_after_lojista_insert_titular
  AFTER INSERT ON public.lojistas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_create_titular_professional();

-- 7. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissional_servicos ENABLE ROW LEVEL SECURITY;

-- 7.1 Leitura Pública: Visitantes da grade podem ver profissionais ativos de lojistas
DROP POLICY IF EXISTS "Profissionais são visíveis publicamente se ativos" ON public.profissionais;
CREATE POLICY "Profissionais são visíveis publicamente se ativos"
  ON public.profissionais
  FOR SELECT
  USING (ativo = true);

DROP POLICY IF EXISTS "Serviços dos profissionais são visíveis publicamente" ON public.profissional_servicos;
CREATE POLICY "Serviços dos profissionais são visíveis publicamente"
  ON public.profissional_servicos
  FOR SELECT
  USING (true);

-- 7.2 Gestão pelo Lojista Autenticado
DROP POLICY IF EXISTS "Lojistas gerenciam seus próprios profissionais" ON public.profissionais;
CREATE POLICY "Lojistas gerenciam seus próprios profissionais"
  ON public.profissionais
  FOR ALL
  TO authenticated
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

DROP POLICY IF EXISTS "Lojistas gerenciam associação profissional-serviços" ON public.profissional_servicos;
CREATE POLICY "Lojistas gerenciam associação profissional-serviços"
  ON public.profissional_servicos
  FOR ALL
  TO authenticated
  USING (
    profissional_id IN (
      SELECT p.id FROM public.profissionais p
      JOIN public.lojistas l ON l.id = p.lojista_id
      WHERE l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    profissional_id IN (
      SELECT p.id FROM public.profissionais p
      JOIN public.lojistas l ON l.id = p.lojista_id
      WHERE l.user_id = auth.uid()
    )
  );
