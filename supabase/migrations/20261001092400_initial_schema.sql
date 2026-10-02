-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('super_admin', 'lojista');
CREATE TYPE subscription_tier AS ENUM ('tier_1', 'tier_2', 'tier_3_institucional');
CREATE TYPE payment_status AS ENUM ('ativo', 'inadimplente', 'pendente', 'cancelado');
CREATE TYPE appointment_status AS ENUM ('pendente_pin', 'confirmado', 'concluido', 'cancelado');
CREATE TYPE website_type AS ENUM ('landing_page', 'institucional_completo');

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'lojista' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tenants (Lojistas)
CREATE TABLE lojistas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  nome_estabelecimento VARCHAR(255) NOT NULL,
  slug_subdominio VARCHAR(100) UNIQUE NOT NULL,
  dominio_proprio VARCHAR(255) UNIQUE,
  tier subscription_tier DEFAULT 'tier_1' NOT NULL,
  status_pagamento payment_status DEFAULT 'pendente' NOT NULL,
  tipo_site website_type DEFAULT 'landing_page' NOT NULL,
  logo_url TEXT,
  cor_primaria VARCHAR(7) DEFAULT '#0F172A',
  asaas_customer_id VARCHAR(100),
  asaas_subscription_id VARCHAR(100),
  google_places_id VARCHAR(255),
  google_review_url TEXT,
  whatsapp_notificacao VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- WhatsApp Robot Configurations
CREATE TABLE configuracoes_robo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lojista_id UUID REFERENCES lojistas(id) ON DELETE CASCADE UNIQUE NOT NULL,
  instance_name VARCHAR(100) UNIQUE NOT NULL,
  instance_token VARCHAR(255),
  qr_code_base64 TEXT,
  status_conexao VARCHAR(50) DEFAULT 'desconectado' NOT NULL,
  mensagem_boas_vindas TEXT DEFAULT 'Oi, tudo bem? Que bom ter você por aqui! 🤖 Sou o robô de agendamento do(a) {nome_estabelecimento}. Para marcar seu horário rapidinho sem precisar esperar, acesse: {link_agendamento}',
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Services
CREATE TABLE servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lojista_id UUID REFERENCES lojistas(id) ON DELETE CASCADE NOT NULL,
  nome_servico VARCHAR(150) NOT NULL,
  duracao_minutos INT CHECK (duracao_minutos IN (15, 30, 45, 60)) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE NOT NULL,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Customers
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lojista_id UUID REFERENCES lojistas(id) ON DELETE CASCADE NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  total_agendamentos INT DEFAULT 1 NOT NULL,
  ultimo_agendamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(lojista_id, telefone)
);

-- Appointments
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lojista_id UUID REFERENCES lojistas(id) ON DELETE CASCADE NOT NULL,
  servico_id UUID REFERENCES servicos(id) ON DELETE RESTRICT NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
  data_hora_fim TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'pendente_pin' NOT NULL,
  pin_validacao VARCHAR(6),
  expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes') NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Enforcement
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lojistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_robo ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public tenant read" ON lojistas FOR SELECT USING (true);
CREATE POLICY "Public active services read" ON servicos FOR SELECT USING (ativo = true);
CREATE POLICY "Public appointment reservation insert" ON agendamentos FOR INSERT WITH CHECK (status = 'pendente_pin');
CREATE POLICY "Public appointment pin validation update" ON agendamentos FOR UPDATE USING (status = 'pendente_pin');

CREATE POLICY "Tenant owner manages profile" ON profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "Tenant owner manages tenant record" ON lojistas FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Tenant owner manages services" ON servicos FOR ALL USING (
  lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid())
);
CREATE POLICY "Tenant owner manages appointments" ON agendamentos FOR ALL USING (
  lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid())
);
CREATE POLICY "Tenant owner manages customers" ON clientes FOR ALL USING (
  lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid())
);
CREATE POLICY "Tenant owner manages bot config" ON configuracoes_robo FOR ALL USING (
  lojista_id IN (SELECT id FROM lojistas WHERE user_id = auth.uid())
);
