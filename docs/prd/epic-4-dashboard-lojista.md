# Épico 4 — Dashboard do Lojista

**Origem:** PRD §5 Épico 4 (D-01…D-06).
**Objetivo:** lojista recebe o pedido com especificação inequívoca e inicia produção em < 5 min (métrica do PRD §2).
**Semana:** 5

## Stories

### Story 4.1 — Autenticação do admin
**Executor:** @dev · **Gate:** @qa · **Cobre:** D-01

Acceptance Criteria:
1. Login seguro de usuário único (D-01); todas as rotas `/admin` protegidas (server-side)
2. Sessão persistente com expiração razoável; rate-limit no login

### Story 4.2 — Lista de pedidos + notificação
**Executor:** @dev · **Gate:** @qa · **Cobre:** D-02, D-03

Acceptance Criteria:
1. Lista com data, cliente, produto, TODOS os parâmetros escolhidos, snapshot, valor e status de pagamento (D-02)
2. Detalhe do pedido com spec completa legível para produção (métrica: ler em < 5 min)
3. E-mail ao lojista a cada novo pedido pago (D-03)

### Story 4.3 — Status do pedido + métricas + CSV
**Executor:** @dev · **Gate:** @qa · **Cobre:** D-04, D-05, D-06

Acceptance Criteria:
1. Fluxo `Pago → Em produção → Enviado → Entregue` + código de rastreio opcional (D-04); página de status do cliente (P-07) reflete mudanças
2. Métricas: vendas do mês (R$), nº de pedidos, produto mais vendido, funil visita → personalização → pedido (D-05)
3. Exportação CSV dos pedidos (D-06)

## Dependências
- Depende do Épico 3 (pedidos pagos existem)

## Rastreabilidade
- PRD §5 Épico 4 · §2 (métricas de sucesso)
