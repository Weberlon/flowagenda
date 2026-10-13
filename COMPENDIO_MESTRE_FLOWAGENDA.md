# FlowAgenda — Compêndio Estratégico, Arquitetural e Operacional Mestre

> **Documento de Continuidade e Estabilidade Técnica Absoluta**  
> **Versão:** 2.1 (Produção Homologada & Webhooks Integrados)  
> **Última Atualização:** Outubro de 2026  
> **Repositório GitHub:** `https://github.com/Weberlon/flowagenda` (Branch `main`)  
> **Hospedagem & CI/CD:** Vercel (Deploy contínuo via push na branch `main`)  
> **Domínio Raiz:** `https://flowagenda.online`

---

## 1. Visão Geral e Modelo de Negócio (SwaS)

O **FlowAgenda** é uma plataforma **Software with a Service (SwaS)** multi-tenant desenvolvida para comércio e serviços locais (Barbearias, Salões de Beleza, Tatuadores, Pet Care, Clínicas Odontológicas, Médicas e Estéticas).

### A Proposta de Valor: "Máquina de Tração Local"
Diferente de catálogos impessoais de agendamento que cobram comissões por cliente e expõem a concorrência, o FlowAgenda opera como uma solução proprietária do próprio lojista baseada em **3 engrenagens**:
1. **Atração Orgânica no Google Meu Negócio:** Otimização de ficha e robô automatizado pós-atendimento que dispara link de avaliação no WhatsApp apenas nos momentos de satisfação (1ª e 2ª consultas), construindo autoridade 5 estrelas.
2. **Presença Digital de Alta Conversão:** Página de agendamento ultra-rápida no celular, sem necessidade de download de aplicativo, sem senhas complicadas e adaptável à identidade visual do cliente (**White Label total nos planos superiores**).
3. **Atendimento & Confirmação no WhatsApp com PIN:** Robô receptivo 24/7 com trava atômica de 10 minutos, validação de PIN de segurança e lembretes preventivos anti no-show disparados 2 horas antes do procedimento.

---

## 2. Stack Tecnológica e Padrões de Engenharia

| Camada | Tecnologia | Detalhes & Configuração |
| :--- | :--- | :--- |
| **Framework Full-Stack** | Next.js 16 (App Router) | Turbopack, Server Actions, Server Components para SEO e rotas dinâmicas. |
| **Linguagem** | TypeScript 5.x | Configurado com `"target": "es2022"`, tipagem estrita e 0 erros no `tsc --noEmit`. |
| **Estilização** | Tailwind CSS v4 & PostCSS | Utiliza `@tailwindcss/postcss` com `postcss.config.mjs` e variáveis em `app/globals.css`. |
| **Design System** | Paleta **Nord Dark / Slate** | Tons `#242933`, `#2E3440`, `#3B4252`, `#4C566A`, ciano `#88C0D0`, verde `#A3BE8C`, amarelo `#EBCB8B`, vermelho `#BF616A` e texto `#ECEFF4`. |
| **Banco de Dados & Auth** | Supabase (PostgreSQL) | RLS (Row Level Security) em todas as tabelas, Supabase Auth via cookies SSR e Service Role para Webhooks. |
| **WhatsApp Transacional** | Evolution API v2 (VPS Docker) | Servidor em `http://179.236.70.181:8080`, envio transacional, Webhooks de mensagens e geração de QR Code. |
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

## 4. Estrutura do Banco de Dados (Supabase PostgreSQL Auditado)

Todas as 7 tabelas fundamentais foram auditadas, validadas e contam com isolamento multi-tenant por `lojista_id` e RLS:

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
- `google_review_url` (URL da ficha Google Meu Negócio para coleta 5★)
- `whatsapp_notificacao` (WhatsApp com DDD para alertas do estabelecimento)
- `configuracoes` (JSONB):
  - `mostrar_badge_plataforma` (BOOLEAN): `true` para Tier 1, `false` para Tiers 2 e 3 (White Label)
  - `cor_primaria` (HEX)
  - `cor_secundaria` (HEX)
  - `favicon_url` (TEXT)

