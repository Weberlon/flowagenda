# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-10-30T08:35:00-03:00  
**Fase do Projeto:** Produção / Workers Cron & Automação WhatsApp Evolution API v2  
**Integridade do Código:** `npx tsc --noEmit` exit code 0 (Zero erros TypeScript)  
**Último Commit:** `dc879bc` (`feat(cron): motor de notificacoes whatsapp t-24h, t-2h e pos-atendimento com dayjs e trava anti-ban`)

---

## 1. Módulos Concluídos na Sessão Atual

1. **Motor de Notificações Automáticas via Cron Job (`app/api/cron/notificacoes/route.ts`):**
   - Rota edge protegida por Bearer token (`CRON_SECRET` / `HOOK_TOKEN`) com `timingSafeEqual`.
   - Processamento estrito em 3 lotes (`.limit(10)`):
     * **Lote T-24h:** Agendamentos confirmados com `data_hora_inicio` entre 23h30 e 24h30 à frente. Grava `lembrete_enviado = true`, `lembrete_enviado_at = now()` e `lembrete_24h_status = 'enviado'`.
     * **Lote T-2h:** Janela de 1h45 a 2h15 à frente com **trava de horário comercial (07:30 às 21:00)** no fuso `America/Sao_Paulo` via Day.js. Grava `lembrete_2h_enviado_at = now()` e `lembrete_2h_status = 'enviado'`.
     * **Lote Pós-Atendimento:** Término entre 2h e 24h atrás para coleta de Google Reviews (5★). Só envia se `google_review_url` estiver preenchida; marca `avaliacao_solicitada = true`, `avaliacao_enviada_at = now()`, `pos_atendimento_status = 'enviado'` e `status = 'concluido'`.
   - **Prevenção contra Loop de Erro:** Falhas na Evolution API registram logs na tabela `public.notificacao_erro_log` e marcam o status do agendamento como `'erro'`.

2. **Serviço de WhatsApp Blindado (`lib/evolution.ts`):**
   - Função `sendWhatsAppMessage({ instanceName, number, text })`.
   - Sanitização de número de telefone garantindo DDI 55 e remoção de caracteres especiais.
   - Simulação de presença humana `'composing'` de 1000ms e jitter anti-ban aleatório entre 1000ms e 2000ms.
   - Falha resiliente: captura de exceções sem derrubar o processo do cron.

3. **Schema de Banco de Dados & Migrations (`supabase/migrations/`):**
   - Migration `20261030082000_notificacoes_cron_schema.sql`:
     * Adicionadas colunas em `public.agendamentos`: `lembrete_24h_status`, `lembrete_2h_enviado_at`, `lembrete_2h_status`, `pos_atendimento_status`.
     * Adicionada coluna `whatsapp_instance_name` em `public.lojistas` com backfill automático.
     * Criada tabela `public.notificacao_erro_log` com RLS e índices parciais de alta performance.
   - Migration `20261023211500_add_lembrete_enviado_at.sql` commitada.

4. **Agendamento Vercel Cron (`vercel.json`):**
   - Rota `/api/cron/notificacoes` agendada a cada 15 minutos (`*/15 * * * *`).

---

## 2. Decisões de Arquitetura & Governança

1. **Resolução de Instância Multi-Tenant:**
   - Ordem de prioridade segura com cache em memória:
     1º `lojistas.whatsapp_instance_name`  
     2º `configuracoes_robo.instance_name`  
     3º `whatsapp_instances.instance_name`  
     4º Fallback `flowagenda_${slug}`  
     5º Fallback global `EVOLUTION_DEFAULT_INSTANCE`

2. **Horário Comercial & Timezone:**
   - Uso de Day.js com plugins `utc` e `timezone` forçando `America/Sao_Paulo`.
   - Lembretes imediatos T-2h são suspensos fora de 07:30–21:00 para não incomodar clientes à noite/madrugada.

---

## 3. Pendências Técnicas Imediatas (Próxima Sessão)

1. **Deploy & Sincronização:**
   - Executar `git push origin main` para acionar a Vercel com os crons configurados.
   - Aplicar a migration `20261030082000_notificacoes_cron_schema.sql` no banco Supabase de produção (via Supabase CLI ou SQL Editor).

2. **Homologação Operacional do WhatsApp:**
   - Conectar QR Code da instância no `/superadmin/tenants/[id]/whatsapp`.
   - Fazer disparo de teste manual ou acionar `GET /api/cron/notificacoes` com `Authorization: Bearer <CRON_SECRET>`.
