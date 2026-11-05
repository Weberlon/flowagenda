# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-10-30T11:08:55-03:00  
**Fase do Projeto:** Produção / Homologação de Cron Externo (`CRON_SECRET`) & Webhook Inbound WhatsApp  
**Integridade do Código:** `npx tsc --noEmit` exit code 0 (Zero erros TypeScript)  
**Último Commit:** `4904446` (`fix(cron): flexibiliza validacao do header authorization com CRON_SECRET`)  
**Branch Atual:** `main` (sincronizada com `origin/main`)  

---

## 1. Compilado do que Já Está Pronto e em Produção (`main`)

1. **Motor de Notificações Automáticas (`app/api/cron/notificacoes/route.ts`):**
   - Processa em lote 3 réguas de comunicação via Evolution API v2 (`America/Sao_Paulo`):
     * **Lote 1 (T-24h):** Lembrete preventivo de véspera (janela 23h30 a 24h30 antes).
     * **Lote 2 (T-2h):** Lembrete imediato (janela 1h45 a 2h15 antes) com trava de horário comercial (07:30 às 21:00).
     * **Lote 3 (Pós-Atendimento / Google Reviews):** Solicitação de avaliação 2h após `data_hora_fim` (com fallback `ignorado_sem_url` caso o lojista não tenha configurado `google_review_url`).
   - Resiliência anti-loop: Falhas de envio gravam auditoria na tabela `notificacao_erro_log` e marcam status `'erro'` no agendamento para não travar a fila.
   - Autenticação flexibilizada (commit `4904446`): Aceita o cabeçalho `Authorization` tanto no formato `Bearer ${CRON_SECRET}` quanto o valor puro `${CRON_SECRET}` quando `process.env.CRON_SECRET` está definido, com log diagnóstico de presença/ausência do header.

2. **Compatibilidade com Vercel Hobby (`vercel.json`):**
   - Removido o bloco interno `crons` de `vercel.json` (commit `e99c03f`) para evitar bloqueio de deploy no plano gratuito/Hobby da Vercel (que restringe cron jobs internos a 1x por dia).
   - O disparo periódico da rota `GET https://flowagenda.online/api/cron/notificacoes` passa a ser feito por agendador externo (cron-job.org / GitHub Actions / crontab na VPS).

3. **Esteira de Webhook Inbound WhatsApp (`app/api/webhooks/whatsapp/route.ts` & `scripts/test-whatsapp-webhook.ts`):**
   - Processamento completo de `messages.upsert` da Evolution API v2 com filtro de grupos (`@g.us`) e `fromMe`.
   - Idempotência atômica via tabela `webhook_eventos_processados` (`message_id`, `instance_name`, `created_at`).
   - Parser de intenções validado em 4 cenários (`npm run test:webhook` 100% aprovado):
     * `"1"` -> Confirma presença (`presenca_confirmada`).
     * `"2"` -> Cancela agendamento (`agendamento_cancelado`) e envia link de reagendamento.
     * Texto livre -> Registra alerta no dashboard (`painel_notificacoes` / `texto_livre_encaminhado`).

---

## 2. Bloqueio / Ponto de Atenção Atual: `CRON_SECRET` na Vercel

Estamos com dificuldade na validação do `CRON_SECRET` em produção na Vercel ao acionar `/api/cron/notificacoes`:
- **Causa Técnica Comum na Vercel:** Alterações em variáveis de ambiente (`Settings -> Environment Variables -> CRON_SECRET`) na Vercel **não entram em vigor nos deployments já publicados** até que um novo **Redeploy** seja executado, ou podem conter espaços/quebras de linha invisíveis ao colar o segredo.
- **Comportamento Atual da Rota (`app/api/cron/notificacoes/route.ts`):**
  - Lê `const authHeader = req.headers.get('authorization')` e `const cronSecret = process.env.CRON_SECRET`.
  - Se `cronSecret` existir no ambiente da Vercel, exige `authHeader === "Bearer " + cronSecret` ou `authHeader === cronSecret`.
  - Caso retorne `401 Não autorizado`, verificar nos Function Logs da Vercel a mensagem: `[Cron Notificações] Tentativa não autorizada. Header recebido: presente | ausente`.

---

## 3. Checklist Imediato para a Próxima Sessão

1. **Resolver `CRON_SECRET` na Vercel e Testar Disparo:**
   - No painel da Vercel (`Project Settings -> Environment Variables`), redefinir `CRON_SECRET` com uma string limpa (sem espaços ou símbolos especiais, ex: `flowagenda_cron_2026_secret`) marcada para **Production, Preview e Development**.
   - Realizar um **Redeploy** do último commit na Vercel (ou novo push) para injetar a variável atualizada na função serverless.
   - Testar via terminal/curl ou agendador externo:
     `curl -i -H "Authorization: Bearer <SEU_CRON_SECRET>" https://flowagenda.online/api/cron/notificacoes`
   - Se necessário, adicionar trim defensivo (`cronSecret.trim()` e `authHeader.trim()`) ou fallback via query param/header customizado (`x-cron-secret`) caso o serviço de cron externo bloqueie o header `Authorization`.

2. **Homologação Final do Webhook na VPS Evolution API:**
   - Garantir apontamento do webhook da instância para `https://flowagenda.online/api/webhooks/whatsapp` ouvindo o evento `MESSAGES_UPSERT`.
