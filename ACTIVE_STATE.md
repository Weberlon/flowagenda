# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-10-22T22:22:00-03:00  
**Fase do Projeto:** Produção / Deploy Vercel  
**Compilação:** `npx tsc --noEmit` exit code 0

---

## 1. Registro de Governança e Infraestrutura (Supabase / Banco de Dados)

1. **Perfil Super Admin Configurado:**
   - Tabela: `public.profiles`
   - Usuário: `bragaweberlon@gmail.com`
   - Campo: `role = 'super_admin'` (atribuição manual persistida).
   - Efeito: Acesso irrestrito a `/superadmin` e permissão de impersonação segura de tenants em `/dashboard`.
   - UX: Botão atualizado para "Acessar como Lojista ➔" no cabeçalho de `/superadmin/tenants/[id]/whatsapp`.

2. **Schema de Agendamentos e Trava de Concorrência:**
   - A coluna `pin_validacao` em `public.agendamentos` é mantida estritamente como `VARCHAR(6)`.
   - Compatibilidade de runtime garantida: `validarPinBookingAction` e Server Actions limpam o campo com `null` após a confirmação para evitar violação de limite de caracteres.

3. **Sincronização Autônoma (Service Role):**
   - As tabelas `public.configuracoes_robo` e `public.clientes` são gerenciadas de forma autônoma pelo runtime através do `createAdminClient()` (Supabase Service Role Key), contornando bloqueios de RLS para requisições públicas anônimas de clientes.

4. **Homologação em Produção — Mensagens Transacionais Customizadas via JSONB:**
   - Caminho: `public.lojistas.configuracoes.notificacoes.whatsapp` (`template_confirmacao` e `template_lembrete`).
   - Status: **Homologado com Sucesso em Produção**.
   - Garantias Arquiteturais:
     - Persistência com deep merge defensivo (`salvarTemplatesWhatsAppAction`) que impede perda de chaves irmãs no JSONB.
     - Motor de interpolação estrito (`compilarMensagemWhatsApp`) com fallbacks contra campos nulos/vazios e higienização contra tags HTML acidentais.
     - Despacho síncrono com `await` garantindo entrega ao gateway da Evolution API antes do encerramento do ciclo de vida de funções serverless da Vercel.

---

## 2. Módulos Homologados e Consolidados

1. **Padronização Estrita em Português do Brasil (pt-BR):**
   - **Templates WhatsApp:**
     - PIN: `Olá, ${nome}! 🤖\n\nSeu código de confirmação no *${estabelecimento}* é:\n\n🔑 *${pin}*\n\nEle vence em 10 minutos. Digite na tela para confirmar seu horário.`
     - Confirmação: `🎉 *Agendamento Confirmado!*\n\nOlá, ${nome}!\nSeu horário no *${estabelecimento}* está garantido.\n\n📅 *Data:* ${data}\n⏰ *Horário:* ${horario}\n✂️ *Serviço:* ${servico}\n👤 *Profissional:* ${profissional}\n\nEsperamos você! Caso precise reagendar ou cancelar, entre em contato com antecedência.`
     - Formatação oficial de data/hora: Uso estrito de `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`.
   - **Frontend do Cliente:**
     - Etapa 1: `"Passo 1 de 4: Escolha o serviço"`.
     - Etapa 2: `"← Trocar de Serviço"` e `"Passo 2 de 4: Selecione o profissional"`.
     - Etapa 3: `"Passo 3 de 4: Escolha o melhor dia e horário"`.
     - Etapa 4: Resumo com label `"Serviço:"` e placeholder `"DDD + Celular (ex: 31 99999-8888)"`.
     - Mensagem de erro de confirmação: `"Não foi possível confirmar seu agendamento. Tente novamente."`.
   - **Backend / Actions e Workers:**
     - Limpeza de vocabulário pt-PT (`utilizador` substituído por `usuário` em `app/actions/auth.ts`, `Procedimento` ajustado para `Serviço` em `reviews/route.ts`).
     - **Garantia de Quebras de Linha no WhatsApp:** Zero uso de tags HTML (`<br>` ou `<br/>`) em despachadores e templates transacionais; padronização estrita com `\n` e `\n\n`.

