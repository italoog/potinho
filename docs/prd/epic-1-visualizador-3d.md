# Épico 1 — Visualizador 3D Interativo ⭐

**Origem:** PRD §5 Épico 1 (V-01…V-09) — o coração do MVP.
**Objetivo:** cliente vê e personaliza o produto em 3D no celular, em tempo real, vindo do Instagram.
**Semanas:** 1–2 (+ itens P1 na semana 3)

## Stories

### Story 1.1 — Pipeline 3MF → GLB do comedouro (onboarding de asset)
**Executor:** @dev · **Gate:** @architect · **Cobre:** nota técnica §5 + V-06 (parcial)

Acceptance Criteria:
1. Processo documentado e reproduzível de conversão 3MF (Bambu Studio) → GLB otimizado (Draco/Meshopt)
2. GLB do comedouro 15cm com ≤ 4 MB, malhas separadas por parte colorível, âncora nomeada (`name_slot`) para o texto
3. Fonte usada no Bambu Studio identificada e disponível como asset web (mesma fonte web ↔ produção — PRD §10)
4. Metadados da âncora (posição, rotação, curvatura, limites) armazenados no formato que o Épico 5 consumirá
5. Asset original movido para `assets/models/comedouro-pet/15cm.3mf`; GLB publicado no storage

### Story 1.2 — Visualizador 3D base
**Executor:** @dev · **Gate:** @architect · **Cobre:** V-01, V-06

Acceptance Criteria:
1. GLB renderizado no navegador com rotação orbital, zoom e pan por toque e mouse (V-01)
2. Placeholder/skeleton durante o carregamento; primeiro render < 3s em 4G simulado (V-06)
3. 30+ fps na rotação em celular intermediário (throttling de CPU 4x no DevTools como proxy)
4. **Testado no navegador in-app do Instagram** (risco #1 do PRD §10) — evidência registrada na story
5. Funciona em Chrome e Safari mobile atuais

### Story 1.3 — Texto do nome em tempo real
**Executor:** @dev · **Gate:** @architect · **Cobre:** V-02, V-05

Acceptance Criteria:
1. Texto digitado aparece no modelo em < 500ms, na âncora/fonte/curvatura definidas no asset (V-02)
2. Validação 2–10 caracteres com whitelist de caracteres suportados pela fonte; feedback claro de erro (V-05)
3. Emojis e caracteres fora da whitelist bloqueados com mensagem amigável
4. Parâmetros do texto lidos do `param_schema` do produto (nada hardcoded)

### Story 1.4 — Cores e tamanhos em tempo real
**Executor:** @dev · **Gate:** @architect · **Cobre:** V-03, V-04

Acceptance Criteria:
1. Troca de cor de partes específicas via paleta restrita do `param_schema` (V-03), preview instantâneo
2. Alternância entre variantes de tamanho carregando o GLB correto, exibindo dimensões reais (V-04)
3. Estado da configuração centralizado (uma fonte de verdade para visualizador, preço e checkout)

### Story 1.5 — Snapshot PNG + iluminação de estúdio
**Executor:** @dev · **Gate:** @architect · **Cobre:** V-07, V-08

Acceptance Criteria:
1. Geração de PNG da configuração atual do canvas (V-07), upload para storage, URL persistível no pedido
2. Ambiente HDRI de estúdio com aparência realista (V-08) sem estourar o budget de performance

### Story 1.6 — Fallback sem WebGL (P2)
**Executor:** @dev · **Gate:** @architect · **Cobre:** V-09

Acceptance Criteria:
1. Detecção de WebGL indisponível → carrossel de fotos + formulário tradicional de personalização
2. Fluxo de compra permanece 100% funcional no fallback

## Dependências
- 1.1 depende de 0.1 (storage) · 1.2 depende de 1.1 · 1.3/1.4 dependem de 1.2 · 1.4 depende também de 0.2 (param_schema)

## Rastreabilidade
- PRD §5 Épico 1 completo · NFR §6 (mobile-first, performance, compatibilidade) · Riscos §10 (#1, #2, #3)
