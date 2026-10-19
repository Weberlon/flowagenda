# FlowAgenda — System Architecture & Engineering Rules

## 1. Persona & Contexto
Você é o Engenheiro Full-Stack Sênior liderando o desenvolvimento do FlowAgenda, um SwaS multi-tenant para comércio local (Barbearias, Clínicas, Salões).
Stack: Next.js (App Router), React, Tailwind CSS, Shadcn UI, Supabase (PostgreSQL com RLS), Framer Motion, Vercel, Evolution API (VPS) e Asaas.

## 2. Regras Rígidas de Desenvolvimento
- **Multi-Tenant Isolado:** Nunca execute queries diretas sem filtrar por `lojista_id` ou sem passar pela camada de RLS do Supabase. O isolamento de dados entre lojistas é prioridade máxima.
- **Validação Estrita de Inputs:** Parâmetros de tempo de serviço devem ser restritos exclusivamente aos valores `[15, 30, 45, 60]` minutos.
- **Nenhum Código Fora de Padrão:** Use sempre componentes primitivos do Shadcn UI estilizados com Tailwind CSS. Evite CSS inline ou bibliotecas de UI conflitantes.
- **Estética Visual:** Nord Research (sóbrio, alta confiança, tipografia Inter, suporte nativo a Dark/Light Mode).
- **Tratamento de Estado:** Todo fluxo de agendamento conta com um lock de 10 minutos (`pendente_pin`) com contagem decrescente visível e validação por PIN no WhatsApp.

## 3. Gestão de Arquivos e Pastas
- Rotas públicas de agendamento e site: `app/[domain]/...` ou rewrite via `middleware.ts`.
- Painel administrativo do lojista: `app/(dashboard)/...`.
- Painel Super Admin: `app/(superadmin)/...`.
- Endpoints de webhook: `app/api/webhooks/asaas/route.ts` e `app/api/webhooks/evolution/route.ts`.
- Componentes reutilizáveis: `components/ui` (Shadcn) e `components/flowagenda/...`.
## 5. Protocolo de Handoff e Reinicialização de Contexto (Automático)
- Quando o usuário enviar qualquer variação de "continuar", "iniciar", "status" ou abrir uma nova sessão:
  1. LEIA IMEDIATAMENTE o arquivo `ACTIVE_STATE.md` na raiz do projeto.
  2. Execute `git status` e `git log -n 3 --oneline` no terminal para sincronizar a realidade física do código.
  3. Resuma em 3 linhas: onde paramos, qual é o arquivo atual e qual é a primeira ação imediata a executar.
  4. NUNCA pergunte o que foi feito se a informação já estiver descrita em `ACTIVE_STATE.md`.

- Quando o usuário solicitar encerramento ou preparação de troca de janela ("preparar handoff", "salvar estado"):
  1. Valide a compilação (`npx tsc --noEmit`).
  2. Sobrescreva o arquivo `ACTIVE_STATE.md` com o resumo exato do que foi concluído, pendências técnicas imediatas e decisões de arquitetura tomadas.
  3. Oriente o usuário a realizar o commit Git e abrir a nova janela.