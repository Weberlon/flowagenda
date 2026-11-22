# FlowAgenda — Checklist Operacional de Produção (Etapa 8)

**Domínio Oficial:** `https://www.flowagenda.online`  
**Stack:** Next.js 16 App Router, React 19, TypeScript Estrito, Tailwind CSS v4 (Nord Dark), Supabase, Evolution API v2, DeepSeek AI, Asaas v3  
**Idioma:** 100% Português do Brasil (PT-BR)

---

## a) Segurança de Rotas, RLS no Supabase e LGPD

- [x] **Rotas `/api/admin/*`:** Todas as rotas administrativas (`app/api/admin/asaas/subscribe/route.ts`, `app/api/admin/auto-repair/route.ts`, `app/api/admin/health-check/route.ts`) validam sessão via `verifySuperAdminSession()`, retornando `401 Unauthorized` quando não autenticado ou sem role `super_admin`.
- [x] **Isolamento Multi-Tenant e RLS no Supabase:**
  - `lojistas`: Leitura pública limitada na vitrine; mutações administrativas via Service Role ou dono autenticado (`user_id = auth.uid()`).
  - `agendamentos`: Checagens e atualizações filtradas por `lojista_id` e `profissional_id`.
  - `pets`: Listagem, inserção e exclusão filtradas por `lojista_id` e `cliente_id`.
  - `fichas_clinicas`: Leitura e `upsert` (`onConflict: 'lojista_id,cliente_id,tipo_ficha'`) isolados por `lojista_id` e `cliente_id`.
  - `chat_queue`: Processamento isolado por `(lojista_id, remote_jid)` com lock otimista em `'processing'`.
- [x] **LGPD & Sigilo Clínico (`psicologia`):**
  - `ProntuarioPsicoModal.tsx` grava sessões exclusivamente em `tipo_ficha = 'evolucao_psicologica'` com aviso de sigilo profissional (CRP/LGPD).
  - `lib/ai-niche-context.ts` lê apenas `tipo_ficha = 'triagem_ia'` para a Secretária IA no WhatsApp — **nunca** injeta `evolucao_psicologica` no prompt da IA.
  - Logs de WhatsApp utilizam `maskPhoneNumber()` para mascarar números de telefone.

---

## b) Fluxo Asaas v3 & Regras Blindadas de Cobrança

- [x] **Idempotência por `cpfCnpj`:** `registerAsaasCustomerForTenant` (`lib/asaas-subscription.ts`) consulta `GET /v3/customers?cpfCnpj=...` antes de executar `POST /v3/customers`.
- [x] **Default & Fundadores (`is_founder`):**
  - `status_pagamento` em `lojistas` mantém `DEFAULT 'pendente'`.
  - Contas com `is_founder = true` nascem `'ativo'`, possuem isenção vitalícia, bloqueiam cobrança inicial no `/superadmin` e não abatem créditos de IA.
  - Em `app/api/webhooks/asaas/route.ts`, eventos `PAYMENT_OVERDUE`, `PAYMENT_DUNNING_RECEIVED`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED` e `SUBSCRIPTION_DELETED` **não** rebaixam contas `is_founder = true`.
- [x] **Checkout & Inadimplência:**
  - `CheckoutModal.tsx` sem seletores duplicados e com redirecionamento direto (`window.location.href = data.invoiceUrl`).
  - `/superadmin` exibe **"Ver / Nova Cobrança"** quando já existe `asaas_subscription_id`.
  - `app/dashboard/layout.tsx` aplica a trava de inadimplência apenas quando `status_pagamento !== 'ativo' && !is_founder && !isImpersonating`.

---

## c) Fluxo WhatsApp / Evolution API v2 + DeepSeek AI + Lembretes Idempotentes

- [x] **Fila por `remote_jid`:** `app/api/cron/process-chat-queue/route.ts` e `lib/ai-worker.ts` consolidam mensagens sequenciais por `(lojista_id, remote_jid)` respeitando pausa de handoff humano (`checkContactAiPauseStatus`).
- [x] **Instância do Lojista (ex.: `flowagenda-teste`):** Resolução isolada por `lojista_id` (`whatsapp_instance_name` -> `configuracoes_robo.instance_name` -> `flowagenda_${slug_subdominio}`), sem mistura de instâncias entre tenants.
- [x] **Pré-Triagem Contextual por Nicho:** `lib/ai-niche-context.ts` lê contexto prévio e grava novos pets (`pet_shop`) ou triagens (`odontologia`, `clinica_estetica`, `psicologia`) via tool `registrar_pre_triagem_nicho` sem nunca bloquear o agendamento.
- [x] **Lembretes Idempotentes (`lib/appointment-reminders.ts` + `/api/dashboard/agendamentos/lembrete`):**
  - Verifica `lembrete_enviado_at` e `lembrete_enviado` antes do disparo (retorna HTTP `409` se já enviado).
  - Verifica conexão ativa (`state === 'open'`) da instância Evolution API v2 do lojista antes do envio.
  - Adapta mensagem por nicho (sigilo estrito em `psicologia`, nome do pet em `pet_shop`).

---

## d) Roteiro de Validação Ponta a Ponta em Produção

1. **Cadastro de Lojista & Cobrança Asaas:**
   - Criar lojista em `/superadmin` ou via `CheckoutModal.tsx` na home (`/`).
   - Confirmar `status_pagamento = 'pendente'` (ou `'ativo'` se `is_founder = true`), geração de `invoiceUrl` e retorno de webhook Asaas atualizado com token válido (`asaas-access-token`).
2. **Acesso ao Painel e Trava de Inadimplência:**
   - Acessar `/dashboard` com lojista `pendente` (bloqueio exibido) vs `ativo` ou `is_founder = true` (acesso liberado).
3. **Agendamento & Pré-Triagem / Prontuários por Nicho:**
   - **Pet Shop:** Cadastrar pet no `PetsManagerModal.tsx`, criar agendamento vinculando `pet_id`, verificar badge na Agenda de Hoje (`merchant-analytics.tsx`).
   - **Dentista / Estética:** Abrir `OdontogramaModal.tsx` (FDI 32 dentes, Anamnese, Plano em BRL) ou `MapaEsteticoModal.tsx` e confirmar persistência em `fichas_clinicas`.
   - **Psicologia:** Testar mensagem no WhatsApp (sem coleta de sintomas clínicos), verificar badge `Online • Adulto` na Agenda e registrar evolução sigilosa em `ProntuarioPsicoModal.tsx`.
4. **Lembrete WhatsApp & Bloqueio de Duplicidade:**
   - Na **Agenda de Hoje**, clicar em **"Enviar Lembrete WhatsApp"**, confirmar recebimento no WhatsApp e validar que o botão muda para **"Lembrete Enviado"** (e nova tentativa na API retorna `409`).