### 3. `configuracoes_robo`
- `id`, `lojista_id` (UNIQUE FK `lojistas.id`)
- `instance_name` (VARCHAR, UNIQUE)
- `instance_token`, `qr_code_base64`
- `status_conexao` (`'open'`, `'close'`, `'connecting'`, `'desconectado'`)
- `mensagem_boas_vindas` (TEXT com tags `{nome_estabelecimento}`, `{link_agendamento}`)
- `bot_pausado_ate` (TIMESTAMPTZ, usado para transbordo temporário de 2 horas para humano)

### 4. `whatsapp_instances` (Evolution API v2 Gateway)
- `id` (UUID, PK)
- `organization_id` (UUID, FK `lojistas.id`, UNIQUE)
- `instance_name` (TEXT, UNIQUE, padrão `flow_<organization_id>`)
- `instance_id` (TEXT, NULL)
- `status` (`'disconnected'`, `'connecting'`, `'open'`, `'close'`)
- `phone_number` (TEXT, NULL)
- `profile_name` (TEXT, NULL)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- RLS ativado com isolamento multi-tenant por `user_id = auth.uid()`

### 5. `servicos`
- `id`, `lojista_id` (FK `lojistas.id`)
- `nome_servico` (VARCHAR)
- `duracao_minutos` (INT com `CHECK (duracao_minutos IN (15, 30, 45, 60))`)
- `preco` (DECIMAL(10,2))
- `ativo` (BOOLEAN)

### 6. `clientes` (Módulo CRM)
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

### 7. `agendamentos`
- `id`, `lojista_id`, `servico_id`, `cliente_id`
- `data_hora_inicio`, `data_hora_fim`
- `status` (`appointment_status`: `'pendente_pin'`, `'confirmado'`, `'concluido'`, `'cancelado'`)
- `pin_validacao` (VARCHAR(6) criptográfico ou flag `'LEMBR'`)
- `expira_em` (TIMESTAMPTZ, trava atômica de 10 min)

---

## 5. Módulos do Sistema e Onde Cada Código Reside

### A. Vitrine Institucional Pública (`app/page.tsx` e `app/home/page.tsx`)
- Mantido como **Server Component puro** (sem `'use client'`), garantindo Core Web Vitals e SEO estático.
- **HeroSection (`components/landing/HeroSection.tsx`):** Headline com tipografia Nord Dark, status badge ativo da Evolution API v2 e integração perfeita ao `HeroInteractiveMockup.tsx`.
- **HeroInteractiveMockup (`components/landing/HeroInteractiveMockup.tsx`):** Simulador hiper-realista em loop sincronizado de 8 segundos com aceleração por hardware (GPU `transform: translate3d`) demonstrando a seleção de horário, bloqueio de 10 min e notificação transacional do WhatsApp.
- **Bento Grid Interativo — "A Máquina de Faturamento" (`components/landing/BentoShowcase.tsx`):** Grade assimétrica de 4 cards com disparos únicos `viewport: { once: true, amount: 0.25 }` a 60 FPS:
  1. *Agenda Automatizada:* Blocos de horário deslizantes e badge WhatsApp 14h.
  2. *Reputação Google 5★:* Contador interpolado 4.2 &rarr; 4.9 e ticker vertical de reviews reais.
  3. *Trava Anti-Falta:* Cronômetro de 10 minutos, validação de PIN e badge de segurança Pix 20%.
  4. *Atendimento 24h Autônomo:* Gráfico de barras com agendamentos da madrugada destacados em ciano `#88C0D0`.
