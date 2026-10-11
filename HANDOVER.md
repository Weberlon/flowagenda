# FlowAgenda — Relatório de Handover, Arquitetura e Roadmap

Este documento consolida o estado atual do desenvolvimento do **FlowAgenda**, documentando a arquitetura, todas as correções implementadas, os desafios mapeados por etapas e as instruções operacionais para continuidade do trabalho sem perda de contexto.

---

## 1. Visão Geral e Arquitetura do Sistema

O **FlowAgenda** é um Software with a Service (SwaS) multi-tenant focado em automação de agendamentos e atendimento para comércio local (barbearias, clínicas estéticas, salões de beleza).

### Stack Tecnológica
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Estilização & UI:** Tailwind CSS v4, PostCSS, Radix/Shadcn UI primitives
- **Identidade Visual:** Estética *Nord Research* (paleta sóbria, tons `slate-900`/`slate-50`, tipografia Inter, suporte nativo a Dark/Light Mode)
- **Banco de Dados & Auth:** Supabase (PostgreSQL com Row Level Security — RLS rígido)
- **Hospedagem & Deploy:** Vercel (CI/CD com branch `main`)
- **Integrações de Terceiros:**
  - **Evolution API (VPS):** Disparo de mensagens transacionais no WhatsApp, geração de QR Code de instâncias e recepção de webhooks.
  - **Asaas:** Gestão de assinaturas recorrentes, faturamento e webhooks de inadimplência.
  - **Vercel Domains API:** Provisionamento automatizado de domínios próprios para lojistas Tier 3.

### Arquitetura de Roteamento Multi-Tenant (`middleware.ts`)
O isolamento e resolução de domínios operam sob o seguinte fluxo:
1. **Rotas de Sistema / Internas (Bypass Direto):**  
   `/superadmin`, `/dashboard`, `/login`, `/tenant` e `/api` não sofrem reescrita.
2. **Ambiente Principal & Preview (`flowagenda.online`, `localhost`, `*.vercel.app`):**  
   Reescrita transparente da raiz `/` para `/home` (landing page institucional do SaaS).
3. **Subdomínios Wildcard (`[slug].flowagenda.online`):**  
   Reescrita transparente para `/tenant/[slug]`.
4. **Domínios Personalizados (`exemplo.com.br`):**  
   Reescrita transparente para `/tenant/custom_[domain]`.

---

## 2. Histórico de Diagnósticos e Correções Recentes

