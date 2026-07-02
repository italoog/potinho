# Épico 0 — Fundação & Infra

**Origem:** derivado do PRD §7 (stack) e §11 (semana 1) — pré-requisito técnico dos épicos 1–5.
**Objetivo:** repositório executável com deploy contínuo e banco modelado, para que toda story seguinte entregue valor em produção.
**Semana:** 1 (em paralelo com o início do Épico 1)

## Stories

### Story 0.1 — Setup do projeto + CI + deploy
**Executor:** @devops · **Gate:** @architect

Acceptance Criteria:
1. App Next.js (App Router, TypeScript) criado com React Three Fiber + drei instalados e renderizando página inicial
2. `npm run lint`, `typecheck`, `test`, `build` funcionam e passam
3. CI (GitHub Actions) roda lint+typecheck+test+build em cada PR
4. Deploy automático na Vercel (preview por PR + produção na main)
5. Storage (R2/S3) provisionado com bucket para modelos GLB e snapshots
6. `.env.example` documenta todas as variáveis necessárias

### Story 0.2 — Banco PostgreSQL + modelo de dados
**Executor:** @data-engineer · **Gate:** @dev

Acceptance Criteria:
1. PostgreSQL provisionado (Neon/Supabase/Vercel Postgres — @architect decide na 0.1)
2. Tabelas `products` (com `variants` e `param_schema` JSONB) e `orders` (com `configuration` JSONB imutável, `customer`, `snapshot_url`, `stripe_session_id`) conforme PRD §8
3. Migrations versionadas e reproduzíveis
4. Seed do produto-piloto (comedouro pet) com schema de parâmetros do PRD §8
5. Camada de acesso a dados tipada (Prisma/Drizzle — @architect decide)

## Dependências
- Nenhuma (ponto de partida)

## Rastreabilidade
- PRD §7 (stack sugerida), §8 (modelo de dados), NFR §6 (HTTPS, LGPD-ready)