- **Tabela de Preços com Ciclos Dinâmicos (`components/landing/PricingTiers.tsx`):**
  - **Segmented Pill Toggle:** Fundo `#2E3440` e borda `#3B4252` com 3 abas: "Mensal", "Semestral" e "Anual" (com badge verde `#A3BE8C`: *"Setup Grátis + Máxima Economia"*).
  - **Matriz de Valores Parametrizada:**
    - **Essencial:**
      - Mensal: R$ 59,90/mês | Setup: R$ 99,90 (Taxa única) | *"Economize no plano anual"*
      - Semestral: R$ 54,90/mês | Setup: R$ 49,90 (50% OFF) | *"Cobrado semestralmente"*
      - Anual: R$ 49,90/mês | Setup: R$ 0,00 [SETUP GRÁTIS] | *"Economia total de R$ 219,90"*
    - **Profissional:**
      - Mensal: R$ 99,90/mês | Setup: R$ 149,90 (Taxa única) | *"Economize no plano anual"*
      - Semestral: R$ 89,90/mês | Setup: R$ 74,90 (50% OFF) | *"Cobrado semestralmente"*
      - Anual: R$ 84,90/mês | Setup: R$ 0,00 [SETUP GRÁTIS] | *"Economia total de R$ 329,90"*
    - **Autoridade (Mais Escolhido):**
      - Mensal: R$ 189,90/mês | Setup: R$ 349,90 (Taxa única Done-For-You) | *"Economize no plano anual"*
      - Semestral: R$ 169,90/mês | Setup: R$ 174,90 (50% OFF) | *"Cobrado semestralmente"*
      - Anual: R$ 159,90/mês | Setup: R$ 0,00 [SETUP GRÁTIS] | *"Economia total de R$ 709,90"*
  - **Textos de Autoridade Calibrados:**
    - *"Página institucional premium com design focado em máxima autoridade visual"*
    - *"Intervalos inteligentes (buffer time) entre atendimentos para pontualidade da rotina"*
    - *"Robô automatizado de coleta de avaliações 5★ no Google pós-atendimento"*

### B. Gestão de Clientes & CRM Kanban (`app/dashboard/clientes/`)
- **Server Actions Blindadas (`app/actions/clientes.ts`):** Extraem a sessão pelo servidor via `supabase.auth.getUser()`, higienizam telefones (`\D`) e gerenciam LTV, etapas e notas.
- **Client Component (`clientes-client.tsx`):**
  - Alternador de visualização entre Kanban e Lista.
  - 5 colunas com drag-and-drop no desktop e seletor rápido no rodapé dos cards para tablets/iPads.
  - Badges automáticos de `VIP` (LTV &ge; R$ 500) e `Recorrente` (visitas &ge; 3).
  - Drawer lateral para anotações internas e gerenciamento de tags.

### C. Página Pública do Tenant & White Label (`app/tenant/[slug]/page.tsx`)
- **Metadados Dinâmicos (`generateMetadata`):** Título da aba `${lojista.nome_estabelecimento} | Agendamento Online` e favicon dinâmico próprio.
- **Rodapé Condicional:**
  - Tier 1: Exibe `© [Ano] [Loja]` + badge `⚡ Agendamento seguro via FlowAgenda`.
  - Tiers 2 e 3: **Selo da plataforma completamente oculto** (White Label 100%).
- **Fluxo Atômico:** Trava de 10 minutos, cronômetro decrescente, validação de PIN de 6 dígitos e tela de bloqueio caso inadimplente no Asaas.

### D. Conexão WhatsApp & Configurações (`app/dashboard/configuracoes/` e `app/actions/whatsapp.ts`)
- Modelagem `whatsapp_instances` com RLS multi-tenant vinculada à Evolution API v2 (`lib/evolution.ts`).
- Server actions `generateTenantQrCodeAction` e `checkTenantConnectionAction`.
- Função `setEvolutionWebhook` acoplada para apontar automaticamente o webhook da instância no momento de criação.
- Exibição do QR Code em tempo real, status de conexão da Evolution API, reinício de instância e logout.
- Editor com preview em tempo real da mensagem de boas-vindas do robô e campo para URL do Google Meu Negócio.