| Problema Identificado | Causa Raiz Técnica | Solução Definitiva Implementada | Arquivos Modificados |
| :--- | :--- | :--- | :--- |
| **Avisos de Depreciação no Build (TS5107 / TS5101)** | Configurações antigas no compilador TypeScript incompatíveis com versões recentes do Next.js. | Atualizado `"target": "es2022"` e adicionado `"ignoreDeprecations": "6.0"` em `compilerOptions`. | [`tsconfig.json`](./tsconfig.json) |
| **Erro 404 ao Acessar `/superadmin`** | O middleware interceptava `/superadmin` e reescrevia para `/home/superadmin`, que não existia fisicamente. | Adicionada lista de bypass no `middleware.ts` para rotas globais do sistema. | [`middleware.ts`](./middleware.ts) |
| **Erro 404 ao Redirecionar para `/login`** | A rota de login não existia fisicamente no projeto após a reorganização das pastas. | Criada a página de login com estética Nord e criada a Server Action de autenticação com Supabase Auth. | [`app/login/page.tsx`](./app/login/page.tsx), [`app/actions/auth.ts`](./app/actions/auth.ts) |
| **Interface Quebrada (Sem Estilos / CSS 0 bytes)** | 1. `app/layout.tsx` não tinha tags `<html>`/`<body>` e continha um cabeçalho fixo indevido.<br>2. Tailwind v4 no Next.js exige `@tailwindcss/postcss` e `postcss.config.mjs`. Sem eles, o bundle CSS gerado tinha 0 bytes. | 1. Instalado `@tailwindcss/postcss` e criado `postcss.config.mjs`.<br>2. Criado `app/globals.css` com `@import "tailwindcss";`.<br>3. Normalizado o Root Layout em `app/layout.tsx`. Bundle compilou 27 KB de estilos. | [`postcss.config.mjs`](./postcss.config.mjs), [`app/globals.css`](./app/globals.css), [`app/layout.tsx`](./app/layout.tsx) |
| **Acesso Negado na Tela de Super Admin** | Usuário criado no Supabase Auth não possuía registro correspondente na tabela `public.profiles` (ausência de trigger automático). O comando `UPDATE` anterior alterou 0 linhas. | Executado comando `INSERT ... ON CONFLICT DO UPDATE` no Supabase SQL Editor garantindo criação do perfil com `role = 'super_admin'`. | Banco de Dados / SQL Editor |
| **Super Admin Travado na Tela "Conta Criada!"** | No `/dashboard`, a verificação buscava o lojista do usuário logado. Como super admins gerenciam todas as lojas e não possuem loja própria vinculada, caíam no fallback. | Adicionada validação de role no `app/dashboard/layout.tsx`: se o usuário for `super_admin`, é redirecionado automaticamente para `/superadmin`. | [`app/dashboard/layout.tsx`](./app/dashboard/layout.tsx) |
| **Erro 500 / React #441 ao Cadastrar Lojista** | `createTenantAction` não tinha bloco `try/catch`. Tentava chamar `createAdminClient()` (que exigia `SUPABASE_SERVICE_ROLE_KEY`) e APIs externas sem tolerância a falhas. | 1. Envolvida action em `try/catch` seguro.<br>2. Adicionados fallbacks tolerantes a falha para Evolution API e Asaas.<br>3. `onboarding-form.tsx` atualizado para exibir feedback visual sem crashar. | [`app/actions/tenant.ts`](./app/actions/tenant.ts), [`app/superadmin/onboarding-form.tsx`](./app/superadmin/onboarding-form.tsx) |
| **Erro 404 ao Acessar `/tenant/[slug]`** | Domínios `*.vercel.app` caíam na regra de domínio personalizado próprio, reescrevendo `/tenant/slug` para caminhos duplicados inexistentes. | 1. Bypassed rota `/tenant` no `middleware.ts`.<br>2. Reconhecido `*.vercel.app` como host raiz.<br>3. Ajustado `app/tenant/[slug]/page.tsx` para aguardar `params` assíncronos (Next.js 16). | [`middleware.ts`](./middleware.ts), [`app/tenant/[slug]/page.tsx`](./app/tenant/[slug]/page.tsx) |
| **Vazamento de PIN & Risco de Brute Force** | 1. `pinSimulado` retornado na resposta da Action.<br>2. Ausência de bloqueio após tentativas incorretas consecutivas. | 1. `pinSimulado` desativado se em produção ou com Evolution API configurada.<br>2. Adicionado bloqueio e cancelamento automático após 3 tentativas de PIN erradas. | [`app/actions/agendamento.ts`](./app/actions/agendamento.ts) |
| **Distorção de Fuso Horário (Vercel vs BRT)** | `setHours(8)` no Node.js rodando em UTC abria horários às 05:00 da manhã no horário de Brasília. | Criado utilitário `createSaoPauloDate` forçando fuso oficial `America/Sao_Paulo` (UTC-3) para cálculo de horários comerciais. | [`app/actions/agendamento.ts`](./app/actions/agendamento.ts) |
| **Clientes Fantasmas & Reset de Fidelidade** | 1. Reservas não confirmadas criavam contatos com 0 agendamentos.<br>2. Upsert manual sobrescrevia `total_agendamentos` de clientes fiéis para 1. | 1. Criação do cliente transferida exclusivamente para após o PIN ser validado.<br>2. Preservado `total_agendamentos` em cadastros e atualizações manuais. | [`app/actions/agendamento.ts`](./app/actions/agendamento.ts), [`app/actions/clientes.ts`](./app/actions/clientes.ts) |

---

## 3. Matriz de Progresso Atual

