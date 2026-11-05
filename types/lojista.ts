export type ModoAvaliacao = 'automatico' | 'manual' | 'desativado';

export interface Lojista {
  id: string;
  user_id?: string | null;
  nome_estabelecimento: string;
  nome_negocio?: string | null;
  slug_subdominio: string;
  dominio_proprio?: string | null;
  tier: string;
  status_pagamento?: string;
  tipo_site?: string;
  logo_url?: string | null;
  cor_primaria?: string | null;
  asaas_customer_id?: string | null;
  asaas_subscription_id?: string | null;
  google_places_id?: string | null;
  google_review_url?: string | null;
  whatsapp_notificacao?: string | null;
  whatsapp?: string | null;
  whatsapp_instance_name?: string | null;
  configuracoes?: Record<string, any> | null;
  ticket_medio_padrao?: number;
  modo_avaliacao: ModoAvaliacao;
  is_founder: boolean;
  ai_credits: number;
  use_ai_agent: boolean;
  knowledge_base?: string | null;
  business_niche: string;
  created_at?: string;
}

