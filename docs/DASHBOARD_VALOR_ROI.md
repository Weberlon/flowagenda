# Especificação da Dashboard de Valor & Quebra de Objeções (ROI) — FlowAgenda

## 1. Conceito Central
Instrumento visual de demonstração de valor contínuo e retenção (anti-churn), provando a economia financeira, as horas resgatadas e a autoridade conquistada.

## 2. Parâmetro de Fallback (Ticket Médio de Referência)
- Campo `ticket_medio_padrao` obrigatório no cadastro do lojista (ex: R$ 60 para barbearia, R$ 180 para estética/dentista).
- Serviços agendados sem valor monetário fixo utilizam o fallback para garantir o cálculo real de "Receita Salva de No-Show".

## 3. Componentes Visuais (Nord Dark)
- 4 Pills Superiores: Receita Salva (#B48EAD), Horas Poupadas (#A3BE8C), Taxa de Presença (#88C0D0), Convites Google Enviados (#EBCB8B).
- Hero Metric Card: Valor monetário resgatado em tipografia display com brilho sutil (#A3BE8C) e comparativo de custo equivalente em secretária CLT.
- Trinca de Gauges Circulares: Presença Confirmada (%), Eficiência de Resposta (< 15s) e Taxa de Ocupação da Grade (%).
- Card Dourado de Autoridade Google (#EBCB8B): Estrela de reputação com seletor de modo (Automático vs. Assistido 1-clique).