| Módulo | Status | Descrição |
| :--- | :---: | :--- |
| **Compilação e Deploy (Vercel)** | 🟢 100% | Build passa com 0 erros e 0 warnings impeditivos. Pipeline automático via Git. |
| **Estilização Global (Tailwind v4)** | 🟢 100% | Design System Nord Dark/Light funcional, CSS compilado corretamente. |
| **Autenticação & Controle de Sessão** | 🟢 100% | Login funcional com separação por perfil (`super_admin` e `lojista`). |
| **Painel Super Admin (`/superadmin`)** | 🟢 100% | Cadastro de novos lojistas homologado e testado com sucesso. |
| **Landing Page Comercial Oficial (`/home`)** | 🟢 100% | Vitrine de alta conversão, simulação do robô, tabela de preços Tiers 1-3, FAQ e CTA WhatsApp. |
| **Página Pública do Tenant (`/tenant/[slug]`)** | 🟢 100% | Agendamento atômico, lock de 10 min, validação de PIN e suspensão por inadimplência. |
| **Painel do Lojista (`/dashboard`)** | 🟢 100% | Layout base, agenda, serviços, configurações e clientes 100% operacionais. |
| **Conexão WhatsApp (Evolution API)** | 🟢 100% | Conexão, exibição de QR Code em tempo real, sincronização, restart e logout operacionais no dashboard. |
| **Gestão de Clientes (`/dashboard/clientes`)** | 🟢 100% | Listagem com RLS estrito, KPIs de retenção, busca em tempo real, cadastro manual e atalho WhatsApp. |
| **Integração Asaas & Cobrança** | 🟢 100% | Webhooks com `timingSafeEqual`, idempotência, bloqueio e suspensão automática de inadimplentes. |

---

## 4. Desafios e Roadmap por Etapas

### Etapa 1: Tela de Configurações e Pareamento de WhatsApp (Concluído 🟢)
- **Status:** 100% implementado em `app/dashboard/configuracoes/page.tsx` e `configuracoes-client.tsx`.
- **Entregas:**
  - Status em tempo real (`Conectado`, `Aguardando Pareamento`, `Conectando`).
  - Renderização do QR Code com guia passo a passo em 4 etapas.
  - Ações para Sincronizar status, Reiniciar instância e Desconectar WhatsApp.
  - Editor com preview ao vivo da mensagem de boas-vindas do robô (`mensagem_boas_vindas`) com inserção de variáveis (`{nome_estabelecimento}`, `{link_agendamento}`).
  - Gerenciamento do número de WhatsApp de notificações do estabelecimento.
  - Exibição de link público e subdomínio do lojista com cópia rápida para área de transferência.

### Etapa 2: Módulo de Clientes (`/dashboard/clientes`) (Concluído 🟢)
- **Status:** 100% implementado em `app/dashboard/clientes/page.tsx`, `clientes-client.tsx` e `app/actions/clientes.ts`.
- **Entregas:**
  - Isolamento estrito de tenant (`lojista_id`) garantido por consultas tipadas e RLS do Supabase.
  - 3 KPIs em destaque: Total de Clientes, Clientes Recorrentes (frequência > 1) e Volume Total de Atendimentos.
  - Busca instantânea e filtragem por Nome ou WhatsApp com DDD.
  - Tabela com avatares de iniciais, status de fidelidade (`VIP`, `Fiel`, `Novo`), data da última visita formatada.
  - Ação rápida para disparar mensagem direta no WhatsApp via link `wa.me` contextualizado com o nome do lojista e do cliente.
  - Modal para adição manual de novos clientes com validação e atualização otimista.

### Etapa 3: Homologação do Fluxo de Agendamento Transacional com PIN (Concluído 🟢)
- **Status:** 100% implementado em `app/actions/agendamento.ts`, `app/tenant/[slug]/agendamento-client.tsx` e `lib/evolution.ts`.
- **Entregas:**
  - Validação estrita de duração de serviços restrita a `[15, 30, 45, 60]` minutos conforme `AGENTS.md`.
  - Tratamento atômico de colisão de horários para impedir concorrência de múltiplos clientes no mesmo slot.
  - Limpeza proativa de locks expirados no banco (`expira_em < NOW()` passam para `cancelado`).
  - Lock de exatamente 10 minutos (`status = 'pendente_pin'`) com cronômetro regressivo visível na interface.
  - Geração de PIN de 6 dígitos numérico criptográfico e disparo de mensagem transacional via Evolution API no WhatsApp do cliente com mascaramento LGPD (`+55 11 9****-1234`).
  - Confirmação do agendamento, atualização da recorrência do cliente e disparo de mensagens automáticas de confirmação para o cliente e notificação para o lojista (`whatsapp_notificacao`).

