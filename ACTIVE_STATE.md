# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-10-30T10:12:00-03:00  
**Fase do Projeto:** Produção / Webhook Inbound & Teste Utilitário de Homologação WhatsApp  
**Integridade do Código:** `npx tsc --noEmit` exit code 0 (Zero erros TypeScript)  
**Último Commit:** `5ab9a45` (`feat(webhook): esteira de processamento whatsapp evolution api com idempotencia e parser de intencoes`)  
**Branch Atual:** `main`  

---

## 1. Módulos Concluídos na Sessão Atual

1. **Script Utilitário de Teste de Webhook (`scripts/test-whatsapp-webhook.ts`):**
   - Script com tipagens estritas da Evolution API v2 e execução local ou em staging (`npm run test:webhook`).
   - Simulação e validação com 100% de aprovação nos 4 cenários:
     * **Cenário A:** Cliente respondendo "1" (Confirmação ativa do agendamento -> `presenca_confirmada`).
     * **Cenário D (Idempotência):** Reenvio idêntico do Cenário A com o mesmo `key.id` retornando HTTP 200 `{ received: true, idempotente: true }` em 58ms sem reprocessar.
     * **Cenário B:** Cliente respondendo "2" (Cancelamento ativo do agendamento -> `agendamento_cancelado` com envio de link da agenda).
     * **Cenário C:** Cliente enviando texto livre ("Vou atrasar 15 minutos") gerando registro em `painel_notificacoes` (`texto_livre_encaminhado`).
   - Provisionamento automático de fixtures com `servico_id` e teardown seguro das tabelas de teste.

2. **Ajuste na Esteira de Webhook (`app/api/webhooks/whatsapp/route.ts`):**
   - Inserção de idempotência compatibilizada estritamente com as colunas ativas de `webhook_eventos_processados` (`message_id`, `instance_name`, `created_at`).

3. **Configuração de Execução no `package.json`:**
   - Adicionado comando `"test:webhook": "tsx --env-file=.env.local scripts/test-whatsapp-webhook.ts"`.

---

## 2. Decisões de Arquitetura & Governança

1. **Idempotência no PostgreSQL:**
   - A constraint unique `(message_id, instance_name)` impede que a Evolution API processe ou responda duas vezes a mesma mensagem em caso de retentativas HTTP da VPS.
2. **Setup e Teardown Automático em Testes:**
   - O utilitário `test-whatsapp-webhook.ts` cria agendamentos com horários relativos a `NOW()` e limpa todos os dados de fixture ao final da execução.

---

## 3. Pendências Técnicas Imediatas (Próxima Sessão)

1. **Deploy & Sincronização:**
   - Commit Git com o novo script de teste e as correções de idempotência (`git add . && git commit -m "feat(webhook): script utilitario de teste de homologacao dos 4 cenarios"`).
   - Executar `git push origin main` para deploy automático na Vercel/Produção.

2. **Configuração de Webhook na VPS Evolution API:**
   - Apontar o webhook da instância para `https://flowagenda.online/api/webhooks/whatsapp` ouvindo o evento `MESSAGES_UPSERT`.
