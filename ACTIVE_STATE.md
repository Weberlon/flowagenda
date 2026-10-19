# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-10-19T11:00:00-03:00  
**Fase do Projeto:** Produção / Deploy Vercel  
**Compilação:** `npm run build` exit code 0 | `npx tsc --noEmit` exit code 0 | Git push origin main: CONCLUÍDO (c7fbee3)

---

## 1. Módulos Homologados e Consolidados

1. **Roteamento Multi-Tenant em Borda (`middleware.ts`):**
   - Resolução de subdomínios wildcard (`*.flowagenda.online`), suporte total ao dev local (`tenant.localhost:3000`) e bypass de previews Vercel (`*.vercel.app`).
   - Rewrite para `/` (marketing), `/app/dashboard` (painel lojista) e `/loja/[slug]` (grade pública de agendamento).

2. **Banco de Dados & Migrações Supabase:**
   - Multi-profissionais e buffer time (`20261018203000_multi_professionals_and_lifecycle.sql`).
   - Monitoramento e contingência de instâncias WhatsApp (`20261019001500_whatsapp_instances_health_check.sql`).
   - Histórico de Notas de Voz do CRM com RLS (`20261019010000_cliente_historico_notas.sql` — já aplicada no Supabase).

3. **Módulo de Anotações por Voz no CRM:**
   - **Backend (`app/api/crm/voice-notes/route.ts`):** SDK `@google/genai` (Gemini 1.5 Flash), LGPD rigorosa (payload efêmero, anônimo e sem dados pessoais), descarte imediato de buffer da memória RAM.
   - **Componente (`components/crm/VoiceNoteRecorder.tsx`):** Screen Wake Lock API nativa, alternância IA Nuvem vs Ditado Local On-Device (Web Speech API).
   - **Painel do Lojista (`app/dashboard/clientes/clientes-client.tsx`):** Integrado no Drawer de Detalhes com histórico clínico estruturado (Procedimento, Observações, Próximo Passo) e badges Nord Dark.

4. **Grade Pública de Agendamento (`app/tenant/[slug]/...`):**
   - **Loader (`page.tsx`):** Carregamento de serviços ativos (com buffer time `intervalo_minutos` e flag de sinal) e profissionais ativos.
   - **Client (`agendamento-client.tsx`):** Design System Nord Dark, seletor de profissional nominal ou "Qualquer Profissional Disponível" com alocação determinística.
   - **Motor Transacional (`app/actions/booking-lock.ts`):** Cálculo de buffer time (`duracao + intervalo`), checagem estrita de colisão por `lojista_id` E `profissional_id`, checkout híbrido:
     - Rota A: Sem sinal ➔ Lock de 10 min com envio e validação de PIN WhatsApp.
     - Rota B: Com sinal ➔ Lock de 13 min com QR Code e Copia e Cola Pix Asaas e polling automático de confirmação.

5. **Trabalhadores Automatizados (Vercel Cron):**
   - `whatsapp-healthcheck` (a cada 15 min): Varredura das instâncias na VPS Evolution API com alertas de contingência.
   - `appointment-lifecycle` (a cada 10 min): Lembretes anti-no-show 2h antes e convite de avaliação Google Meu Negócio 5★ 2h pós-atendimento.

---

## 2. Próximos Passos Imediatos para a Nova Sessão

1. **Deploy & Conferência de Variáveis de Ambiente na Vercel (EM ANDAMENTO):**
   - Conferir chaves injetadas no projeto Vercel:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GEMINI_API_KEY`
     - `EVOLUTION_API_URL`
     - `EVOLUTION_API_KEY`
     - `CRON_SECRET`
     - `ASAAS_API_KEY`
     - `ASAAS_WEBHOOK_SECRET`

3. **Primeiro Agendamento Real Ponta a Ponta:**
   - Acessar `barbeariamodelo.flowagenda.online` em produção.
   - Agendar com número real de WhatsApp e testar recebimento de PIN, confirmação e geração de nota por voz no painel do lojista.
