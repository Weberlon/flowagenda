# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-11-22T01:57:00-03:00  
**Fase do Projeto:** Produção / Health Check & Auto-Repair Homologado + Modernização de UI/UX com Skills Anti-IA  
**Integridade do Código:** `npx tsc --noEmit` exit code 0 (Zero erros TypeScript)  
**Último Commit:** `9a847a3` (`feat(superadmin): adiciona diagnostico em tempo real e ferramenta de auto-reparacao segura`)  
**Branch Atual:** `main` (Up to date com `origin/main`)  

---

## 1. Compilado do que Já Está Pronto e em Produção (`main`)

1. **Ferramenta de Diagnóstico & Auto-Reparação Segura no /superadmin (Commit `9a847a3`):**
   - **Endpoint de Diagnóstico Rápido (`app/api/admin/health-check/route.ts`):** Validação estrita de Super Admin, checagens concorrentes com `AbortSignal.timeout(4000)`, auditoria de variáveis de ambiente (`ASAAS`, `EVOLUTION`, `SUPABASE`), ping de infraestrutura, inspeção da fila `chat_queue` e detecção de anomalias em lojistas.
   - **Endpoint de Auto-Reparação Não-Destrutiva (`app/api/admin/auto-repair/route.ts`):** Ações seguras de `sync_asaas`, `set_whatsapp_webhook`, `create_whatsapp_instance` (idempotente), `rebuild_knowledge_base`, `flush_chat_queue` e `send_access_link`.
   - **Painel Visual (`app/superadmin/health-check-panel.tsx`):** Interface Nord Dark integrada no `/superadmin` com cards de status, botão de diagnóstico rápido, ações de auto-reparação por lojista e log de auditoria da sessão em PT-BR.

2. **Fluxo Unificado de Onboarding e Checkout Asaas (Commits `6251f85` e `e911a59`):**
   - **Checkout Self-Service (`components/landing/CheckoutModal.tsx` & `PricingTiers.tsx`):** Removidos seletores redundantes de plano/ciclo/taxa no modal; resumo compacto com link "Trocar plano" e redirecionamento imediato para a fatura Asaas.
   - **Formulário Novo Lojista (`app/superadmin/onboarding-form.tsx`):** Seletores únicos de plano/ciclo/taxa e modal de sucesso em destaque com botões diretos "Abrir Fatura" e "Copiar Link".
   - **Proteção contra Duplicidade (`app/superadmin/asaas-subscribe-button.tsx`):** Botão "Ver / Nova Cobrança" com colapso de opções para assinaturas ativas/pendentes.

3. **Arquitetura de Skills & Design Intelligence (Instaladas Globalmente):**
   - Limpeza total do repositório massivo `awesome-skills` para evitar estouro de tokens e degradação de contexto.
   - **Arsenal de Design Anti-IA Ativo em `~/.gemini/config/skills/`:**
     * **`ui-ux-pro-max` (NextLevelBuilder):** Inteligência de design system com 194 perfis de paletas, 80 estilos de UI (Bento Grid, Glassmorphism, Dark Mode) e geração automatizada de tokens para Next.js + Tailwind CSS.
     * **`hallmark` (Nutlope / Together AI):** Linter visual e motor `/hallmark redesign` em 3 níveis (`full`, `restyle`, `polish`) preservando 100% da lógica e formulários.
     * **`scroll-craft`:** Landing pages cinematográficas com planos de profundidade independentes e combate ao template trap.
     * **`humanizer`:** Remoção de tom robótico em textos, títulos e CTAs.
     * **`grill-me` (Julius Brussee):** Auditoria crítica e stress-test de requisitos.

---

## 2. Decisões de Arquitetura Tomadas

- **Anti-AI Slop:** Todas as futuras interfaces, landing pages e telas do FlowAgenda devem seguir os princípios de design humano (sem gradientes roxo/ciano genéricos em `#000`, sem 3 cards centralizados padrão, com tipografia fluida, paleta Nord Dark e contraste APCA/WCAG medido).
- **Redesign Seguro via Hallmark:** O comando `/hallmark redesign` deve sempre manter intactos os dados, conexões com Supabase, rotas, formulários e testes.

---

## 3. Próximos Passos Imediatos (Próxima Janela de Chat)

1. **Aplicação do Design Anti-IA:**
   - Executar o redesign visual de seções da Landing Page (`components/landing/PricingTiers.tsx`, Hero, Features) utilizando `hallmark` e `ui-ux-pro-max` com o tema Nord Dark.
   - Refinar a responsividade mobile e a física de animações dos modais de agendamento e checkout.
2. **Homologação em Produção:**
   - Validar o painel de Health Check e Auto-Repair com os lojistas cadastrados em produção na Vercel.
