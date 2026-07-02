# Forja3D — Plano Mestre de Execução

**Fonte:** [PRD_MVP_Loja_3D_Personalizavel.md](../PRD_MVP_Loja_3D_Personalizavel.md) v1.0
**Criado:** 2026-07-02 · **Modo:** YOLO (execução autônoma via SDC)
**Meta:** MVP faturando em 6 semanas (nível M0) → "abrir e imprimir" em 10 semanas (M2)

---

## 1. Visão Geral da Estrutura

O PRD foi shardado em **6 épicos** (5 do PRD + Épico 0 de fundação):

| Épico | Nome | Semanas | Requisitos | Status |
|-------|------|---------|-----------|--------|
| [0](prd/epic-0-fundacao.md) | Fundação & Infra | 1 | — | 🔵 Pronto para iniciar |
| [1](prd/epic-1-visualizador-3d.md) | Visualizador 3D Interativo ⭐ | 1–2 | V-01…V-09 | 🔵 Pronto para iniciar |
| [2](prd/epic-2-catalogo-personalizacao.md) | Catálogo e Motor de Personalização | 3 | C-01…C-06 | ⚪ Aguardando Épico 1 |
| [3](prd/epic-3-pedido-pagamento.md) | Pedido e Pagamento (Stripe) | 4 | P-01…P-07 | ⚪ Aguardando Épico 2 |
| [4](prd/epic-4-dashboard-lojista.md) | Dashboard do Lojista | 5 | D-01…D-06 | ⚪ Aguardando Épico 3 |
| [5](prd/epic-5-geracao-3mf.md) | Geração Automática 3MF ⭐ | 7–10 | G-01…G-08 | ⚪ Fase 1.5 |

**Semana 6** = hardening: teste no in-app browser do Instagram, performance, beta com 5–10 clientes, lançamento M0 (checklist no final deste documento).

## 2. Stack Decidida (ref. PRD §7 — @architect valida na story 0.1)

- **Frontend:** Next.js (App Router) + React Three Fiber + drei + TypeScript
- **3D:** GLB + Draco/Meshopt; texto via troika-three-text/TextGeometry com âncoras no modelo
- **Backend:** Next.js API routes (server actions onde couber)
- **Banco:** PostgreSQL — `param_schema` e `configuration` em JSONB
- **Pagamentos:** Stripe Checkout + Webhooks
- **Infra:** Vercel + R2/S3 (modelos GLB e snapshots) · **E-mail:** Resend
- **Épico 5:** Worker Python (trimesh + manifold3d) em fila

## 3. Ordem de Execução (SDC por story)

Fluxo por story: `@sm *draft` → `@po *validate` (GO ≥7/10) → `@dev *develop` (YOLO) → `@qa *qa-gate` → `@devops *push`

### Sprint 1 (Semanas 1–2) — stories já criadas em `docs/stories/`

| Story | Título | Executor | Gate | Status |
|-------|--------|----------|------|--------|
| [0.1](stories/0.1.setup-fundacao.md) | Setup do projeto + CI + deploy | @devops | @architect | Draft |
| [0.2](stories/0.2.banco-e-modelo-dados.md) | Banco PostgreSQL + modelo de dados | @data-engineer | @dev | Draft |
| [1.1](stories/1.1.pipeline-3mf-glb.md) | Pipeline 3MF → GLB do comedouro | @dev | @architect | Draft |
| [1.2](stories/1.2.visualizador-base.md) | Visualizador 3D base (órbita/zoom/load) | @dev | @architect | Draft |
| [1.3](stories/1.3.texto-dinamico.md) | Texto do nome em tempo real no modelo | @dev | @architect | Draft |

### Sprints seguintes — stories a criar via `@sm *draft` a partir dos épicos

- **Sprint 2 (Semana 3):** 1.4 cores/tamanhos, 1.5 snapshot/HDRI, 2.1–2.4 (catálogo)
- **Sprint 3 (Semana 4):** 3.1–3.3 (checkout, Stripe, e-mails)
- **Sprint 4 (Semana 5):** 4.1–4.3 (dashboard)
- **Sprint 5 (Semana 6):** hardening + lançamento M0
- **Fase 1.5 (Semanas 7–10):** 5.1–5.5 (geração 3MF, M1 → M2)

## 4. Riscos que exigem validação ANTECIPADA (PRD §10)

| # | Validação | Quando | Story |
|---|-----------|--------|-------|
| 1 | 3D rodando no navegador in-app do Instagram | Semana 1 | 1.2 (AC dedicado) |
| 2 | Pipeline 3MF → GLB preserva âncoras/materiais | Semana 1 | 1.1 |
| 3 | Elegibilidade Pix na conta Stripe BR | Antes da semana 4 | 3.2 (pré-condição) |
| 4 | PoC booleana de texto (manifold3d) | Paralelo, semanas 2–3 | spike no épico 5 |

## 5. Regras Constitucionais em vigor

- **Art. II:** só @devops faz `git push`/PR · **Art. III:** nenhum código sem story
- **Art. IV:** specs rastreiam a IDs do PRD (V-xx, C-xx, P-xx, D-xx, G-xx) — nada inventado
- **Art. V:** lint + typecheck + test + build + CodeRabbit antes de qualquer push
- **NFR crítico:** preço SEMPRE recalculado no backend (nunca confiar no front)

## 6. Checklist de Lançamento M0 (Semana 6 — Definition of Done do PRD §12)

- [ ] Cliente personaliza (nome+cor+tamanho), vê em 3D e paga pelo celular vindo do Instagram
- [ ] Nome aparece no modelo em < 500ms
- [ ] Pedido pago no dashboard com 100% da spec + imagem + notificação e-mail
- [ ] Segundo produto cadastrável só com configuração de schema (zero código)
- [ ] Preço Stripe = preço recalculado no servidor, sempre
- [ ] LCP < 3s em 4G · 30+ fps em celular intermediário · testado no in-app do Instagram
- [ ] LGPD: política de privacidade + consentimento no checkout

## 7. Assets do Projeto

- Modelo de produção: `ARQUIVO DIMENCIONADO com nome centralizado 15cm.3mf` (raiz) — a story 1.1 move para `assets/models/comedouro-pet/15cm.3mf`
- PRD: raiz do repo (fonte única de verdade de requisitos)

---
*Documento vivo — atualizar a tabela de status a cada story concluída.*