2. **Roteamento Multi-Tenant em Borda (`middleware.ts`):**
   - Resolução de subdomínios wildcard (`*.flowagenda.online`), suporte total ao dev local (`tenant.localhost:3000`) e bypass de previews Vercel (`*.vercel.app`).
   - Rewrite para `/` (marketing), `/app/dashboard` (painel lojista) e `/loja/[slug]` (grade pública de agendamento).
   - Impersonação segura via query param `?impersonate_tenant_id=` (gravando cookie HTTP-only `flow_impersonate_tenant_id`) e `?exit_impersonation=true`.

3. **RBAC Super Admin & Impersonação Segura (`app/dashboard`, `app/superadmin`):**
   - Super Admin gerencia qualquer tenant via impersonação segura no `/dashboard`.
   - Banner de alerta visual no topo do dashboard informando o modo impersonação ativo com atalho para desativação imediata.
   - Painel Super Admin (`app/superadmin/page.tsx`) com lista de estabelecimentos, status do robô WhatsApp e links rápidos de gestão.
   - Rota dedicada de recuperação de WhatsApp em `app/superadmin/tenants/[id]/whatsapp`.

4. **Integração WhatsApp / Evolution API v2 (`lib/evolution.ts`, `app/actions/whatsapp.ts`, `lib/whatsapp-sender.ts`):**
   - Auto-provisionamento tolerante a falhas na Evolution API caso a instância ainda não exista.
   - Envio blindado com presença humanizada (`composing`) e jitter randômico anti-banimento (3s a 7s).

5. **Grade Pública de Agendamento (`app/tenant/[slug]/...`):**
   - Cálculo de buffer time (`duracao + intervalo`), checagem estrita de colisão por `lojista_id` E `profissional_id`.
   - Rota A: Sem sinal ➔ Lock de 10 min com envio e validação de PIN WhatsApp.
   - Rota B: Com sinal ➔ Lock de 13 min com QR Code e Copia e Cola Pix Asaas e polling automático de confirmação.

6. **Customização de Mensagens do WhatsApp (Motor, Interface & Despacho Homologados):**
   - **Motor de Interpolação (`lib/whatsapp/template-engine.ts`):** Compilação dinâmica de templates com fallbacks seguros contra valores nulos/vazios e higienização automática contra tags HTML acidentais.
   - **Persistência Defensiva (`app/actions/configuracoes-whatsapp.ts`):** Deep merge estrito em `configuracoes.notificacoes.whatsapp` preservando integridade das demais chaves JSONB em `public.lojistas`.
   - **Interface Interativa (`app/dashboard/configuracoes/mensagens-form.tsx`):** Abas para confirmação e lembrete, chips clicáveis com inserção no cursor, restauração para o padrão oficial, pré-visualização fidedigna em balão de WhatsApp e feedbacks visuais de carregamento/sucesso/erro.
   - **Despacho Integrado e Síncrono (Etapa 4):**
     - Confirmação de agendamento em `app/actions/booking-lock.ts` e `app/api/agendamentos/validate-pin/route.ts` consome o template customizado do lojista via `compilarMensagemWhatsApp` com envio síncrono (`await sendEvolutionTextMessage`).
     - Lembrete preventivo em `app/api/cron/appointment-lifecycle/route.ts` interpola dinamicamente `template_lembrete` com fallback nativo.

7. **Trabalhadores Automatizados (Vercel Cron):**
   - `whatsapp-healthcheck` (a cada 15 min): Varredura das instâncias na VPS Evolution API.
   - `appointment-lifecycle` (a cada 10 min): Lembretes anti-no-show 2h antes e convite de avaliação Google Meu Negócio 5★ 2h pós-atendimento.

---

## 3. Próximos Passos Imediatos

1. **Acessar `/superadmin` com `bragaweberlon@gmail.com`:**
   - Validar acesso direto liberado pelo middleware com a role `super_admin`.
   - Visualizar estabelecimentos cadastrados (ex: Barbearia Modelo).
   - Gerar e escanear o QR Code de conexão da Evolution API na rota `/superadmin/tenants/[id]/whatsapp`.

2. **Teste E2E de Agendamento em Produção:**
   - Acessar `barbeariamodelo.flowagenda.online`.
   - Agendar horário com número real de WhatsApp.
   - Validar o recebimento do PIN pt-BR, confirmação automática e atualização do CRM.
