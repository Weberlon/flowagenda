# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-11-22T16:18:00-03:00  
**Fase do Projeto:** Produção / Etapas 6 e 6.1 Homologadas — Secretária IA Contextual por Nicho (`pets` e `fichas_clinicas`) + Suporte Completo e Ético ao Nicho `psicologia`  
**Integridade do Código:** `npx tsc --noEmit` e `npm run build` exit code 0 (Zero erros TypeScript / 15 rotas compiladas com sucesso)  
**Branch Atual:** `main`  

---

## 1. Compilado das Etapas Homologadas (`main`)

1. **Etapa 4 & Redesign Nord Dark:** Landing Page (`app/page.tsx`), Dashboards Executivas (`/dashboard` e `/superadmin` com Recharts em Nord Dark) e Vitrine Pública Mobile-First (`app/tenant/[slug]/*` e `app/loja/[slug]/*`).
2. **Etapa 5 — Customização Profunda por Nicho (`business_niche`):**
   - Dicionário multi-nicho (`lib/niche-dictionary.ts`) com `features` e `aiPersonaInstructions`.
   - Módulo de Pets (`components/dashboard/PetsManagerModal.tsx`) no CRM e na Agenda para `pet_shop`.
   - Prontuários Visuais (`OdontogramaModal.tsx` com abas de anamnese/retorno/exames e plano/orçamento em BRL para `dentista`; `MapaEsteticoModal.tsx` para `clinica_estetica`).
3. **Etapa 6 — Integração da Secretária IA com `pets` e `fichas_clinicas`:**
   - **Módulo de Contexto e Pré-Triagem (`lib/ai-niche-context.ts`) + Worker IA (`lib/ai-worker.ts`):**
     * Identificação automática do cliente por telefone + `lojista_id` (`resolveClienteByPhone`).
     * Leitura de pets cadastrados (`pet_shop`) ou resumo confidencial de apoio em `fichas_clinicas` (`dentista` / `clinica_estetica`) no System Prompt.
     * Coleta fluída e não-bloqueante via tool calling `registrar_pre_triagem_nicho` gravando novos pets sem duplicação e pré-triagens clínicas em `fichas_clinicas` (`tipo_ficha = 'triagem_ia'`).
   - **Agenda do Lojista (`app/actions/dashboard.ts` + `app/dashboard/merchant-analytics.tsx`):**
     * Badges discretos em Nord Dark (`#3B4252`, borda `#4C566A`, destaque `#88C0D0`) exibindo o pet vinculado ou resumo de pré-triagem na tabela **Agenda de Hoje**.
4. **Etapa 6.1 — Suporte Completo e Ético ao Nicho `psicologia`:**
   - **Tipagem, Dicionário e Onboarding:** Adicionado `'psicologia'` (*Psicologia / Terapia*) em `types/niche.ts`, `lib/niche-dictionary.ts` (`hasProntuarioPsico: true`), `ai-onboarding-wizard.tsx` e `onboarding-form.tsx`.
   - **Sigilo Ético/LGPD na IA (`lib/ai-niche-context.ts` + `lib/ai-worker.ts`):** Proibição explícita de solicitar sintomas emocionais, traumas ou diagnósticos no WhatsApp; leitura estrita apenas de `tipo_ficha = 'triagem_ia'` (nunca `evolucao_psicologica`); triagem administrativa leve não-bloqueante (Modalidade Online/Presencial e Público Adulto/Adolescente/Infantil + 1ª sessão/retorno).
   - **CRM (`components/crm/ProntuarioPsicoModal.tsx` + `clientes-client.tsx`):** Modal em Nord Dark com aviso de sigilo profissional (CRP/LGPD), registro e histórico cronológico reverso de sessões em `fichas_clinicas` (`tipo_ficha = 'evolucao_psicologica'`).
   - **Agenda (`app/actions/dashboard.ts`):** Exibição de badge Nord Dark com modalidade e faixa etária capturadas pela Iara (ex.: `Online • Adulto • 1ª Sessão`).

---

## 2. Regras Blindadas Preservadas (Sem Alterações)

- Documentação consolidada em `docs/REGRAS_GERAIS_FLOWAGENDA.md`.
- Nenhuma alteração em `status_pagamento`, `is_founder`, `asaas_subscription_id`, `CheckoutModal.tsx`, `PricingTiers.tsx`, `/api/webhooks/asaas`, `/api/checkout/*`, `/api/asaas/*`, trava de inadimplência de `app/dashboard/layout.tsx` ou `verifySuperAdminSession` em `/api/admin/*`.

---

## 3. Pendências / Verificações de Banco em Produção

1. Confirmar no SQL Editor do Supabase se a constraint `CHECK` de `public.fichas_clinicas.tipo_ficha` aceita `'triagem_ia'` e `'evolucao_psicologica'` (além de `'odontograma'`, `'mapa_estetico'`, `'anamnese'`), e se existe a constraint `UNIQUE (lojista_id, cliente_id, tipo_ficha)`.
