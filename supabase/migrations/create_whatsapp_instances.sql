-- ==============================================================================
-- Migration: whatsapp_instances (Evolution API v2 Integration)
-- Arquivo: supabase/migrations/create_whatsapp_instances.sql
-- ==============================================================================

-- 1. Criação da tabela whatsapp_instances com suporte estrito a multi-tenancy
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.lojistas(id) ON DELETE CASCADE,
  instance_name TEXT UNIQUE NOT NULL,
  instance_id TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' 
    CHECK (status IN ('disconnected', 'connecting', 'open', 'close')),
  phone_number TEXT,
  profile_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Garante que cada organização (lojista) possua apenas uma instância principal
  CONSTRAINT unique_org_whatsapp_instance UNIQUE (organization_id)
);

-- 2. Índices de alta performance para buscas multi-tenant e webhooks
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_org_id ON public.whatsapp_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_name ON public.whatsapp_instances(instance_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON public.whatsapp_instances(status);

-- 3. Trigger para manter updated_at sempre atualizado automaticamente
CREATE OR REPLACE FUNCTION public.handle_whatsapp_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_whatsapp_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER trg_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_whatsapp_instances_updated_at();

-- 4. Habilitação de Row Level Security (RLS)
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Segurança RLS Estritas
-- Leitura (SELECT): Apenas o proprietário da organização pode visualizar sua instância
DROP POLICY IF EXISTS "Tenant owner reads whatsapp_instances" ON public.whatsapp_instances;
CREATE POLICY "Tenant owner reads whatsapp_instances"
  ON public.whatsapp_instances
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.lojistas WHERE user_id = auth.uid()
    )
  );

-- Inserção (INSERT): Apenas o proprietário da organização pode criar a instância
DROP POLICY IF EXISTS "Tenant owner inserts whatsapp_instances" ON public.whatsapp_instances;
CREATE POLICY "Tenant owner inserts whatsapp_instances"
  ON public.whatsapp_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.lojistas WHERE user_id = auth.uid()
    )
  );

-- Atualização (UPDATE): Apenas o proprietário da organização pode atualizar sua instância
DROP POLICY IF EXISTS "Tenant owner updates whatsapp_instances" ON public.whatsapp_instances;
CREATE POLICY "Tenant owner updates whatsapp_instances"
  ON public.whatsapp_instances
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.lojistas WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.lojistas WHERE user_id = auth.uid()
    )
  );

-- Exclusão (DELETE): Apenas o proprietário da organização pode remover sua instância
DROP POLICY IF EXISTS "Tenant owner deletes whatsapp_instances" ON public.whatsapp_instances;
CREATE POLICY "Tenant owner deletes whatsapp_instances"
  ON public.whatsapp_instances
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.lojistas WHERE user_id = auth.uid()
    )
  );

-- Acesso Irrestrito para Super Admin
DROP POLICY IF EXISTS "Superadmin manages all whatsapp_instances" ON public.whatsapp_instances;
CREATE POLICY "Superadmin manages all whatsapp_instances"
  ON public.whatsapp_instances
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
