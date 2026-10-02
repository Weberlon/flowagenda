---
name: validate-whatsapp-flow
description: >-
  Use this skill whenever developing, modifying, or auditing communication routes with Evolution API (WhatsApp). Ensures transactional message constraints and tenant instance isolation.
---

# Skill: Validate WhatsApp Flow (Evolution API)

## Gatilho (Trigger)
Ao criar, alterar ou auditar rotas, services ou webhooks de comunicação com a Evolution API (`app/api/webhooks/evolution/...` ou chamadas de envio de mensagens).

## Comportamento Obrigatório

### 1. Finalidade Estritamente Transacional
- Toda mensagem disparada via Evolution API deve ser **exclusivamente transacional**:
  - Envio de código PIN de 4 a 6 dígitos para confirmação de agendamento.
  - Lembrete pontual automatizado (ex: 24h ou 2h antes do atendimento).
  - Notificação de reagendamento ou cancelamento pelo lojista/cliente.
- **Proibido:** Disparos de marketing em massa, promoções não solicitadas ou broadcasts genéricos.

### 2. Isolamento de Instância por Lojista (Multi-Tenant Seguro)
- O payload e a URL da chamada devem utilizar obrigatoriamente a instância do próprio lojista:
  - `instance_name`: Nome da instância correspondente ao `lojista_id`.
  - `apikey` / `token`: Token específico da instância do tenant retornado de forma segura do Supabase (armazenado encriptado ou via RPC seguro).
- **CRÍTICO:** Nunca utilize tokens globais da VPS ou uma instância compartilhada entre tenants. O vazamento de conversas ou dados de clientes entre lojistas é inadmissível.

### 3. Gestão de Lock de Agendamento (10 Minutos)
- Ao solicitar o agendamento, registrar o status como `pendente_pin`.
- Iniciar timer de expiração de exatamente 10 minutos com contagem decrescente no front-end.
- Se o PIN não for validado em até 10 minutos:
  - O lock expira e o slot de horário volta a ficar livre para outros clientes.
  - A mensagem no WhatsApp deve informar que o código expirou caso tentem responder tardiamente.

### 4. Resiliência e Logs
- Tratar falhas de conexão com a Evolution API com retry exponencial ou fila assíncrona.
- Nunca expor chaves de API nem o corpo completo com dados sensíveis nos logs do servidor.
- Mascarar números de telefone nos logs em conformidade com a LGPD (ex: `+55 11 9****-1234`).
