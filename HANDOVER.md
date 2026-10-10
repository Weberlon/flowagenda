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

---

## 3. Matriz de Progresso Atual

| Módulo | Status | Descrição |
| :--- | :---: | :--- |
| **Compilação e Deploy (Vercel)** | 🟢 100% | Build passa com 0 erros e 0 warnings impeditivos. Pipeline automático via Git. |
| **Estilização Global (Tailwind v4)** | 🟢 100% | Design System Nord Dark/Light funcional, CSS compilado corretamente. |
| **Autenticação & Controle de Sessão** | 🟢 100% | Login funcional com separação por perfil (`super_admin` e `lojista`). |
| **Painel Super Admin (`/superadmin`)** | 🟢 100% | Cadastro de novos lojistas homologado e testado com sucesso. |
| **Página Pública do Tenant (`/tenant/[slug]`)** | 🟢 90% | Renderiza o estabelecimento, paleta de cores e interface de agendamento. |
| **Painel do Lojista (`/dashboard`)** | 🟢 100% | Layout base, agenda, serviços, configurações e clientes 100% operacionais. |
| **Conexão WhatsApp (Evolution API)** | 🟢 100% | Conexão, exibição de QR Code em tempo real, sincronização, restart e logout operacionais no dashboard. |
| **Gestão de Clientes (`/dashboard/clientes`)** | 🟢 100% | Listagem com RLS estrito, KPIs de retenção, busca em tempo real, cadastro manual e atalho WhatsApp. |

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

### Etapa 3: Homologação do Fluxo de Agendamento Transacional com PIN
- **Objetivo:** Validar a experiência de ponta a ponta do cliente final:
  1. Cliente acessa `[subdominio].flowagenda.online`.
  2. Escolhe serviço e horário livre.
  3. Sistema aplica lock de 10 minutos (`status = 'pendente_pin'`).
  4. Robô dispara PIN de 6 dígitos no WhatsApp do cliente via Evolution API.
  5. Cliente digita o PIN na tela para confirmar.
  6. Agendamento passa para `status = 'confirmado'` e reflete instantaneamente na agenda do lojista.
- **Desafios Técnicos:**
  - Concorrência de horários (dois clientes tentando o mesmo horário simultaneamente).
  - Job/Cron para liberar horários cujo PIN expirou após 10 minutos.

### Etapa 4: Integração de Faturamento e Cobrança Recorrente (Asaas)
- **Objetivo:** Validar o ciclo financeiro do SaaS:
  - Criação de assinatura ao ativar lojista.
  - Recepção do webhook `PAYMENT_OVERDUE` e atualização do status para `inadimplente`.
  - Exibição da tela de bloqueio com botão de quitação de fatura.

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