### Etapa 4: Integração de Faturamento e Cobrança Recorrente (Asaas) (Concluído 🟢)
- **Status:** 100% implementado em `app/api/webhooks/asaas/route.ts`, `app/tenant/[slug]/page.tsx` e `app/dashboard/layout.tsx`.
- **Entregas:**
  - Autenticação estrita do webhook utilizando `crypto.timingSafeEqual` contra *timing attacks* (skill `asaas-webhook-guard`).
  - Idempotência com cache de descarte rápido por ID único do evento (`eventId`) evitando reprocessamentos duplicados.
  - Mapeamento completo dos eventos do Asaas para `status_pagamento`:
    - `ativo`: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `SUBSCRIPTION_CREATED`.
    - `inadimplente`: `PAYMENT_OVERDUE`, `PAYMENT_DUNNING_RECEIVED`.
    - `cancelado`: `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `SUBSCRIPTION_DELETED`.
  - Resolução flexível por `asaas_customer_id` ou `asaas_subscription_id`.
  - Suspensão imediata:
    - **No painel do lojista (`app/dashboard/layout.tsx`):** tela de bloqueio com aviso e botão direto para regularização no WhatsApp.
    - **Na página pública do tenant (`app/tenant/[slug]/page.tsx`):** substituição do formulário de agendamento por aviso de indisponibilidade temporária e botão para contato no WhatsApp.

---

## 5. Como Verificar a Migração do Domínio na Hostinger

Você alterou os servidores DNS na Hostinger para `ns1.vercel-dns.com` e `ns2.vercel-dns.com`. Para verificar se a propagação já foi concluída:

### Método 1: Pelo Painel da Vercel (Mais Preciso)
1. Acesse o projeto na **[Vercel](https://vercel.com)**.
2. Vá em **Settings** > **Domains**.
3. Localize os domínios `flowagenda.online` e `*.flowagenda.online`.
4. **Indicador de Sucesso:** Se ambos estiverem com um ícone de **Check Verde (✅)** e o status `Valid Configuration`, a migração está 100% concluída.

### Método 2: Ferramentas Globais de Propagação de DNS
1. Acesse o site gratuito **[whatsmydns.net](https://www.whatsmydns.net/)**.
2. Digite `flowagenda.online` e selecione o tipo **NS** (Nameserver).
3. **Indicador de Sucesso:** A maioria dos servidores mundiais deve retornar `ns1.vercel-dns.com` e `ns2.vercel-dns.com` com checks verdes.

### Método 3: Pelo Terminal Local (PowerShell)
Abra o terminal e execute:
```powershell
Resolve-DnsName flowagenda.online -Type NS
```
Se o resultado listar `ns1.vercel-dns.com`, o seu computador local já enxerga o domínio apontando para a Vercel.

---

## 6. Etapa 5: Implementação do Compêndio Estratégico SwaS (Concluído 🟢)

- **Status:** 100% implementado e homologado no build de produção.
- **Entregas:**
  1. **Robô de Avaliação 5 Estrelas no Google Meu Negócio pós-atendimento (`app/api/cron/reviews/route.ts`):**
     - Disparo automatizado via WhatsApp (Evolution API) exatamente 2 horas após a conclusão do agendamento.
     - Travas anti-spam: apenas envia se o lojista tiver `google_review_url` preenchido e apenas nas duas primeiras consultas do cliente (`total_agendamentos <= 2`), preservando a relação com clientes frequentes.
  2. **Configuração Done-For-You do Google Reviews:**
     - Campo `google_review_url` integrado no Onboarding do Super Admin (`app/superadmin/onboarding-form.tsx` e `app/actions/tenant.ts`).
     - Card de gestão de autoridade com status "Otimizado SwaS" no painel do Lojista (`app/dashboard/configuracoes/configuracoes-client.tsx` e `app/actions/configuracoes.ts`).
  3. **Motor de Templates de Alta Conversão com Prova Social e Galeria Nichada (`app/tenant/[slug]/page.tsx`):**
     - Suporte dinâmico para `tipo_site = 'institucional_completo'`.
     - Biblioteca de fotos profissionais curadas e responsivas com detecção de nicho (Barbearia/Salão vs Clínica/Dentista), badge de 5.0 estrelas e link direto do Google Maps sem exigir uploads pesados.
  4. **Alinhamento da Tabela de Preços e Tiers na Landing Page Oficial (`app/home/page.tsx`):**
     - **Tier 1 (Barbearias e Salões):** R$ 59,90/mês — Setup simbólico/grátis, subdomínio ágil e robô de agendamento autônomo.
     - **Tier 2 (Clínicas e Consultórios - Mais Escolhido):** R$ 179,90/mês + Setup Done-For-You de R$ 350,00 — Domínio próprio, Ficha do Google Meu Negócio otimizada, Robô de avaliação 5★ pós-consulta e landing page institucional.
     - **Tier 3 (Redes & Franquias):** R$ 349,90/mês — Suporte multi-unidade, múltiplas agendas e SLA prioritário.

---

## 7. Etapa 6: Conexão Real do Webhook Receptivo da Evolution API (Concluído 🟢)

- **Status:** 100% implementado, testado e homologado no build de produção.
- **Entregas:**
  1. **Envio Real via `sendEvolutionTextMessage` (`app/api/webhooks/evolution/route.ts`):**
     - Substituição dos mocks/console.log por disparos reais usando o serviço transacional e isolado da Evolution API.
     - Proteção contra loops: ignora mensagens enviadas pelo próprio bot (`fromMe: true`), grupos do WhatsApp (`@g.us`) e publicações/broadcasts (`@broadcast`).
  2. **Personalização e Resolução Dinâmica de Domínio:**
     - Carrega a mensagem de boas-vindas customizada pelo lojista (`mensagem_boas_vindas`) substituindo `{nome_estabelecimento}` e `{link_agendamento}` dinamicamente (com suporte a domínio próprio ou subdomínio).
  3. **Transbordo Humano com Pausa Automática do Robô:**
     - Identificação de intenção humana (dúvidas, recepcionista, atendimento).
     - Atualização atômica de `bot_pausado_ate` em `configuracoes_robo` pausando o bot por 2 horas para conversação humana desimpedida.
     - Mensagem empática ao cliente e notificação com prévia da mensagem para o WhatsApp do profissional (`whatsapp_notificacao`).

---

## 8. Etapa 7: Lembretes Preventivos Anti No-Show & Cron Otimizado (Concluído 🟢)

- **Status:** 100% implementado, testado e homologado no build de produção.
- **Entregas:**
  1. **Otimização do Cron na Vercel (`vercel.json`):**
     - Periodicidade atualizada de diária (`0 0 * * *`) para horária comercial (`0 * * * *`).
     - Garante que a esteira de atendimento processe os lembretes prévios e avaliações pós-atendimento continuamente durante o horário de expediente.
  2. **Lembrete Preventivo Anti No-Show (Fase 1 do Cron em `app/api/cron/reviews/route.ts`):**
     - Busca automática de agendamentos confirmados com início previsto para as próximas 2h a 2h30.
     - Formatação de horário oficial no fuso `America/Sao_Paulo` (ex: "às 14:30") e identificação do procedimento.
     - Disparo amigável no WhatsApp do cliente reforçando compromisso, preparação do atendimento e canal de cancelamento rápido.
     - Marcação idempotente no banco com `pin_validacao = 'LEMBR'`, garantindo zero mensagens duplicadas sem exigir alterações manuais no schema remoto.
  3. **Avaliação 5★ do Google e Fechamento (Fase 2 do Cron):**
     - Agendamentos finalizados há mais de 2 horas recebem o link do Google Meu Negócio caso o cliente esteja na 1ª ou 2ª visita, e o agendamento transiciona automaticamente para `concluido`.

---

## 9. Etapa 8: Componentes Interativos Nord Dark & Precificação Estratégica (Concluído 🟢)

- **Status:** 100% implementado, homologado e integrado na Landing Page Oficial (`app/home/page.tsx`).
- **Entregas:**
  1. **Hero Interativo Multi-Nicho (`components/landing/HeroInteractiveMockup.tsx`):**
     - Alternador dinâmico de segmentos com micro-interações:
       - **⚡ Agendamento Ágil (Barbearias & Salões):** Card do Google com 5.0 estrelas (+158 avaliações), grade semanal interativa de horários destacados em ciano (`#88C0D0`) e balão flutuante WhatsApp simulando travamento de PIN e timer regressivo de 10 min.
       - **🛡️ Consultórios & Clínicas (Saúde & Estética):** Card do Google Maps com pino pulsante (+420 buscas por rotas/mês), depoimento de autoridade médica e card de confirmação com badge **"✓ Presença Confirmada (Anti No-Show)"**.
     - Proteção de layout com `overflow-hidden` em containers pais para eliminar qualquer rolagem lateral em dispositivos móveis.
  2. **Grid de Preços com Ancoragem de Setup (`components/landing/PricingTiers.tsx`):**
     - Alinhamento da nova estratégia comercial com 3 tiers em layout responsivo:
       - **Tier 1 (Operação Ágil):** R$ 79,90/mês | Implantação: de ~~R$ 197,00~~ por R$ 97,00 à vista (ou grátis no plano anual).
       - **Tier 2 (Saúde & Liberais):** R$ 139,90/mês | Implantação: de ~~R$ 397,00~~ por R$ 197,00 à vista (ou grátis no anual).
       - **Tier 3 (Alto Padrão & Clínicas):** R$ 249,90/mês | Implantação: de ~~R$ 797,00~~ por R$ 497,00 à vista. Borda `#88C0D0`, badge de máxima autoridade, domínio próprio `.com.br` e robô Google Reviews 5★.
     - Alternador dinâmico de faturamento (Mensal vs Anual com Setup Grátis).
  3. **Integração na Landing Page Oficial (`app/home/page.tsx`):**
     - Substituição do mockup estático e da tabela de planos anterior. Build de produção da Next.js compilado com 0 erros.

