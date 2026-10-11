# FlowAgenda — Compêndio Estratégico, Arquitetural e Operacional Mestre

> **Documento de Continuidade e Estabilidade Técnica**  
> **Versão:** 2.0 (Produção Homologada)  
> **Última Atualização:** Outubro de 2026  
> **Repositório GitHub:** `https://github.com/Weberlon/flowagenda` (Branch `main`)  
> **Hospedagem & CI/CD:** Vercel (Deploy automático a cada push)

---

## 1. Visão Geral e Modelo de Negócio (SwaS)

O **FlowAgenda** é uma plataforma **Software with a Service (SwaS)** multi-tenant desenvolvida para comércio e serviços locais (Barbearias, Salões de Beleza, Tatuadores, Pet Care, Clínicas Odontológicas, Médicas e Estéticas).

### A Proposta de Valor: "Máquina de Tração Local"
Diferente de sistemas tradicionais de agendamento que cobram comissões por cliente ou funcionam como catálogos impessoais que expõem concorrentes, o FlowAgenda opera como uma solução proprietária do próprio lojista baseada em **3 engrenagens**:
1. **Atração Orgânica no Google Meu Negócio:** Otimização de ficha e robô automatizado pós-atendimento que dispara link de avaliação no WhatsApp apenas nos momentos de satisfação (1ª e 2ª consultas), construindo autoridade 5 estrelas.
2. **Presença Digital de Alta Conversão:** Página de agendamento ultra-rápida no celular, sem necessidade de download de aplicativo, sem senhas complicadas e adaptável à identidade visual do cliente (**White Label total nos planos superiores**).
3. **Atendimento & Confirmação no WhatsApp com PIN:** Robô receptivo 24/7 com trava atômica de 10 minutos, validação de PIN de segurança e lembretes preventivos anti no-show disparados 2 horas antes do procedimento.

---

## 2. Stack Tecnológica e Padrões de Engenharia

| Camada | Tecnologia | Detalhes & Configuração |
| :--- | :--- | :--- |
| **Framework Full-Stack** | Next.js 16 (App Router) | Turbopack, Server Actions, Server Components para SEO e rotas dinâmicas. |
| **Linguagem** | TypeScript 5.x | Configurado com `"target": "es2022"` e tipagem estrita. |
| **Estilização** | Tailwind CSS v4 & PostCSS | Utiliza `@tailwindcss/postcss` com `postcss.config.mjs` e `app/globals.css`. |
| **Design System** | Paleta **Nord Dark / Slate** | Tons `#242933`, `#2E3440`, `#3B4252`, `#4C566A`, ciano `#88C0D0`, verde `#A3BE8C`, amarelo `#EBCB8B`, vermelho `#BF616A` e texto `#ECEFF4`. |
| **Banco de Dados & Auth** | Supabase (PostgreSQL) | RLS (Row Level Security) obrigatório em todas as tabelas, Supabase Auth via SSR cookies. |
| **WhatsApp Transacional** | Evolution API v2 (Docker VPS) | Mensagens transacionais diretas, geração e pareamento de QR Code via API. |
| **Billing & Assinaturas** | Asaas API v3 | Gestão de clientes, cobrança recorrente e webhook com `timingSafeEqual`. |
| **Infraestrutura & Deploy** | Vercel | Deploy contínuo via GitHub, Vercel Cron jobs e Vercel Domains API. |

---

## 3. Arquitetura Multi-Tenant & Roteamento (`middleware.ts`)

O arquivo [`middleware.ts`](./middleware.ts) é a peça central do isolamento de tenants e opera sob 4 regras hierárquicas:

```
Requisição HTTP
    │
    ├── 1. Rota de Sistema (/superadmin, /dashboard, /login, /tenant, /api)?
    │       └── SIM: Bypass Direto (mantém URL física sem reescrita)
    │
    ├── 2. Host Raiz (flowagenda.online, localhost, *.vercel.app)?
    │       └── SIM: Se caminho for '/', reescreve para '/home' (Landing Page Comercial)
    │
    ├── 3. Subdomínio Wildcard ([slug].flowagenda.online)?
    │       └── SIM: Reescreve transparentemente para '/tenant/[slug]'
    │
    └── 4. Domínio Personalizado Próprio (ex: clinicadoutor.com.br)?
            └── SIM: Reescreve transparentemente para '/tenant/custom_[domain]'
```

> ⚠️ **Regra Rígida:** Nunca altere as condições de bypass do `middleware.ts` sem garantir que rotas como `/superadmin` e `/dashboard` não sofram reescrita indevida.

---

## 4. Estrutura do Banco de Dados (Supabase PostgreSQL)

O schema está dividido em tabelas isoladas por `lojista_id` com políticas RLS ativas:

### 1. `profiles`
- `id` (UUID, PK referencia `auth.users`)
- `role` (`user_role`: `'super_admin'` ou `'lojista'`)

### 2. `lojistas`
- `id` (UUID, PK)
- `user_id` (UUID, FK `profiles.id`)
- `nome_estabelecimento` (VARCHAR)
- `slug_subdominio` (VARCHAR, UNIQUE)
- `dominio_proprio` (VARCHAR, UNIQUE, NULL)
- `tier` (`subscription_tier`: `'tier_1'`, `'tier_2'`, `'tier_3_institucional'`)
- `status_pagamento` (`payment_status`: `'ativo'`, `'inadimplente'`, `'pendente'`, `'cancelado'`)
- `tipo_site` (`website_type`: `'landing_page'`, `'institucional_completo'`)
- `logo_url`, `cor_primaria`
- `asaas_customer_id`, `asaas_subscription_id`
- `google_review_url` (URL da ficha para coleta 5★)
- `whatsapp_notificacao` (WhatsApp do estabelecimento)
- `configuracoes` (JSONB):
  - `mostrar_badge_plataforma` (BOOLEAN): `true` para Tier 1, `false` para Tiers 2 e 3 (White Label)
  - `cor_primaria` (HEX)
  - `cor_secundaria` (HEX)
  - `favicon_url` (TEXT)

### 3. `configuracoes_robo`
- `id`, `lojista_id` (UNIQUE FK `lojistas.id`)
- `instance_name` (VARCHAR, UNIQUE)
- `instance_token`, `qr_code_base64`
- `status_conexao` (`'open'`, `'close'`, `'connecting'`)
- `mensagem_boas_vindas` (TEXT com variáveis `{nome_estabelecimento}`, `{link_agendamento}`)
- `bot_pausado_ate` (TIMESTAMPTZ, usado para transbordo de atendimento humano)

### 4. `servicos`
- `id`, `lojista_id` (FK `lojistas.id`)
- `nome_servico` (VARCHAR)
- `duracao_minutos` (INT com `CHECK (duracao_minutos IN (15, 30, 45, 60))`)
- `preco` (DECIMAL(10,2))
- `ativo` (BOOLEAN)

### 5. `clientes` (Módulo CRM)
- `id`, `lojista_id` (FK `lojistas.id`)
- `nome` (VARCHAR)
- `telefone` (VARCHAR, apenas números com DDD)
- `etapa_kanban` (`'lead'`, `'agendado'`, `'atendido'`, `'no_show'`, `'fidelizado'`)
- `total_gasto` (NUMERIC(10,2) — LTV acumulado)
- `total_agendamentos` (INT)
- `ultimo_agendamento` (TIMESTAMPTZ)
- `observacoes` (TEXT — prontuário/anotações internas)
- `tags` (TEXT[] — preferências e perfil)
- `CONSTRAINT unique_lojista_cliente UNIQUE (lojista_id, telefone)`

