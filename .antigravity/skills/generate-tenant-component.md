---
name: generate-tenant-component
description: >-
  Use this skill whenever creating or modifying landing page sections or institutional site components for tenants (Lojistas). Enforces rules based on tipo_site (landing_page vs institucional_completo).
---

# Skill: Generate Tenant Component (FlowAgenda)

## Gatilho (Trigger)
Quando for solicitada uma nova seção ou componente para a Landing Page ou Site Institucional do lojista (`app/[domain]/...`).

## Comportamento Obrigatório

### 1. Verificação do Tipo de Site
O agente deve verificar previamente a configuração `tipo_site` na tabela `lojistas` no Supabase (ou no contexto do tenant):
- `tipo_site: "landing_page"`
- `tipo_site: "institucional_completo"`

### 2. Ramificação de Renderização

#### Cenário A: `landing_page`
- Renderiza o fluxo compacto de agendamento em linha única (Single Row / Compact Flow).
- Foco em conversão direta: Seleção de profissional/serviço -> Escolha de data e horário (15, 30, 45 ou 60 min) -> Confirmação rápida por WhatsApp com PIN.
- Evitar blocos densos de texto ou elementos de distração.

#### Cenário B: `institucional_completo`
Injeta os blocos estruturais completos com tratamento e fallbacks seguros:
1. **Galeria de Fotos / Portfólio:**
   - Grid responsivo com suporte a visualização em modal/lightbox.
   - Lazy loading nativo e fallbacks visuais caso a URL da imagem falhe.
2. **Vídeos Institucionais (YouTube / Vimeo):**
   - Embed seguro e responsivo com aspect-ratio 16:9.
   - Placeholder com thumbnail e play button para otimização de performance (carregamento sob demanda).
3. **Avaliações e Depoimentos (Google Reviews):**
   - Exibição de nota média, total de avaliações e cards com estrelas.
   - Fallback gracioso: Se a API ou dados de reviews não estiverem configurados, renderizar depoimentos pré-cadastrados ou ocultar a seção sem quebrar o layout.

### 3. Padrões de Design e Qualidade
- **Design System:** Shadcn UI + Tailwind CSS.
- **Identidade:** Nord Research (sóbrio, alta confiança, tipografia Inter, suporte nativo a Dark/Light Mode).
- **Isolamento de Dados:** Toda busca de dados deve incluir obrigatoriamente `lojista_id` e passar por RLS.