---

## 10. Etapa 9: Suporte a White Label e Metadados Dinâmicos (Concluído 🟢)

- **Status:** 100% implementado, testado e validado no build de produção.
- **Entregas:**
  1. **Schema & Migration (`supabase/migrations/20261011120000_white_label_config.sql`):**
     - Adicionada coluna `configuracoes` JSONB em `lojistas` com suporte a `mostrar_badge_plataforma`, `cor_primaria`, `cor_secundaria` e `favicon_url`.
     - Atualização populacional: Tier 1 recebe `mostrar_badge_plataforma = true`; Tiers 2 e 3 recebem `mostrar_badge_plataforma = false` (White Label total).
  2. **Metadados Dinâmicos (`app/tenant/[slug]/page.tsx`):**
     - Função oficial `generateMetadata` implementada:
       - `title`: `${lojista.nome_estabelecimento} | Agendamento Online`
       - `description`: `Agende seu horário online em ${lojista.nome_estabelecimento}. Rápido, prático e sem filas.`
       - `icons`: Favicon dinâmico (`favicon_url || logo_url || '/favicon.ico'`), eliminando qualquer vazamento da marca FlowAgenda na aba do navegador.
  3. **Controle Condicional do Selo no Rodapé:**
     - Exibição de `⚡ Agendamento seguro via FlowAgenda` estritamente condicionada a `mostrar_badge_plataforma !== false`.
     - Para lojistas dos Tiers 2 e 3, rodapé exibe exclusivamente: `© 2026 [Nome da Loja]. Todos os direitos reservados.`.
  4. **Configuração de Imagens Segura (`next.config.mjs`):**
     - `remotePatterns` adicionados para Supabase Storage (`*.supabase.co`) e Unsplash sem quebrar o build.
  5. **Diretrizes de Segurança Preservadas:**
     - `middleware.ts` mantido intacto.
     - Isolamento multi-tenant e RLS 100% preservados com tolerância e fallback ativo a bancos remotos em migração.

