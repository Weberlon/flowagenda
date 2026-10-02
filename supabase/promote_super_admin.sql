-- ==============================================================================
-- FLOWAGENDA: SCRIPT DE PROMOÇÃO DE SUPER ADMIN E RLS BYPASS
-- Execute este script no SQL Editor do Supabase após criar seu usuário no Auth.
-- ==============================================================================

-- 1. Promover seu email a Super Admin (Substitua 'seu_email@dominio.com' pelo seu email real)
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'seu_email@dominio.com');

-- (Opcional) Se o profile ainda não foi criado por trigger, você pode inseri-lo manualmente:
-- INSERT INTO profiles (id, role) 
-- VALUES ((SELECT id FROM auth.users WHERE email = 'seu_email@dominio.com'), 'super_admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

-- ==============================================================================
-- 2. Adicionar Policies de Bypass/Acesso Total para Super Admins
-- ==============================================================================

-- Tabela: lojistas
CREATE POLICY "Super admin full access on lojistas" ON lojistas 
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- Tabela: configuracoes_robo
CREATE POLICY "Super admin full access on configuracoes_robo" ON configuracoes_robo 
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- Tabela: servicos
CREATE POLICY "Super admin full access on servicos" ON servicos 
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- Tabela: clientes
CREATE POLICY "Super admin full access on clientes" ON clientes 
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- Tabela: agendamentos
CREATE POLICY "Super admin full access on agendamentos" ON agendamentos 
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);
