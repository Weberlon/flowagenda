# FlowAgenda SwaS (Software with a Service)

O **FlowAgenda** é um sistema multi-tenant focado no agendamento e automação de comunicação para comércios locais (Barbearias, Clínicas, Salões de Beleza). A plataforma opera sob o modelo SwaS (Software with a Service), onde a assinatura da plataforma acompanha a operação gerencial de um robô de WhatsApp integrado e domínios personalizados.

## 🚀 Stack Tecnológico
- **Framework:** Next.js (App Router)
- **Database & Auth:** Supabase (PostgreSQL + Row Level Security)
- **UI/Estilização:** Tailwind CSS + Shadcn UI (Estética Nord Research)
- **Integrações Chave:**
  - *Asaas* (Gestão de Assinaturas e Webhooks Financeiros)
  - *Evolution API* (Disparo de WhatsApp e Gestão de Instâncias VPS)
  - *Vercel Domains API* (Provisionamento automatizado de domínios customizados)

## 🛠 Como Rodar Localmente

1. Clone o repositório e instale as dependências:
   ```bash
   npm install
   ```

2. Crie um arquivo `.env.local` na raiz e copie o formato do `.env.example`. Preencha com as suas chaves do Supabase, Asaas, Vercel e Evolution API.

3. Rode o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### Testando os Subdomínios Localmente
O FlowAgenda utiliza um `middleware.ts` para capturar domínios e subdomínios (ex: `app.flowagenda.online` ou `clinica.flowagenda.online`). 
Para testar isso no seu `localhost`, você pode editar o arquivo `hosts` do seu sistema operacional (no Windows: `C:\Windows\System32\drivers\etc\hosts`) e adicionar:
```
127.0.0.1  app.localhost
127.0.0.1  teste.localhost
```
Após isso, mude a variável `NEXT_PUBLIC_ROOT_DOMAIN` no `.env.local` para `localhost:3000` e acesse `http://teste.localhost:3000`.

## 🛡 Supabase e Primeiro Super Admin
A plataforma protege dados de lojistas através de regras rígidas de **RLS (Row Level Security)**. Apenas usuários com o `role = 'super_admin'` na tabela `profiles` podem criar novos lojistas e provisionar subdomínios.

**Passos para o Primeiro Admin:**
1. Cadastre-se na aplicação normalmente.
2. Acesse o SQL Editor do Supabase (ou localmente).
3. Execute o update manual na tabela `profiles`:
   ```sql
   UPDATE profiles SET role = 'super_admin' WHERE id = 'seu-user-id';
   ```
4. A partir de agora, seu usuário terá acesso liberado na rota `/app/superadmin` para gerenciar a plataforma.

## 🗄 Seed de Dados (Homologação e Testes)
Caso precise popular o banco de dados com dados fictícios para gravação de vídeos de vendas ou testes de interface (Agenda, Lojista Tier 3), execute o script contido em `supabase/seed.sql` através do SQL Editor do Supabase.