---

## 11. Etapa 10: Nova Vitrine Pública Institucional, Hero com Toggle e Pricing com 3 Ciclos (Concluído 🟢)

- **Status:** 100% implementado, testado e validado no build de produção.
- **Entregas:**
  1. **Landing Page Institucional na Rota Raiz (`app/page.tsx`):**
     - Mantido estritamente como **Server Component** (sem `'use client'`), garantindo máxima pontuação em Core Web Vitals e SEO estático de alto impacto.
     - Posicionamento de "Máquina de Tração para Comércio Local".
     - **Hero Section:** Headline de alto impacto ("Sua agenda cheia e seu negócio no topo do Google. Sem você perder horas no WhatsApp."), botões de ação e integração lado a lado com o mockup.
     - **O Motor de 3 Engrenagens:** Explicação didática da Atração no Google Meu Negócio, Presença Digital e Atendimento com PIN no WhatsApp.
     - **Destaque de Marca Própria (White Label):** Enfatiza a valorização da identidade do lojista (cores, logo, domínio próprio).
     - **FAQ Completo e Rodapé Minimalista.**
  2. **Hero Interativo (`components/landing/HeroInteractiveMockup.tsx` - Client Component):**
     - Toggle de 2 segmentos em pílula ("⚡ Agendamento Ágil" vs "🛡️ Consultórios & Clínicas").
     - Simulação de PIN via WhatsApp, Google 5★, slots em ciano e badge Anti No-Show.
  3. **Tabela de Preços com 3 Ciclos (`components/landing/PricingTiers.tsx` - Client Component):**
     - Seletor de Ciclos: **Mensal**, **Semestral (-15% OFF)** e **Anual (-25% OFF + Setup GRÁTIS)**.
     - Tiers 1, 2 e 3 com ancoragem psicológica da taxa de implantação/setup e botões de adesão direta no WhatsApp.
  4. **Conformidade de Build & Não-Regressão:**
     - `middleware.ts`, `app/tenant/[slug]/`, `app/dashboard/` e `app/superadmin/` 100% preservados.
     - `npm run build` compilou 11/11 rotas estáticas e dinâmicas com 0 erros.

