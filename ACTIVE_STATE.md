# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-11-22T16:42:00-03:00  
**Fase do Projeto:** Produção / Pós-Etapa 8 Homologada (`https://www.flowagenda.online`)  
**Integridade do Código:** `npx tsc --noEmit` e `npm run build` exit code 0 (Zero erros TypeScript / todas as rotas compiladas com sucesso)  
**Branch Atual:** `main`  

---

## 1. Compilado das Etapas Concluídas (1 a 8)

- **Etapas 1 a 4:** Infraestrutura multi-tenant (`lojista_id` + RLS), trava atômica de agendamento (10 min PIN / 13 min Pix), Landing Page, Painel do Lojista, Super Admin (Recharts Nord Dark) e Vitrine Pública Mobile-First.
- **Etapa 5:** Dicionário multi-nicho (`lib/niche-dictionary.ts`), módulo de Pets (`PetsManagerModal.tsx`) para `pet_shop`, e Prontuários Visuais (`OdontogramaModal.tsx` e `MapaEsteticoModal.tsx`).
- **Etapa 6 e 6.1:** Integração da Secretária IA (`lib/ai-worker.ts` + `lib/ai-niche-context.ts`) com `pets` e `fichas_clinicas` via tool calling `registrar_pre_triagem_nicho`, e suporte ético/LGPD ao nicho `psicologia` (`ProntuarioPsicoModal.tsx`).
- **Etapa 7:** Serviço de lembretes idempotentes via Evolution API v2 (`lib/appointment-reminders.ts` + `/api/dashboard/agendamentos/lembrete`) com botão na **Agenda de Hoje** (`merchant-analytics.tsx`).
- **Etapa 8 (Auditoria & Checklist):**
  * Proteção `verifySuperAdminSession()` adicionada em `app/api/admin/asaas/subscribe/route.ts` (`GET` e `POST`, retornando `401 Unauthorized`).
  * Criado `CHECKLIST_PRODUCAO_ETAPA8.md` cobrindo segurança, RLS/LGPD, Asaas v3, Evolution API v2 (`flowagenda-teste`), `chat_queue` e roteiro ponta a ponta.

---

## 2. Regras Blindadas Ativas (Preservadas Integralmente)

1. `lojistas.status_pagamento` mantém `DEFAULT 'pendente'`; `is_founder = true` nasce `'ativo'`, tem isenção vitalícia e é imune a rebaixamento em `PAYMENT_OVERDUE` / `SUBSCRIPTION_DELETED` (`/api/webhooks/asaas`).
2. Idempotência por `cpfCnpj` (`GET` antes de `POST /v3/customers`), botão **"Ver / Nova Cobrança"** com `asaas_subscription_id` e `CheckoutModal.tsx` com `window.location.href = data.invoiceUrl`.
3. Trava de inadimplência em `app/dashboard/layout.tsx` apenas quando `status_pagamento !== 'ativo' && !is_founder && !isImpersonating`.
4. Todas as rotas `/api/admin/*` exigem `verifySuperAdminSession()` (`401` se ausente/inválida).
5. Fila do WhatsApp (`chat_queue`) isolada por `remote_jid`.

---

## 3. Próximos Passos Imediatos (Pós-Handoff)

1. Commitar e publicar em `origin/main` os arquivos pendentes da Etapa 8 (`app/api/admin/asaas/subscribe/route.ts`, `CHECKLIST_PRODUCAO_ETAPA8.md` e `ACTIVE_STATE.md`).
2. Executar o roteiro de validação do `CHECKLIST_PRODUCAO_ETAPA8.md` em produção (`https://www.flowagenda.online`).
3. Rodar/cruzar prospecção de leads com `scripts/prospect-leads.ts` (Google Places API New, base CEP `32115-250` em Contagem/MG, saída em `exports/leads/*.csv`) e monitorar logs de webhook, fila e lembretes.
