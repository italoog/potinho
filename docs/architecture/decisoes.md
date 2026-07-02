# Decisões de Arquitetura — Forja3D

**Responsável:** @architect (Aria) · **Criado:** 2026-07-02 (story 0.1)
Formato: decisões curtas com contexto e consequência. Rastreiam o PRD §7.

## ADR-001 — App único Next.js em `web/`
**Decisão:** Next.js 16 (App Router, TypeScript, Tailwind) com API routes no mesmo app.
**Motivo:** time de 1 dev, SSR necessário para OG tags (C-05), API routes suficientes para o MVP. PRD §7.
**Consequência:** Épico 5 (worker Python) fica FORA deste app, em `worker/` (fase 1.5).

## ADR-002 — ORM Drizzle + PostgreSQL
**Decisão:** Drizzle ORM com driver `pg`. JSONB para `param_schema`, `variants`, `configuration`, `customer`.
**Motivo:** TS-first, migrations SQL legíveis, suporte a PGlite em testes (sem Docker no CI).
**Provedores:** produção = Neon (ou Vercel Postgres); dev local = Docker `postgres:16`; testes = PGlite in-memory.

## ADR-003 — Storage com driver plugável
**Decisão:** abstração `src/lib/storage.ts` com dois drivers: local (`web/public/uploads`, dev) e S3-compatível (R2, produção) selecionado por env.
**Motivo:** desenvolvimento e testes sem credenciais; R2 tem egress grátis (bom para GLB via CDN).

## ADR-004 — Texto 3D com TextGeometry (extrusão real)
**Decisão:** `TextGeometry` (three/examples) com fonte typeface.json gerada da MESMA fonte do produto físico; renderizada na âncora `name_slot` do GLB.
**Motivo:** o produto impresso tem texto extrudado — extrusão real no visualizador é fiel geometricamente (risco #2 do PRD) e o mesmo contorno de fonte serve ao Épico 5. troika-three-text (SDF plano) seria mais rápido, porém visualmente "adesivo", não gravação.
**Consequência:** cache de geometria por nome digitado + debounce para manter < 500ms (V-02).

## ADR-005 — Estado de personalização em zustand
**Decisão:** store única `usePersonalization` — fonte de verdade para visualizador, preço ao vivo, snapshot e payload do checkout.
**Motivo:** um só lugar alimenta V-02/03/04, C-03 e P-03; evita divergência tela ↔ pedido (risco #7).

## ADR-006 — Preço e validação server-side
**Decisão:** módulo puro `src/lib/pricing.ts` (schema + configuração → total em centavos) usado tanto no preview quanto na criação da sessão Stripe. O front NUNCA envia preço.
**Motivo:** NFR de segurança do PRD §6 e risco #4 (manipulação de preço).

## ADR-007 — Auth do admin sem dependência externa
**Decisão:** login único com `ADMIN_EMAIL` + hash de senha em env, sessão via cookie HttpOnly assinado (HMAC, `SESSION_SECRET`).
**Motivo:** um usuário no MVP (D-01); evita custo/complexidade de provider. Reavaliar se surgir multiusuário.

## Pendências de infraestrutura (exigem conta/credencial do lojista)
- [ ] Conectar repo à Vercel (deploy preview + produção)
- [ ] Provisionar Neon/Vercel Postgres e preencher `DATABASE_URL`
- [ ] Criar bucket R2 `forja3d-assets` + credenciais
- [ ] Conta Stripe BR — verificar elegibilidade Pix (risco #5, antes do Épico 3 em produção)
- [ ] Domínio verificado no Resend
