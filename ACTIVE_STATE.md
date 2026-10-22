# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-10-22T12:48:00-03:00  
**Fase do Projeto:** Produção / Deploy Vercel  
**Compilação:** `npm run build` exit code 0 | `npx tsc --noEmit` exit code 0

---

## 1. Módulos Homologados e Consolidados

1. **Roteamento Multi-Tenant em Borda (`middleware.ts`):**
   - Resolução de subdomínios wildcard (`*.flowagenda.online`), suporte total ao dev local (`tenant.localhost:3000`) e bypass de previews Vercel (`*.vercel.app`).
   - Rewrite para `/` (marketing), `/app/dashboard` (painel lojista) e `/loja/[slug]` (grade pública de agendamento).
   - Suporte a impersonação segura via query param `?impersonate_tenant_id=` (gravando cookie HTTP-only `flow_impersonate_tenant_id`) e `?exit_impersonation=true`.

2. **RBAC Super Admin & Impersonação Segura (`app/dashboard`, `app/superadmin`):**
   - Super Admin agora pode gerenciar qualquer tenant via impersonação segura no `/dashboard` sem violar isolamento de lojistas comuns.
   - Banner de alerta visual no topo do dashboard informando o modo impersonação ativo com atalho para desativação imediata.
   - Painel Super Admin (`app/superadmin/page.tsx`) agora lista todos os estabelecimentos com status do robô WhatsApp e links rápidos de gestão.
   - Rota dedicada de recuperação de WhatsApp para Super Admin em `app/superadmin/tenants/[id]/whatsapp`.

3. **Integração WhatsApp / Evolution API v2 (`lib/evolution.ts`, `app/actions/whatsapp.ts`, `app/actions/configuracoes.ts`):**
   - Auto-provisionamento tolerante a falhas na Evolution API caso a instância ainda não exista (HTTP 404).
   - Padronização de nomes de instâncias evitando duplicação de prefixos (`flow_` / `flowagenda_`).
   - Server Actions com resolução determinística de tenant (`resolveCurrentLojista`) compatível com impersonação e chamadas explícitas de superadmin.

4. **Banco de Dados & Migrações Supabase:**
   - Multi-profissionais e buffer time (`20261018203000_multi_professionals_and_lifecycle.sql`).
   - Monitoramento e contingência de instâncias WhatsApp (`20261019001500_whatsapp_instances_health_check.sql`).
   - Histórico de Notas de Voz do CRM com RLS (`20261019010000_cliente_historico_notas.sql`).

5. **Módulo de Anotações por Voz no CRM:**
   - SDK `@google/genai` (Gemini 1.5 Flash), LGPD rigorosa (payload efêmero, anônimo e sem dados pessoais), descarte imediato de buffer da memória RAM.
   - Alternância IA Nuvem vs Ditado Local On-Device (Web Speech API) no `VoiceNoteRecorder.tsx`.

6. **Grade Pública de Agendamento (`app/tenant/[slug]/...`):**
   - Cálculo de buffer time (`duracao + intervalo`), checagem estrita de colisão por `lojista_id` E `profissional_id`, checkout híbrido:
     - Rota A: Sem sinal ➔ Lock de 10 min com envio e validação de PIN WhatsApp.
     - Rota B: Com sinal ➔ Lock de 13 min com QR Code e Copia e Cola Pix Asaas e polling automático de confirmação.

7. **Trabalhadores Automatizados (Vercel Cron):**
   - `whatsapp-healthcheck` (a cada 15 min): Varredura das instâncias na VPS Evolution API com alertas de contingência.
   - `appointment-lifecycle` (a cada 10 min): Lembretes anti-no-show 2h antes e convite de avaliação Google Meu Negócio 5★ 2h pós-atendimento.

---

## 2. Próximos Passos Imediatos para a Nova Sessão

1. **Acessar `/superadmin` com o usuário Super Admin:**
   - Visualizar a lista de estabelecimentos (ex: Barbearia Modelo).
   - Acessar `/superadmin/tenants/[id]/whatsapp` ou impersonar o painel para escanear o QR Code real de conexão da Evolution API.

2. **Primeiro Agendamento Real Ponta a Ponta:**
   - Acessar `barbeariamodelo.flowagenda.online` em produção.
   - Agendar com número real de WhatsApp e testar recebimento de PIN, confirmação e geração de nota por voz no painel do lojista.