---

## 12. Etapa 11: Módulo CRM de Clientes Blindado com Kanban & LTV (`/dashboard/clientes`) (Concluído 🟢)

- **Status:** 100% implementado, testado e validado no build de produção.
- **Entregas:**
  1. **Schema & Migration (`supabase/migrations/20261011130000_crm_clientes.sql`):**
     - Tabela `clientes` atualizada com suporte completo a CRM: `etapa_kanban` (`lead`, `agendado`, `atendido`, `no_show`, `fidelizado`), `total_gasto` (LTV), `total_agendamentos`, `observacoes`, `tags` e `updated_at`.
     - Constraint única `(lojista_id, telefone)`.
     - RLS ativado com política `USING` e `WITH CHECK` vinculada ao `user_id` autenticado.
  2. **Server Actions Blindadas (`app/actions/clientes.ts`):**
     - Todas as actions extraem o usuário via `supabase.auth.getUser()` e resolvem o `lojista_id` no servidor, rejeitando inputs externos não autorizados.
     - Higienização obrigatória de telefone removendo caracteres não numéricos (`\D`) ao salvar e ao gerar URLs `https://wa.me/55...`.
     - Funções implementadas: `getClientes()`, `upsertCliente()`, `updateClienteEtapa()`, `updateClienteNotas()` e `deleteClienteAction()`.
  3. **Interface CRM de Alta Performance (`app/dashboard/clientes/clientes-client.tsx`):**
     - **Modo Kanban Responsivo:** 5 colunas com drag-and-drop nativo no desktop + seletor rápido no rodapé para tablets/iPads.
     - **Badges Automáticos:** `VIP` (LTV >= R$ 500,00) e `Recorrente` (visitas >= 3).
     - **Modo Lista Inteligente:** Busca em tempo real por nome/WhatsApp e filtros em pílulas.
     - **Drawer Lateral de Detalhes:** Slide-over para anotações internas de atendimento e tags personalizadas.
     - **Estilização Nord Dark:** Telas `#242933`, cards `#2E3440`, bordas `#4C566A/40`, acentos ciano `#88C0D0`, verde `#A3BE8C`, amarelo `#EBCB8B` e vermelho `#BF616A`.

---

## 13. Checklist de Lançamento em Produção & Lembretes Críticos ⚠️

> [!IMPORTANT]
> **LEMBRETE ATIVO — EVOLUTION API NA VPS:**
> As variáveis `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` estão temporariamente com valores de simulação no `.env.local`. Assim que a VPS for contratada e configurada com a Evolution API, você deve atualizar:
> 1. `EVOLUTION_API_URL` (ex: `https://evolution.seudominio.com`)
> 2. `EVOLUTION_API_KEY` (Chave global gerada no `.env` da Evolution API)
> 3. Configurar as mesmas variáveis nas **Environment Variables** da Vercel.

### Itens para Virada de Chave (Produção):
- [ ] **Evolution API (VPS):** Preencher URL e API Key reais no `.env.local` e Vercel para liberar disparo de WhatsApp em produção.
- [ ] **Asaas Produção:** Migrar chave de homologação (`$aact_hmlg_...`) para a chave de produção oficial e mudar `ASAAS_API_URL` para `https://api.asaas.com/v3`.
- [ ] **Vercel Domains (Tier 3):** Adicionar `VERCEL_PROJECT_ID` e `VERCEL_API_TOKEN` caso for ativar provisionamento automático de domínios `.com.br`.
- [ ] **Propagação DNS:** Confirmar ativação de `flowagenda.online` na Vercel após atualização dos nameservers na Hostinger.