### E. Automações em Segundo Plano (APIs & Webhooks Conectados)
1. **Webhook Evolution API (`app/api/webhooks/evolution/route.ts`):**
   - **URL de Produção:** `https://flowagenda.online/api/webhooks/evolution`
   - **Autenticação:** Header `x-hook-token: senha-segura-flowagenda-2026`
   - **Funcionalidades:**
     - Atendimento receptivo no WhatsApp com link dinâmico do lojista (`{link_agendamento}`).
     - Detecção de intenção humana (transbordo) que pausa o robô por 2 horas e notifica o lojista.
     - Bloqueio imediato se o lojista estiver com assinatura inadimplente ou cancelada.
2. **Webhook Asaas (`app/api/webhooks/asaas/route.ts`):**
   - **URL de Produção:** `https://flowagenda.online/api/webhooks/asaas`
   - **Autenticação:** Comparação em tempo constante `crypto.timingSafeEqual` com token `@Webdao000`.
   - **Funcionalidades:**
     - Idempotência recente por `eventId` para evitar processamento duplicado.
     - Atualização instantânea do status do lojista (`ativo`, `inadimplente`, `cancelado`) com base em pagamentos e cobranças.
3. **Vercel Cron (`app/api/cron/reviews/route.ts`):** Cron horário configurado no [`vercel.json`](./vercel.json) (`0 * * * *`):
   - **Fase 1 (Anti No-Show):** Dispara lembrete preventivo no WhatsApp 2h antes da consulta com flag idempotente anti-duplicação (`pin_validacao = 'LEMBR'`).
   - **Fase 2 (Google Reviews 5★):** Envia link de avaliação 2h após a conclusão do atendimento para clientes na 1ª ou 2ª visita e transiciona o agendamento para `concluido`.

---

## 6. Estado Atual dos Webhooks e Infraestrutura

### [x] 1. VPS da Evolution API v2 (WhatsApp Conectado)
- **Host:** `http://179.236.70.181:8080`
- **Instância Piloto:** `flowagenda-teste` (Conectada, status `open`, número `553195544945`).
- **Webhook Configurado:** `https://flowagenda.online/api/webhooks/evolution` com header `x-hook-token` ativo (**HTTP 201 Created / Ativo**).

### [x] 2. Webhook do Asaas (Cobranças Vinculadas)
- **ID do Webhook:** `dbc2e866-8e53-483a-94c7-b5e6589b096d`
- **Nome:** `Flowagenda Produção`
- **URL Configurada:** `https://flowagenda.online/api/webhooks/asaas` (**HTTP 200 OK / Ativo**).
- **Eventos:** `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DUNNING_RECEIVED`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`.

---

## 7. O QUE FALTA FAZER (Checklist de Ativação & Próximas Frentes)

Para dar continuidade nas próximas sessões de desenvolvimento, estas são as tarefas pendentes exatas:

### Frente 1: Parametrização Comercial Imediata
- [x] **Parametrização do WhatsApp Comercial via Variável de Ambiente (`NEXT_PUBLIC_WHATSAPP_COMERCIAL`):**
  - Implementado helper centralizado em [`lib/contact.ts`](./lib/contact.ts) e integrado aos CTAs de [`app/page.tsx`](./app/page.tsx), [`components/landing/PricingTiers.tsx`](./components/landing/PricingTiers.tsx), [`components/landing/HeroSection.tsx`](./components/landing/HeroSection.tsx) e [`app/dashboard/layout.tsx`](./app/dashboard/layout.tsx).
  - Assim que o chip oficial do WhatsApp Business for ativado, basta preencher `NEXT_PUBLIC_WHATSAPP_COMERCIAL` no `.env.local` e na Vercel (sem necessidade de alterar código).

### Frente 2: Produção & Domínio Vercel
- [ ] **Variáveis de Ambiente na Vercel:**
  - Garantir que as 10 variáveis do [.env.local](file:///c:/Users/Web/Documents/projetos%20VB/saas%20salão%20dentista/.env.local) estejam salvas no painel da **Vercel** (*Settings > Environment Variables*) para os ambientes *Production* e *Preview*.
- [ ] **Propagação de DNS do Domínio (`flowagenda.online`):**
  - Confirmar se a propagação dos nameservers da Hostinger para a Vercel (`ns1.vercel-dns.com` e `ns2.vercel-dns.com`) está 100% concluída e com SSL emitido.
- [ ] **Virada de Chave do Asaas:**
  - Quando for cobrar clientes reais, trocar `ASAAS_API_URL` de sandbox para `https://api.asaas.com/v3` e atualizar `ASAAS_API_KEY` para a chave de produção (`$aact_prod_...`).

