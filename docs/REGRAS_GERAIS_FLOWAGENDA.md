# FlowAgenda — Regras Gerais de Trabalho e Blindagem

Documento de referência técnica e governança para o desenvolvimento contínuo do **FlowAgenda** (`https://www.flowagenda.online`), 100% em Português do Brasil (PT-BR).

---

## 1. As 4 Regras Blindadas (Intocáveis)

Nenhuma feature, refatoração ou ajuste visual pode violar ou alterar as seguintes proteções de negócio e segurança:

1. **Regra Blindada 1 — `status_pagamento` e Trava de Inadimplência (`app/dashboard/layout.tsx`):**
   - A verificação de `status_pagamento` (`inadimplente`, `cancelado`, `pendente`) e a trava de acesso/bloqueio no painel do lojista (`app/dashboard/layout.tsx`) e na vitrine pública (`app/tenant/[slug]/page.tsx`) devem ser preservadas integralmente.

2. **Regra Blindada 2 — Proteção de Membros Fundadores (`is_founder`):**
   - Lojistas marcados com `is_founder = true` mantêm imunidade contra bloqueios de assinatura e abatimento de créditos de IA (`ai_credits` em `lib/ai-worker.ts`). Essa condição nunca deve ser removida ou contornada.

3. **Regra Blindada 3 — Cobrança Asaas & Assinaturas (`asaas_subscription_id`):**
   - Fluxos fechados de `CheckoutModal.tsx`, regras de planos/ciclos de `PricingTiers.tsx`, webhooks (`/api/webhooks/asaas/route.ts`) e rotas de assinatura (`/api/checkout/*`, `/api/asaas/*`) não devem ser alterados sem autorização expressa e auditoria dedicada.

4. **Regra Blindada 4 — Proteção Administrativa (`verifySuperAdminSession` em `/api/admin/*`):**
   - Todas as rotas sob `/api/admin/*` exigem validação rigorosa via `verifySuperAdminSession` e nunca devem expor operações administrativas sem autenticação e autorização de Super Admin.

---

## 2. Identidade Visual Oficial (Paleta Nord Dark)

Todas as interfaces (Landing Page, Painel do Lojista, Super Admin e Vitrine Pública) devem seguir rigorosamente a paleta **Nord Dark** com 100% dos textos em **Português do Brasil (PT-BR)**:

| Token / Uso | Hexadecimal |
|---|---|
| Fundo profundo | `#242933` |
| Fundo principal | `#2E3440` |
| Superfícies / Cards | `#3B4252` |
| Hover / Superfície secundária | `#434C5E` |
| Bordas sutis | `#4C566A` |
| Texto principal | `#ECEFF4` |
| Texto secundário | `#D8DEE9` / `#81A1C1` |
| Destaque primário (Azul Ártico) | `#88C0D0` |
| Sucesso / Ativo (Verde Sálvia) | `#A3BE8C` |
| Alerta / Pendente (Âmbar) | `#EBCB8B` |
| Erro / Inadimplente / Crítico (Vermelho) | `#BF616A` |
| Acento secundário (Lavanda) | `#B48EAD` |

---

## 3. Governança Técnica, Multi-Tenancy e Concorrência

- **Multi-Tenancy Estrito:** Toda query e mutação no Supabase (client ou server) deve filtrar obrigatoriamente por `lojista_id` e respeitar as políticas de RLS.
- **Gestão de Agenda:**
  - Durações de serviço restritas aos valores `[15, 30, 45, 60]` minutos.
  - Checagens de conflito de agenda devem filtrar por `lojista_id` **e** `profissional_id`, considerando `duracao_minutos + intervalo_minutos` (buffer time).
  - Lock provisório de 10 minutos (`pendente_pin`) no agendamento com validação de PIN no WhatsApp ou checkout Pix.
- **Customização por Nicho (`lib/niche-dictionary.ts`):**
  - Recursos específicos de nicho (`hasPets`, `hasOdontograma`, `hasMapaEstetico`) devem permanecer isolados por feature flags em `getNicheDictionary(lojista.business_niche)` para não poluir outros segmentos.
- **Integridade Obrigatória:**
  - Nenhuma alteração em TypeScript/TSX deve ser dada como concluída sem `npx tsc --noEmit` (e `npm run build` em entregas de módulo) passando com `exit code 0`.