### 6. `agendamentos`
- `id`, `lojista_id`, `servico_id`, `cliente_id`
- `data_hora_inicio`, `data_hora_fim`
- `status` (`appointment_status`: `'pendente_pin'`, `'confirmado'`, `'concluido'`, `'cancelado'`)
- `pin_validacao` (VARCHAR(6) criptográfico ou flag `'LEMBR'`)
- `expira_em` (TIMESTAMPTZ, trava atômica de 10 min)

---

## 5. Módulos do Sistema e Onde Cada Código Reside

### A. Vitrine Institucional Pública (`app/page.tsx` e `app/home/page.tsx`)
- Mantido como **Server Component puro** (sem `'use client'`), garantindo Core Web Vitals e SEO estático.
- **Mockup Interativo do Hero (`components/landing/HeroInteractiveMockup.tsx`):** Client Component com alternador de pílulas entre *Agendamento Ágil* (slots em ciano, PIN e Google 5★) e *Consultórios & Clínicas* (Google Maps escuro e badge Anti No-Show).
- **Tabela de Preços por Ciclos (`components/landing/PricingTiers.tsx`):**
  - **Mensal:** Tier 1 R$ 79,90 | Tier 2 R$ 139,90 | Tier 3 R$ 249,90.
  - **Semestral:** -15% OFF + 50% de desconto na taxa de setup.
  - **Anual:** -25% OFF + **Setup 100% GRÁTIS**.
  - Ancoragem visível da taxa única de implantação/setup para alta conversão.

### B. Gestão de Clientes & CRM Kanban (`app/dashboard/clientes/`)
- **Server Actions Blindadas (`app/actions/clientes.ts`):** Extraem a sessão pelo servidor via `supabase.auth.getUser()`, higienizam telefones (`\D`) e gerenciam LTV, etapas e notas.
- **Client Component (`clientes-client.tsx`):**
  - Alternador de visualização entre Kanban e Lista.
  - 5 colunas com drag-and-drop no desktop e seletor rápido no rodapé dos cards para tablets/iPads.
  - Badges automáticos de `VIP` (LTV ≥ R$ 500) e `Recorrente` (visitas ≥ 3).
  - Drawer lateral para anotações internas e gerenciamento de tags.

### C. Página Pública do Tenant & White Label (`app/tenant/[slug]/page.tsx`)
- **Metadados Dinâmicos (`generateMetadata`):** Título da aba `${lojista.nome_estabelecimento} | Agendamento Online` e favicon dinâmico próprio.
- **Rodapé Condicional:**
  - Tier 1: Exibe `© [Ano] [Loja]` + badge `⚡ Agendamento seguro via FlowAgenda`.
  - Tiers 2 e 3: **Selo da plataforma completamente oculto** (White Label 100%).
- **Fluxo Atômico:** Trava de 10 minutos, cronômetro decrescente, validação de PIN de 6 dígitos e tela de bloqueio caso inadimplente no Asaas.

### D. Conexão WhatsApp & Configurações (`app/dashboard/configuracoes/`)
- Exibição do QR Code em tempo real, status de conexão da Evolution API, reinício de instância e logout.
- Editor com preview em tempo real da mensagem de boas-vindas do robô e campo para URL do Google Meu Negócio.

### E. Automações em Segundo Plano (APIs & Cron)
1. **Webhook Evolution API (`app/api/webhooks/evolution/route.ts`):** Atendimento receptivo no WhatsApp com link dinâmico do lojista, detecção de intenção humana e pausa temporária do bot por 2 horas.
2. **Webhook Asaas (`app/api/webhooks/asaas/route.ts`):** Validação segura contra timing attacks com `crypto.timingSafeEqual`, idempotência por ID de evento e suspensão automática de inadimplentes.
3. **Vercel Cron (`app/api/cron/reviews/route.ts`):** Cron horário configurado no [`vercel.json`](./vercel.json) (`0 * * * *`):
   - **Fase 1 (Anti No-Show):** Dispara lembrete preventivo no WhatsApp 2h antes da consulta com flag idempotente anti-duplicação (`pin_validacao = 'LEMBR'`).
   - **Fase 2 (Google Reviews 5★):** Envia link de avaliação 2h após a conclusão do atendimento para clientes na 1ª ou 2ª visita e transiciona o agendamento para `concluido`.

