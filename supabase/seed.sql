-- Limpeza prévia segura (Opcional, cuidado ao rodar em produção)
-- DELETE FROM agendamentos;
-- DELETE FROM servicos;
-- DELETE FROM clientes;
-- DELETE FROM configuracoes_robo;
-- DELETE FROM lojistas;

-- ==========================================
-- 1. Criação do Usuário Mock na tabela auth.users (necessário p/ FK)
-- ==========================================
INSERT INTO auth.users (id, email, raw_user_meta_data, role, aud, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'demo@barbeariavintage.com', '{"name": "Barbearia Vintage"}', 'authenticated', 'authenticated', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Opcional: Inserir no profile se tiver trigger ou tabela atrelada
INSERT INTO public.profiles (id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'lojista')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2. Inserção do Lojista Tier 3 (Institucional)
-- ==========================================
INSERT INTO public.lojistas (id, user_id, nome_estabelecimento, slug_subdominio, dominio_proprio, tier, tipo_site, status_pagamento, cor_primaria, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Barbearia Vintage', 'vintage', NULL, 'premium', 'institucional_completo', 'ativo', '#b45309', NOW())
ON CONFLICT (id) DO NOTHING;

-- Configuração do Robô mock
INSERT INTO public.configuracoes_robo (id, lojista_id, instance_name, instance_token, created_at)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'flowagenda_vintage', 'demo_token_123', NOW());

-- ==========================================
-- 3. Inserção de Serviços Variados
-- ==========================================
INSERT INTO public.servicos (id, lojista_id, nome_servico, duracao_minutos, preco, ativo, created_at)
VALUES 
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Corte Clássico', 30, 45.00, true, NOW()),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Barba Terapia', 30, 35.00, true, NOW()),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Combo Especial (Corte + Barba)', 60, 75.00, true, NOW()),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Acabamento/Pézinho', 15, 15.00, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 4. Inserção de Clientes
-- ==========================================
INSERT INTO public.clientes (id, lojista_id, nome, telefone, created_at)
VALUES 
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Carlos Almeida', '11999998888', NOW()),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Marcos Paulo', '11988887777', NOW())
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 5. Inserção de Agendamentos (Confirmados e Pendentes)
-- ==========================================
-- A data_hora assume que NOW() é a referência de "hoje"
INSERT INTO public.agendamentos (id, lojista_id, cliente_id, servico_id, data_hora_inicio, data_hora_fim, status, pin_validacao, expira_em, created_at)
VALUES 
  -- Agendamento Confirmado no passado (Para teste de Cron Review)
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', NOW() - INTERVAL '3 hours', (NOW() - INTERVAL '3 hours') + INTERVAL '30 minutes', 'confirmado', NULL, NULL, NOW()),
  
  -- Agendamento Confirmado Futuro (Para aparecer na Agenda do Dashboard)
  ('44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222223', NOW() + INTERVAL '2 hours', (NOW() + INTERVAL '2 hours') + INTERVAL '60 minutes', 'confirmado', NULL, NULL, NOW()),
  
  -- Agendamento Pendente PIN (Lock em curso - 10 min frente)
  ('44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', NULL, '22222222-2222-2222-2222-222222222222', NOW() + INTERVAL '4 hours', (NOW() + INTERVAL '4 hours') + INTERVAL '30 minutes', 'pendente_pin', '123456', NOW() + INTERVAL '10 minutes', NOW())
ON CONFLICT (id) DO NOTHING;
