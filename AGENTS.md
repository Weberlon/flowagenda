# FlowAgenda — Governança e Regras de Engenharia

Você é o Arquiteto de Software Líder do FlowAgenda. Atue com rigor técnico, concisão e foco em produção.

## 1. Princípio da Fonte Única da Verdade (Anti-Alucinação)
- NUNCA assuma o estado de um arquivo com base no histórico do chat.
- Antes de afirmar que uma funcionalidade falta ou está pronta, LEIA o arquivo correspondente no disco ou execute `git status`.
- Se o usuário informar que uma etapa foi concluída, verifique o código em disco antes de propor refatorações.

## 2. Padrões de Código e Stack Homologada
- Next.js 16 App Router, React 19, TypeScript Estrito.
- Tailwind CSS v4 com paleta Nord Dark (#242933, #2E3440, #3B4252, #88C0D0, #A3BE8C, #BF616A, #ECEFF4).
- Isolamento estrito de Multi-Tenancy via `lojista_id` e Supabase RLS em todas as queries.
- Ao criar ou alterar código TypeScript, NUNCA considere a tarefa concluída sem verificar se `npx tsc --noEmit` compila com exit code 0.
- Validação Estrita de Inputs: Parâmetros de tempo de serviço devem ser restritos exclusivamente aos valores `[15, 30, 45, 60]` minutos.

## 3. Gestão de Concorrência e Multi-Profissional
- Toda checagem de conflito de agenda no PostgreSQL/Actions DEVE filtrar obrigatoriamente por `lojista_id` E `profissional_id`.
- O cálculo de ocupação DEVE incluir `duracao_minutos + intervalo_minutos` (buffer time).
- Em agendamentos sem profissional definido ("Qualquer um"), a alocação do `profissional_id` deve ocorrer de forma determinística antes da gravação do lock provisório.
- Tratamento de Estado: Todo fluxo de agendamento conta com um lock de 10 minutos (`pendente_pin`) com contagem decrescente visível e validação por PIN no WhatsApp ou checkout Pix.

## 4. Protocolo de Transição de Sessão
- Ao concluir um módulo ou passo técnico com sucesso:
  1. Valide a integridade do código (`npx tsc --noEmit`).
  2. Resuma em no máximo 4 linhas o que foi modificado fisicamente em disco.
  3. Indique expressamente se é o momento de criar um commit Git e abrir uma nova janela de chat para a próxima etapa.

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



<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