---

## 6. Checklist de Ativação em Produção (Virada de Chave Externa)

Quando for colocar o sistema para operar com clientes e WhatsApp reais no mundo exterior:

### [ ] 1. VPS da Evolution API (WhatsApp Real)
1. Contrate uma VPS Linux (Ubuntu 22.04 LTS ou 24.04 LTS) em provedores como Hetzner, Contabo ou DigitalOcean (~R$ 25 a R$ 40/mês).
2. Instale o Docker e Docker Compose:
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://get.docker.com | bash
   ```
3. Suba a Evolution API com domínio próprio e SSL (usando Nginx Proxy Manager ou Caddy).
4. No arquivo `.env.local` e nas variáveis da Vercel, preencha:
   ```env
   EVOLUTION_API_URL=https://evolution.seudominio.com
   EVOLUTION_API_KEY=sua_chave_global_gerada_na_vps
   ```

### [ ] 2. Variáveis de Ambiente na Vercel
Acesse o painel do projeto na **Vercel** > **Settings** > **Environment Variables** e garanta que todas as chaves abaixo estejam configuradas para os ambientes *Production*, *Preview* e *Development*:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ROOT_DOMAIN` = `flowagenda.online`
- `HOOK_TOKEN` = `senha-segura-flowagenda-2026`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`
- `ASAAS_API_URL`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

### [ ] 3. Virada de Chave do Asaas (Cobrança Real)
- O sistema está operando na sandbox de homologação (`https://sandbox.asaas.com/api/v3`).
- Ao iniciar a cobrança com dinheiro real de clientes, troque a chave no painel do Asaas para a chave de Produção (`$aact_prod_...`) e aponte a URL para `https://api.asaas.com/v3`.

### [ ] 4. Propagação do Domínio `flowagenda.online`
- Os servidores DNS na Hostinger foram apontados para `ns1.vercel-dns.com` e `ns2.vercel-dns.com`.
- Assim que a propagação global de DNS concluir, a Vercel emitirá o certificado SSL automaticamente e o domínio responderá na raiz com a landing page comercial.

---

## 7. Comandos Essenciais de Manutenção e Verificação

Para auditar e testar o projeto a qualquer momento no terminal local:

```powershell
# 1. Verificar integridade dos tipos TypeScript (deve retornar 0 erros)
npx tsc --noEmit

# 2. Testar compilação do bundle de produção localmente
npm run build

# 3. Rodar o servidor de desenvolvimento
npm run dev

# 4. Verificar status de sincronização com o GitHub
git status
git log -n 5 --oneline
```

---

## 8. Histórico de Commits Recentes de Alta Relevância

- `1279a79` — `feat: landing page institucional com hero mockup e pricing por ciclos, white label dinamico e crm kanban com ltv` (Commit Atual).
- `0e08df6` — `feat: hourly vercel cron and automated anti no-show appointment reminders via whatsapp`.
- `8699638` — `feat: connect real evolution webhook with automated greeting, human handoff, and bot pause isolation`.
- `e990783` — `feat: align swas strategic compendium (google reviews 5-star robot, tenant high-conversion templates and updated tier pricing)`.
- `ad53307` — `feat: complete asaas webhook guard with timing-safe auth, idempotency and tenant suspension`.
- `1c39c68` — `feat: implement atomic 10min lock booking flow with pin verification and transactional whatsapp messages`.

---
*Este documento é a fonte canônica da verdade do FlowAgenda. Mantenha-o sempre atualizado a cada grande entrega arquitetural.*
