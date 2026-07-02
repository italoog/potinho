# Épico 2 — Catálogo e Motor de Personalização Configurável

**Origem:** PRD §5 Épico 2 (C-01…C-06).
**Objetivo:** admin cadastra produtos e define o que o cliente pode personalizar via schema — novos produtos sem código novo (critério de aceite do PRD §12).
**Semana:** 3

## Stories

### Story 2.1 — Cadastro de produto (admin)
**Executor:** @dev · **Gate:** @architect · **Cobre:** C-01, C-06

Acceptance Criteria:
1. CRUD de produto: nome, descrição, fotos, preço base, variantes (label, GLB, price_delta, dimensões) (C-01)
2. Status rascunho/publicado; só publicados aparecem na loja (C-06)
3. Upload de GLB por variante para o storage

### Story 2.2 — Motor de schema de parâmetros
**Executor:** @dev · **Gate:** @architect · **Cobre:** C-02

Acceptance Criteria:
1. Admin define `param_schema` por produto com os 3 tipos do MVP: `texto` (limites, fonte, âncora), `cor` (paleta + targets), `seleção` (opções + variant_ref) (C-02)
2. Página do produto renderiza o formulário de personalização 100% a partir do schema (zero hardcode)
3. Validação server-side dos parâmetros contra o schema em toda submissão
4. Teste de aceitação: produto fictício com schema diferente do comedouro renderiza sem alteração de código (PRD §12)

### Story 2.3 — Preço dinâmico
**Executor:** @dev · **Gate:** @qa · **Cobre:** C-03

Acceptance Criteria:
1. Modificadores de preço por opção, total recalculado ao vivo no front (C-03)
2. **Preço final SEMPRE recalculado no backend a partir do schema** (NFR §6, risco #4) — o valor do front nunca é usado para cobrança
3. Testes cobrindo manipulação maliciosa de preço no payload

### Story 2.4 — Página pública do produto
**Executor:** @dev · **Gate:** @architect · **Cobre:** C-04, C-05

Acceptance Criteria:
1. URL única `loja.com/p/{slug}` (C-04) — o link da bio do Instagram
2. Meta tags Open Graph com imagem, título e preço (C-05); SSR garante preview correto ao compartilhar
3. Mobile-first, testado no in-app browser do Instagram

## Dependências
- Depende do Épico 0 (banco/storage) e integra o visualizador do Épico 1

## Rastreabilidade
- PRD §5 Épico 2 · §8 (param_schema) · §12 (segundo produto sem código)
