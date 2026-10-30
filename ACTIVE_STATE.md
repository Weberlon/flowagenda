# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-10-23T10:55:00-03:00  
**Fase do Projeto:** Produção / Deploy Vercel & Homologação de Segurança  
**Integridade do Código:** `npx tsc --noEmit` exit code 0 (Zero erros TypeScript)

---

## 1. Registro de Governança, Infraestrutura & Segurança

1. **Perfil Super Admin Configurado:**
   - Tabela: `public.profiles`
   - Usuário: `bragaweberlon@gmail.com`
   - Campo: `role = 'super_admin'` (atribuição manual no banco de dados).
   - Efeito: Acesso irrestrito a `/superadmin` e permissão de impersonação segura de tenants em `/dashboard`.
   - UX Homologada: Botão padronizado para "Acessar como Lojista ➔" em `/superadmin/tenants/[id]/whatsapp`.

2. **Auditoria de Segurança Multi-Tenant (Concluída em 2026-10-22/23):**
   - **Mecanismo de Impersonação (Status: Aprovado):**
     - Layouts e Server Actions (`app/dashboard/layout.tsx`, `clientes.ts`, `configuracoes.ts`, `whatsapp.ts`, `dashboard.ts`, `configuracoes-whatsapp.ts`) consultam obrigatoriamente `profiles.role === 'super_admin'` via sessão autenticada do Supabase antes de ler o cookie `flow_impersonate_tenant_id`. Lojistas comuns não conseguem forjar acesso a outros tenants.
   - **Isolamento de Queries no Portal Público (Status: Ação Necessária):**
     - Identificado que `validarPinBookingAction` (`app/actions/booking-lock.ts:554-603`) e a rota `/api/agendamentos/validate-pin` buscam agendamentos sem filtrar obrigatoriamente por `lojista_id`. O fallback de busca por telefone busca globalmente entre todos os tenants.
     - Em `createBookingReservation`, se `payload.profissional_id` for enviado diretamente pelo cliente, não há checagem prévia validando se o profissional pertence ao `lojistaId` do estabelecimento.
   - **Políticas de RLS no Supabase (Status: Ação Necessária):**
     - RLS está ativo em todas as tabelas (`lojistas`, `servicos`, `clientes`, `agendamentos`, `profissionais`).
     - As políticas legadas `Public appointment reservation insert` e `Public appointment pin validation update` em `agendamentos` (migration `20261001092400_initial_schema.sql:98-99`) permitem update/insert direto anônimo via PostgREST da Supabase API. Devem ser revogadas (`DROP POLICY`), pois o fluxo público foi 100% transferido para Server Actions com `createAdminClient()`.
   - **Gestão de Segredos (Status: Ação Necessária):**
     - Nenhuma credencial crítica usa o prefixo `NEXT_PUBLIC_`.
     - O arquivo `Sflow.txt` contém credencial e precisa ser incluído no `.gitignore`.
     - O script `scripts/test-e2e-flow.ts:71` contém IP hardcoded de VPS como fallback (`http://179.236.70.181:8080`) e deve depender exclusivamente de variável de ambiente.

3. **Schema de Agendamentos e Trava de Concorrência:**
   - A coluna `pin_validacao` em `public.agendamentos` é mantida estritamente como `VARCHAR(6)`.
   - Compatibilidade de runtime: `validarPinBookingAction` limpa o campo com `null` após a confirmação para evitar truncamento ou conflito.

---

## 2. Módulos Homologados e Consolidados

1. **Customização de Mensagens do WhatsApp via JSONB (Homologação Completa):**
   - **Caminho:** `public.lojistas.configuracoes.notificacoes.whatsapp` (`template_confirmacao` e `template_lembrete`).
   - **Motor de Interpolação (`lib/whatsapp/template-engine.ts`):** Substituição dinâmica de `{cliente}`, `{data}`, `{horario}`, `{servico}` e `{profissional}` com fallbacks seguros contra campos nulos/vazios e higienização estrita contra tags HTML.
   - **Persistência Defensiva (`app/actions/configuracoes-whatsapp.ts`):** Deep merge estrito preservando integridade das demais chaves JSONB em `public.lojistas`.
   - **Interface Interativa (`app/dashboard/configuracoes/mensagens-form.tsx`):** Abas de configuração, chips de variáveis com inserção no cursor, restauração do padrão pt-BR e preview fidedigno em balão de chat do WhatsApp.
   - **Despacho Síncrono:** Integração com `await` em `app/actions/booking-lock.ts`, `/api/agendamentos/validate-pin` e `/api/cron/appointment-lifecycle`.

