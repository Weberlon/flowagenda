# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-10-30T08:52:00-03:00  
**Fase do Projeto:** Produção / Webhook Inbound & Resposta Automática WhatsApp Evolution API v2  
**Integridade do Código:** `npx tsc --noEmit` exit code 0 (Zero erros TypeScript)  
**Último Commit:** `7c072c0` (`feat(webhook): esteira de processamento whatsapp evolution api com idempotencia e parser de intencoes`)  
**Branch Atual:** `main`  

---

## 1. Módulos Concluídos na Sessão Atual

1. **Parser & Classificador de Intenção do WhatsApp (`lib/whatsapp-parser.ts`):**
   - Normalização robusta retirando acentuação, caracteres especiais e espaços extras.
   - Extração tolerante a variações da Evolution API v2 (`remoteJid`, `messageId`, `isFromMe`, `isGroupOrBroadcast`, mídia e `pushName`).
   - Matching tolerante a variações do 9º dígito extraindo os últimos 8 dígitos do telefone.
   - Classificação determinística em `CONFIRMAR`, `REMARCAR_CANCELAR` e `TEXTO_LIVRE`.

2. **Esteira de Processamento de Webhook (`app/api/webhooks/whatsapp/route.ts`):**
   - Rota Edge Next.js com `maxDuration = 30` e `force-dynamic`.
   - Autenticação opcional via `EVOLUTION_WEBHOOK_SECRET` com `timingSafeEqual`.
   - Filtro de eventos `messages.upsert` e descarte de `fromMe` ou grupos/broadcasts com HTTP 200.
   - Idempotência atômica via `webhook_eventos_processados` com tratamento do erro 23505 (unique key).
   - Resolução multi-tenant de lojista por `whatsapp_instance_name` (ou fallback de slug).
   - Localização do agendamento confirmado mais próximo (`data_hora_inicio >= NOW() - 2h`).
   - Confirmação de presença (`confirmacao_cliente_at`), cancelamento ativo com link de reagendamento (`status = 'cancelado'`, `cancelado_origem = 'cliente_whatsapp'`) ou encaminhamento com alerta em `painel_notificacoes`.
   - Isolamento de erros em try/catch retornando HTTP 200 para blindagem contra loop de reenvio na Evolution API.

3. **Schema de Banco de Dados & Migrations (`supabase/migrations/`):**
   - Migration `20261030090000_whatsapp_webhook_pipeline.sql`:
     * Colunas em `agendamentos`: `confirmacao_cliente_at`, `cancelado_origem`.
     * Tabela `public.webhook_eventos_processados` (idempotência única por message_id + instance_name).
     * Tabela `public.painel_notificacoes` com RLS por `lojista_id` para alertas em tempo real.

4. **Motor de Notificações Automáticas via Cron Job (`app/api/cron/notificacoes/route.ts`):**
   - Concluído e verificado com réguas T-24h, T-2h e pós-atendimento.

---

## 2. Decisões de Arquitetura & Governança

1. **Idempotência no PostgreSQL:**
   - A constraint unique `(message_id, instance_name)` impede que a Evolution API processe ou responda duas vezes a mesma mensagem em caso de retentativas HTTP.

2. **Segurança Multi-Tenant:**
   - Alocação e consulta do agendamento filtram obrigatoriamente por `lojista_id` e pelos últimos 8 dígitos do telefone do cliente.

---

## 3. Pendências Técnicas Imediatas (Próxima Sessão)

1. **Deploy & Sincronização:**
   - Commit Git das novas esteiras e executar `git push origin main`.
   - Aplicar as migrations `20261030082000_notificacoes_cron_schema.sql` e `20261030090000_whatsapp_webhook_pipeline.sql` no Supabase.

2. **Configuração de Webhook na VPS Evolution API:**
   - Apontar o webhook da instância para `https://flowagenda.online/api/webhooks/whatsapp` ouvindo o evento `MESSAGES_UPSERT`.