### Frente 3: Teste de Homologação Ponta a Ponta (E2E)
- [ ] **Simulação Completa do Fluxo:**
  1. Acessar `/superadmin` e criar um novo lojista (ou usar o existente `barbeariamodelo`).
  2. Acessar `/dashboard/configuracoes` e validar a sincronização da instância WhatsApp.
  3. Acessar a página pública de agendamento em `flowagenda.online/tenant/barbeariamodelo`.
  4. Agendar horário com um celular real e validar o disparo do PIN de 6 dígitos.
  5. Inserir o PIN, confirmar o agendamento e verificar o card entrando no Kanban em `/dashboard/clientes`.
  6. Enviar mensagem de teste para o WhatsApp da loja para testar o auto-atendimento e o gatilho de transbordo humano.

### Frente 4: Próximas Features do Roadmap
- [ ] **Módulo Financeiro do Lojista:** Tela de resumo de faturamento estimado do mês baseada nos serviços concluídos.
- [ ] **Gestão Multi-Profissionais:** Seleção de colaborador/atendente específico durante o fluxo de agendamento.
- [ ] **Sinal de Agendamento via Pix (Caução 20%):** Checkout direto para pagamento de sinal antes da confirmação do lock.

---

## 8. Comandos Essenciais de Manutenção e Verificação

Para auditar e testar o projeto no terminal local a qualquer momento:

```powershell
# 1. Verificar integridade estrita do TypeScript (deve retornar 0 erros)
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

## 9. Histórico de Commits Recentes de Alta Relevância

- `fba4a40` — `feat: stabilize landing animations with 0.25 viewport, multi-nicho copy, and calibrated pricing cycles`
- `9222722` — `feat: centralize commercial whatsapp config with NEXT_PUBLIC_WHATSAPP_COMERCIAL env fallback`
- `6de7c39` — `feat: configure live production webhooks for Evolution API and Asaas`
- `5cc2f2b` — `feat: segmented pill billing cycle toggle and calibrated pricing tiers`
- `887157d` — `feat: elite visual polish with aurora mesh gradients, synchronized hero simulator, and hardware-accelerated bento grid`
- `4070409` — `feat: interactive bento grid showcase (a maquina de faturamento)`
- `36b437d` — `feat: bento grid showcase, framer motion hero section, and tailwind v4 nord dark theme tokens`
- `c4dbf7b` — `feat: whatsapp instances multi-tenant schema, evolution api v2 integration and server actions`
- `1279a79` — `feat: landing page institucional com hero mockup e pricing por ciclos, white label dinamico e crm kanban com ltv`
- `0e08df6` — `feat: hourly vercel cron and automated anti no-show appointment reminders via whatsapp`
- `8699638` — `feat: connect real evolution webhook with automated greeting, human handoff, and bot pause isolation`
- `ad53307` — `feat: complete asaas webhook guard with timing-safe auth, idempotency and tenant suspension`
- `1c39c68` — `feat: implement atomic 10min lock booking flow with pin verification and transactional whatsapp messages`

---
*Este documento é a fonte canônica da verdade do FlowAgenda. Mantenha-o sempre atualizado a cada grande entrega arquitetural.*
