# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-11-05T11:16:45-03:00  
**Fase do Projeto:** Produção / Live Feed Realtime Concluído & Homologação Final de Cron/Webhook  
**Integridade do Código:** `npx tsc --noEmit` exit code 0 (Zero erros TypeScript)  
**Último Commit:** `f945fd9` (`feat(dashboard): integracao do live feed de notificacoes em tempo real`)  
**Branch Atual:** `main`  

---

## 1. Compilado do que Já Está Pronto e em Produção (`main`)

1. **Live Feed de Notificações em Tempo Real no Dashboard (Commit `f945fd9`):**
   - **Hook Realtime (`hooks/useNotificacoesFeed.ts`):** Consulta as últimas 30 notificações da tabela `painel_notificacoes` filtradas por `lojista_id` e abre canal Supabase Realtime (`postgres_changes` para `INSERT` e `UPDATE`), com mutação otimista em `marcarComoLida(notificacaoId)`.
   - **Componente UI (`components/dashboard/NotificacoesFeed.tsx`):** Dropdown no padrão Nord Dark (`#2E3440`, `#3B4252`, `#88C0D0`, `#BF616A`, `#A3BE8C`) com badge pulsante de não lidas, identificação do evento (`tipo_evento`), atalho direto para responder no WhatsApp (`wa.me`) e botão de leitura.
   - **Integração no Layout (`app/dashboard/layout.tsx`):** Renderizado no cabeçalho superior direito ao lado do e-mail do usuário autenticado, repassando `lojistaId={lojista.id}` (compatível tanto com login direto de lojista quanto com impersonação via Super Admin).

2. **Motor de Notificações Automáticas (`app/api/cron/notificacoes/route.ts`):**
   - Processa em lote 3 réguas de comunicação via Evolution API v2 (`America/Sao_Paulo`):
     * **Lote 1 (T-24h):** Lembrete preventivo de véspera (janela 23h30 a 24h30 antes).
     * **Lote 2 (T-2h):** Lembrete imediato (janela 1h45 a 2h15 antes) com trava de horário comercial (07:30 às 21:00).
     * **Lote 3 (Pós-Atendimento / Google Reviews):** Solicitação de avaliação 2h após `data_hora_fim` (com fallback `ignorado_sem_url` caso o lojista não tenha configurado `google_review_url`).
   - Resiliência anti-loop: Falhas de envio gravam auditoria na tabela `notificacao_erro_log` e marcam status `'erro'` no agendamento para não travar a fila.
   - Autenticação flexibilizada (commit `4904446`): Aceita o cabeçalho `Authorization` tanto no formato `Bearer ${CRON_SECRET}` quanto o valor puro `${CRON_SECRET}` quando `process.env.CRON_SECRET` está definido.

3. **Compatibilidade com Vercel Hobby (`vercel.json`):**
   - Removido o bloco interno `crons` de `vercel.json` (commit `e99c03f`) para evitar bloqueio de deploy no plano gratuito/Hobby da Vercel.
   - O disparo periódico da rota `GET https://flowagenda.online/api/cron/notificacoes` é feito por agendador externo.

4. **Esteira de Webhook Inbound WhatsApp (`app/api/webhooks/whatsapp/route.ts` & `scripts/test-whatsapp-webhook.ts`):**
   - Processamento completo de `messages.upsert` da Evolution API v2 com filtro de grupos (`@g.us`) e `fromMe`.
   - Idempotência atômica via tabela `webhook_eventos_processados` (`message_id`, `instance_name`, `created_at`).
   - Parser de intenções validado em 4 cenários (`npm run test:webhook` 100% aprovado):
     * `"1"` -> Confirma presença (`presenca_confirmada`).
     * `"2"` -> Cancela agendamento (`agendamento_cancelado`) e envia link de reagendamento.
     * Texto livre -> Registra alerta na tabela `painel_notificacoes` (`texto_livre_encaminhado`), alimentando instantaneamente o novo `NotificacoesFeed` no cabeçalho do lojista.

---

## 2. Decisões de Arquitetura Tomadas

- **Isolamento Multi-Tenant no Realtime:** O canal WebSocket do Supabase (`realtime:painel_notificacoes:${lojistaId}`) filtra eventos `INSERT` e `UPDATE` estritamente por `lojista_id=eq.${lojistaId}`, garantindo que cada lojista receba apenas seus próprios alertas em tempo real.
- **Suporte Transparente a Impersonação:** Como `app/dashboard/layout.tsx` resolve `lojista` antes de renderizar o cabeçalho (seja pelo `user_id` do lojista ou pelo cookie `flow_impersonate_tenant_id` do Super Admin), o `NotificacoesFeed` reflete automaticamente o lojista ativo na sessão.

---

## 3. Pendências Técnicas Imediatas (Próxima Sessão)

1. **Verificar Habilitação do Supabase Realtime na Tabela `painel_notificacoes`:**
   - Garantir que a tabela `public.painel_notificacoes` esteja adicionada à publicação `supabase_realtime` (`ALTER PUBLICATION supabase_realtime ADD TABLE public.painel_notificacoes;`) e com políticas RLS de `SELECT` e `UPDATE` para o `lojista_id` autenticado.
2. **Validar Disparo Externo do Cron (`CRON_SECRET`) e Ponta-a-Ponta do Webhook:**
   - Confirmar retorno `200 OK` na rota `/api/cron/notificacoes` após Redeploy na Vercel e validar chegada em tempo real de mensagem no sino de notificações (`NotificacoesFeed`).