2. **Padronização Estrita em Português do Brasil (pt-BR):**
   - Varredura completa no frontend, Server Actions, metadados e templates do WhatsApp.
   - Eliminação de todo vocabulário pt-PT (`telemóvel` -> `celular/WhatsApp`, `marcação` -> `agendamento`, `utilizador` -> `usuário`, `registo` -> `cadastro`).
   - Padronização estrita de formatação de data/hora no fuso `America/Sao_Paulo`.
   - **Garantia de Quebras de Linha no WhatsApp:** Zero tags HTML (`<br>`, `<br/>`); uso exclusivo de `\n` e `\n\n`.

3. **Roteamento Multi-Tenant em Borda (`middleware.ts`):**
   - Resolução de subdomínios wildcard (`*.flowagenda.online`), suporte ao dev local (`tenant.localhost:3000`) e bypass de previews Vercel (`*.vercel.app`).
   - Rewrites para marketing `/`, painel lojista `/app/dashboard` e grade pública `/loja/[slug]`.

4. **Integração WhatsApp / Evolution API v2 (`lib/evolution.ts`, `app/actions/whatsapp.ts`):**
   - Auto-provisionamento de instâncias tolerante a falhas na Evolution API.
   - Envio humanizado com presença (`composing`) e jitter anti-banimento (3s a 7s).

5. **Trabalhadores Automatizados (Vercel Cron & Lifecycle):**
   - `whatsapp-healthcheck` (`*/15 * * * *` em `vercel.json`): Monitoramento de saúde das instâncias na VPS.
   - `appointment-lifecycle` (`*/10 * * * *` em `vercel.json`): Homologado com janela deslizante segura de 105 a 135 minutos (2h UTC), processamento em lotes controlados (`processarEmLotes` com 3 concorrentes), isolamento multi-tenant de instâncias com cache e blindagem anti-spam via `lembrete_enviado_at` (TIMESTAMPTZ) e fallback retrocompatível.
   - Migration adicionada: `supabase/migrations/20261023211500_add_lembrete_enviado_at.sql`.


---

## 3. Próximas Ações Imediatas (Backlog Priorizado para o Próximo Chat)

### Fase 1: Correções de Segurança da Auditoria (CONCLUÍDO em 2026-10-23)
1. **Endurecimento de PIN e Idempotência contra Double-Click:**
   - Validação estrita de PIN numérico de 6 dígitos (`/^\d{6}$/`) em `booking-lock.ts` e `validate-pin/route.ts`.
   - Update atômico com `in('status', ['locked', 'pendente_pin']).select('id')` eliminando race conditions, duplicidade de WhatsApp e contagem dupla no CRM.
2. **Isolamento Multi-Tenant e Anti-IDOR:**
   - `validarPinBookingAction` e `agendamento-client.tsx` escopados por `lojista_id`.
   - `createBookingReservation` valida `payload.profissional_id` e `servico_id` contra o `lojistaId` ativo.
3. **Autenticação Estrita do Webhook Evolution API:**
   - Rejeição obrigatória de requisições sem token nos cabeçalhos e validação com `crypto.timingSafeEqual` em `app/api/webhooks/evolution/route.ts`.
4. **Sanitização de Templates do WhatsApp:**
   - `sanitizarCampoLinhaUnica` em `lib/whatsapp/template-engine.ts` bloqueia injeção de quebras de linha, parágrafos maliciosos e caracteres de controle.
5. **Higiene de Segredos:**
   - `Sflow.txt` e `*.txt` adicionados ao `.gitignore`; IP da VPS removido de `scripts/test-e2e-flow.ts`.

### Fase 2: Homologação Operacional do WhatsApp & E2E
1. **Conexão Real do WhatsApp na VPS:**
   - Acessar `/superadmin/tenants/[id]/whatsapp` logado como `bragaweberlon@gmail.com`.
   - Gerar e escanear o QR Code de conexão da instância da Barbearia Modelo.
2. **Teste Ponta a Ponta (E2E):**
   - Agendar horário no portal público (`barbeariamodelo.flowagenda.online`).
   - Validar recebimento do PIN no WhatsApp real, confirmação na tela e inserção de cliente no CRM.
