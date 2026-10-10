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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
