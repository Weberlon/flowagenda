---
name: asaas-webhook-guard
description: >-
  Use this skill whenever creating, modifying, or testing the Asaas webhook endpoint (app/api/webhooks/asaas/route.ts). Enforces authentication, tenant subscription status updates, and session invalidation.
---

# Skill: Asaas Webhook Guard

## Gatilho (Trigger)
Ao criar, alterar ou testar o endpoint `app/api/webhooks/asaas/route.ts` ou funções relacionadas a cobranças recorrentes dos lojistas via Asaas.

## Comportamento Obrigatório

### 1. Validação Estrita de Autenticação
- Inspecionar os cabeçalhos da requisição HTTP (`asaas-access-token` ou token configurado no Asaas).
- Comparar com a variável de ambiente segura `process.env.ASAAS_WEBHOOK_TOKEN` usando comparação segura em tempo constante (evitando timing attacks).
- Rejeitar imediatamente com HTTP 401 caso o token não confira ou esteja ausente.

### 2. Atualização de Status de Assinatura do Lojista
Mapear o payload do evento para o campo `status_pagamento` da tabela `lojistas`:
- **`ativo`**: Eventos como `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `SUBSCRIPTION_CREATED`.
- **`inadimplente`**: Eventos como `PAYMENT_OVERDUE`, `PAYMENT_DUNNING_RECEIVED`.
- **`cancelado`**: Eventos como `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `SUBSCRIPTION_DELETED`.

### 3. Invalidação de Sessão Imediata (Bloqueio de Inadimplência)
- Caso o status seja atualizado para `inadimplente` ou `cancelado`:
  - Invalidar as sessões ativas do lojista no Supabase Auth ou na tabela de tokens de sessão.
  - O middleware (`middleware.ts`) ou as rotas de `app/(dashboard)` devem barrar o acesso imediatamente e redirecionar para a tela de regularização financeira.

### 4. Idempotência e Tratamento de Erros
- Registrar o ID único da notificação (`payment.id` ou `event.id`) para evitar processamento duplicado caso o Asaas reenvie o webhook.
- Retornar HTTP 200 prontamente para confirmar recebimento e evitar re-tentativas desnecessárias.
- Tratar exceções internamente e registrar logs de auditoria detalhados.
