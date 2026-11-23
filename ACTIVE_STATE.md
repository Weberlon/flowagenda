# ACTIVE_STATE.md — FlowAgenda (`https://www.flowagenda.online`)
**Data de atualização:** 22/11/2026 | **Proprietário:** Weberlon Braga | **Status Geral:** MVP Concluído (Etapas 1 a 8.2) — Nicho de podologia, aprimoramento estético da landing page, rota `/demo` isolada, limpeza de lojistas fictícios de teste, publicação de sites `/p/[slug]` e Kanban com automação progressiva de leads concluídos (`main` em `61caddd`).

---

## 1. Regras Operacionais e de Comunicação (Obrigatórias)
1. **Idioma:** 100% Português do Brasil (PT-BR) em todas as respostas, prompts, rotas/interfaces visíveis, rótulos, mensagens e documentação; sem português europeu e sem termos em inglês desnecessários na UI.
2. **Estética Nord Dark Estrita:**
   - Fundo principal: `#2E3440` | Cards/painéis: `#3B4252` | Hover: `#434C5E` | Bordas: `#4C566A` | Texto: `#ECEFF4`
   - Destaques: `#88C0D0` (azul ártico), `#A3BE8C` (verde sálvia), `#EBCB8B` (âmbar), `#BF616A` (vermelho), `#B48EAD` (lavanda).
   - Preservar integralmente scripts jQuery de ajuste estético existentes no front-end.
3. **Execução via Antigravity:** Entregar instruções técnicas como **prompt único, completo e auto-contido**, sempre exigindo validação final com `npx tsc --noEmit` e `npm run build` (`exit code 0`).
4. **Métrica Obrigatória ao Final de Cada Resposta:** Sempre informar o **progresso estimado do projeto (%)** e o **tempo médio restante** para conclusão da etapa/tarefa.
5. **Continuidade entre Conversas:** Sempre manter e atualizar este documento de estado estruturado quando solicitado abrir uma nova conversa.

---

## 2. Arquitetura e Infraestrutura
- **Stack:** Next.js App Router (16.x), React, TypeScript, Tailwind CSS, Recharts, Supabase (PostgreSQL + RLS), Vercel (`https://www.flowagenda.online` — sempre usar `www.`), Hostinger VPS (`http://179.236.70.181:8080`).
- **Integrações:**
  - **WhatsApp:** Evolution API v2 (instância `flowagenda-teste`) + DeepSeek AI + fila isolada (`chat_queue`) + cron `/api/cron/process-chat-queue`.
  - **Pagamentos:** Asaas API v3 (`app/api/admin/asaas/subscribe/route.ts` e webhook `/api/webhooks/asaas`).
  - **Prospecção:** Script `scripts/prospect-leads.ts` (Google Places API, base CEP `32115-250` em Contagem/MG, raio 5 km e remoto, exportação `.csv` em `exports/leads/`).

---

## 3. As 5 Regras Blindadas (NÃO ALTERAR NEM QUEBRAR)
1. **Status e Fundadores:** `status_pagamento` em `lojistas` mantém `DEFAULT 'pendente'`; contas com `is_founder = true` nascem `'ativo'`, possuem isenção vitalícia, têm cobrança inicial bloqueada no `/superadmin` e **nunca** são rebaixadas por `PAYMENT_OVERDUE` ou `SUBSCRIPTION_DELETED` em `/api/webhooks/asaas`.
2. **Idempotência e Checkout Asaas:** Verificar cliente por `cpfCnpj` (`GET /v3/customers` antes de `POST /v3/customers`); exibir botão `"Ver / Nova Cobrança"` quando já existir `asaas_subscription_id`; `CheckoutModal.tsx` sem seletores duplicados e com redirecionamento direto (`window.location.href = data.invoiceUrl`).
3. **Trava de Inadimplência:** Em `app/dashboard/layout.tsx`, bloquear acesso operacional **apenas** quando `status_pagamento !== 'ativo' && !is_founder && !isImpersonating`.
4. **Segurança Super Admin:** Todas as rotas `/api/admin/*` protegidas por `verifySuperAdminSession()` retornando `401 Unauthorized` quando não autenticado.
5. **Isolamento de Fila WhatsApp:** `chat_queue` blindada por `remote_jid` para evitar cruzamento de mensagens/sessões entre contatos.

