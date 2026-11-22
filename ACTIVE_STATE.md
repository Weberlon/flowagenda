# FlowAgenda — Estado Ativo de Engenharia (ACTIVE_STATE)

**Atualizado em:** 2026-11-22T15:56:00-03:00  
**Fase do Projeto:** Produção / Etapa 5 Homologada — Customização Profunda por Nicho (Dicionário Multi-Nicho, Secretária IA Contextual, Módulo de Pets e Prontuários Visuais)  
**Integridade do Código:** `npx tsc --noEmit` e `npm run build` exit code 0 (Zero erros TypeScript / 15 rotas compiladas com sucesso)  
**Branch Atual:** `main`  

---

## 1. Compilado do que Está Pronto e Homologado (`main`)

1. **Etapa 4 & Redesign Nord Dark (Concluído e em Produção):**
   - Landing Page institucional (`app/page.tsx` e `components/landing/*`), Dashboards Executivas (`/dashboard` e `/superadmin` com Recharts em Nord Dark) e Vitrine Pública Mobile-First (`app/tenant/[slug]/*` e `app/loja/[slug]/*`).

2. **Etapa 5 — Customização Profunda por Nicho (`business_niche`):**
   - **Dicionário Multi-Nicho Retrocompatível (`lib/niche-dictionary.ts`):**
     * Estendida `NicheDictionary` (com alias `getNicheConfig` e tipo `BusinessNiche`) adicionando `features` (`hasPets`, `hasOdontograma`, `hasMapaEstetico`) e `aiPersonaInstructions` em PT-BR para cada segmento (`pet_shop`, `dentista`, `clinica_estetica`, `barbearia`, `salao_beleza`, `tatuagem`, `automotivo`, `educacao_fitness`, `default`).
   - **Secretária IA Contextual (`lib/ai-worker.ts` + `app/api/cron/process-chat-queue/route.ts`):**
     * Injeção de `dict.aiPersonaInstructions` via `getNicheDictionary(lojista.business_niche || 'geral')` no `buildDeskcommSystemPrompt` do DeepSeek (perguntando nome/porte/alergias do pet em `pet_shop`; vedando diagnósticos/prescrições em `dentista` e `clinica_estetica`).
   - **Tipos de Domínio Multi-Nicho (`types/niche.ts`):**
     * Definidos `EspeciePet`, `PortePet`, `DocilidadePet`, `Pet`, `TipoFichaClinica`, `StatusDenteFDI` (`higido`, `tratamento`, `concluido`, `atencao`, `ausente`, `implante`), `DenteEstado`, `VistaMapaEstetico`, `MarcadorEstetico`, `FichaHistoricoItem`, `AnamneseOdonto`, `ItemPlanoTratamento`, `ExameClinicoItem` e `FichaClinica`.
   - **Módulo de Pets para `pet_shop` (`components/dashboard/PetsManagerModal.tsx`, `clientes-client.tsx`, `app/actions/dashboard.ts`, `merchant-analytics.tsx`):**
     * Modal em Nord Dark com listagem filtrada por `lojista_id` + `cliente_id`, cadastro completo, alertas visuais (`#EBCB8B` / `#BF616A`) para alergias ou docilidade `arisco`/`morde` e exclusão isolada por `id` + `lojista_id`.
     * Botão **Pets** no CRM (Kanban, Tabela e Drawer) ativado apenas quando `dict.features.hasPets` é `true`.
     * Fluxo de **Novo Agendamento** na Agenda de Hoje (`merchant-analytics.tsx`) carregando pets do tutor selecionado para vincular `pet_id` opcional em `agendamentos`.
   - **Prontuários Visuais & Aprimoramento Clínico (`components/dashboard/OdontogramaModal.tsx`, `components/dashboard/MapaEsteticoModal.tsx`, `clientes-client.tsx`):**
     * `OdontogramaModal` (`dentista`): 32 dentes permanentes FDI (18–11, 21–28, 48–41, 31–38) em SVG vetorial Nord Dark, 6 status clínicos com aplicação explícita no dente selecionado, observação individual/geral, histórico de evolução e abas de **Anamnese, Retorno e Exames** (com toggle de Alerta Clínico Crítico e atalho `+6 meses`) e **Plano / Orçamento** com totais em BRL (`orcado`, `aprovado`, `concluido`).
     * `MapaEsteticoModal` (`clinica_estetica`): Canvas SVG interativo com seletor de vistas (*Facial*, *Corporal (Frente)*, *Corporal (Costas)*), rascunho pendente com coordenadas percentuais (0–100) e confirmação explícita (**Adicionar Marcador**), lista/remoção de marcadores, observações gerais e histórico.
     * Persistência na tabela `public.fichas_clinicas` via `upsert` com `onConflict: 'lojista_id,cliente_id,tipo_ficha'`.
     * CRM (`clientes-client.tsx`): Botões **Odontograma** e **Mapa Estético** isolados por feature flag no Kanban, Tabela e Drawer, mais resumo discreto no drawer do paciente com Alerta Clínico Crítico e Retorno Previsto.

---

## 2. Regras Blindadas Preservadas (Sem Alterações)

- **Cobrança Asaas & Assinaturas:** Nenhuma alteração em `status_pagamento`, `is_founder`, `asaas_subscription_id`, `CheckoutModal.tsx`, `PricingTiers.tsx`, `/api/webhooks/asaas`, `/api/checkout/*` ou `/api/asaas/*`.
- **Trava de Inadimplência & Admin:** Preservação integral de `app/dashboard/layout.tsx` e todas as rotas `/api/admin/*`.

---

## 3. Próximos Passos Recomendados

1. Aplicar/conferir as migrations das tabelas `pets`, `agendamentos.pet_id` e `fichas_clinicas` no Supabase de produção caso ainda não estejam aplicadas.
2. Realizar validação funcional em produção (`https://www.flowagenda.online`) testando um tenant `pet_shop`, `dentista` e `clinica_estetica`.
