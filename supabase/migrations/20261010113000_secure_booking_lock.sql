-- Migration: Blindagem de Concorrência e Segurança de Agendamentos
-- Adiciona colunas para dados de contato temporários e proteção contra brute force de PIN

ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS nome_contato VARCHAR(150);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS telefone_contato VARCHAR(20);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tentativas_pin INT DEFAULT 0;

-- Índice único parcial que impede reservas concorrentes sobrepostas no mesmo lojista e horário de início
CREATE UNIQUE INDEX IF NOT EXISTS idx_agendamentos_lock_unico 
ON agendamentos (lojista_id, data_hora_inicio) 
WHERE (status IN ('confirmado', 'pendente_pin'));