---

## 4. Funcionalidades Concluídas no MVP (Etapas 1 a 8.2 + Evoluções)
- **Core SaaS:** Landing page (`/`) em Nord Dark com monograma `"F"`, calendário mensal animado em CSS puro (check `#A3BE8C` + destaque 5★ Google), cabeçalho em linha única, vitrine de nichos em grade responsiva sem rolagem, rota `/demo` isolada do banco, autenticação, vitrine pública (`/tenant/[slug]`) com bloqueio atômico de horário e PIN via WhatsApp, painel do lojista (`/dashboard`) com Agenda de Hoje, CRM (`clientes-client.tsx`) com **Kanban de automação progressiva (`lib/kanban-sync.ts`: `lead` → `agendado` → `atendido` → `fidelizado`)**, Configurações e `/superadmin` (com impersonação, saúde do sistema, publicação de sites `/p/[slug]` via `/api/admin/site-lojista` e painel de manutenção `/api/admin/manutencao` para cortesia `is_founder`, exclusão em lote e limpeza de filas).
- **Especialização por Nichos:**
  - `pet_shop`: tabela `pets` + `PetsManagerModal.tsx`.
  - `odontologia`: `fichas_clinicas` + `OdontogramaModal.tsx` (notação FDI, anamnese, retorno, orçamento em BRL).
  - `estetica`: `fichas_clinicas` + `MapaEsteticoModal.tsx` (mapeamento facial/corporal).
  - `psicologia`: `evolucao_psicologica` + `ProntuarioPsicoModal.tsx` + triagem estritamente administrativa no WhatsApp (sigilo/LGPD).
  - `podologia`: `fichas_clinicas` (`tipo_ficha = 'ficha_podologica'`) + `FichaPodologicaModal.tsx` (mapeamento Pé Direito/Esquerdo, protocolo Pé Diabético, órteses e retorno) + pré-triagem IA.
  - `barbearia`, `salao_beleza` e `tatuagem` suportados na plataforma.
- **Lembretes e Avaliação Google Meu Negócio:**
  - Lembretes idempotentes via Evolution API v2 (`lembrete_enviado`, `lembrete_enviado_at`).
  - Solicitação idempotente de avaliação Google Meu Negócio (`avaliacao_enviada`, `avaliacao_enviada_at`, `google_review_url`) e **bloqueio ético automático no nicho `psicologia`**.

---

## 5. Decisões Comerciais, Marca e Contrato Atualizadas
- **Contato Comercial/Consultoria Oficial do FlowAgenda:** WhatsApp `5531984139736` (`(31) 98413-9736`) — exclusivo para atendimento/consultoria da plataforma (`lib/brand-contact.ts`).
- **Planos e Ciclos:** *Essencial* (`R$ 49,90`), *Profissional* (`R$ 84,90`) e *Autoridade* (`R$ 159,90`) nos ciclos mensal, semestral e anual (setup gratuito no anual, quando aplicável).
- **Domínio Próprio vs. Plataforma:** Endereços/rotas sob `flowagenda.online` integram o serviço; quando o lojista optar por domínio próprio (ex.: plano *Autoridade*), o registro, titularidade e renovação anual são custeados pelo próprio lojista, cabendo ao FlowAgenda a orientação/configuração técnica dentro do plano.
- **Coerência de Cancelamento e LGPD:** Ciclo *Mensal* cancela a renovação seguinte a qualquer momento; ciclos *Semestral* e *Anual* interrompem a renovação automática do próximo ciclo. Na LGPD: Lojista = **Controlador**; FlowAgenda = **Operadora**.
- **Publicação de Sites/Landing Pages de Lojistas:** Criação/geração visual mantida separada via Antigravity + skills (`saas-blueprint-core`), conectada por plano e publicação estruturada (`sites_lojistas` + `/p/[slug]`).
