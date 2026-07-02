# Épico 5 — Geração Automática do Arquivo de Produção ⭐ ("abrir e imprimir")

**Origem:** PRD §5 Épico 5 (G-01…G-08).
**Objetivo:** pedido pago gera automaticamente o 3MF de produção com personalização aplicada — lojista baixa, abre no Bambu Studio e imprime.
**Semanas:** 7–10 (Fase 1.5) · **Maturidade:** M0 (manual, lançamento) → M1 (nome+tamanho) → M2 (cores/filamentos)

## Spike antecipado (risco #6 do PRD §10 — rodar em paralelo nas semanas 2–3)
- [ ] PoC: gerar geometria de texto com a fonte do produto + booleana no mesh do comedouro via **trimesh + manifold3d**; validar manifold; medir taxa de sucesso com 20 nomes variados

## Stories

### Story 5.1 — Worker + fila de geração
**Executor:** @dev · **Gate:** @architect · **Cobre:** G-01

Acceptance Criteria:
1. Worker Python (trimesh + manifold3d) em fila; job disparado na confirmação de pagamento (G-01)
2. Job assíncrono com retry e estado visível no pedido (pendente/gerando/pronto/falhou)

### Story 5.2 — Texto booleano + seleção de variante (M1)
**Executor:** @dev · **Gate:** @qa · **Cobre:** G-02, G-03

Acceptance Criteria:
1. Geometria de texto gerada no servidor com a MESMA fonte e parâmetros do visualizador, aplicada na âncora do lojista (G-02)
2. Malha base da variante escolhida selecionada automaticamente (G-03)
3. Fonte única de verdade: âncoras/fontes/parâmetros vêm do mesmo `param_schema` do visualizador (risco #7)

### Story 5.3 — Validação de malha + fallback manual
**Executor:** @dev · **Gate:** @qa · **Cobre:** G-04

Acceptance Criteria:
1. Validação manifold (sem furos/auto-interseções) antes de disponibilizar (G-04)
2. Falha → pedido marcado para produção manual + alerta ao lojista — **nenhum pedido fica travado** (PRD §12)

### Story 5.4 — Export 3MF Bambu + download
**Executor:** @dev · **Gate:** @qa · **Cobre:** G-05, G-07

Acceptance Criteria:
1. 3MF de projeto compatível com Bambu Studio, objetos nomeados e organizados (G-05)
2. Botão "Baixar arquivo de produção" no pedido + link no e-mail de notificação (G-07)
3. Teste real: arquivo abre no Bambu Studio sem edição e imprime igual ao visualizado (PRD §12)

### Story 5.5 — Cores → filamentos + reprocessamento (M2)
**Executor:** @dev · **Gate:** @qa · **Cobre:** G-06, G-08

Acceptance Criteria:
1. Cadastro dos filamentos do lojista (AMS) vinculado à paleta de cada produto; cores mapeadas para extrusoras no 3MF (G-06)
2. Reprocessar arquivo sob demanda após correção de dados do pedido (G-08)
3. Meta final: abrir → fatiar → imprimir, geometricamente idêntico ao visualizador

## Dependências
- Depende do Épico 3 (webhook de pagamento) e dos metadados de âncora criados na story 1.1

## Rastreabilidade
- PRD §5 Épico 5 · §11 fases M0/M1/M2 · Riscos #6 e #7 · §12 (DoD Fase 1.5)
