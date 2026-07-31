---
name: local-build-gate-unusable
description: "npm run build no potinho e instavel sem DATABASE_URL: fallback PGlite as vezes quebra o prerender de /conta por race entre workers"
metadata:
  type: project
---

`npm run build` dentro de `web/` **pode falhar** localmente com
`Failed query: CREATE SCHEMA IF NOT EXISTS "drizzle"` + `RuntimeError: Aborted()`
em `Error occurred prerendering page "/conta"` — mas nao e determinístico: rodado de novo
logo em seguida (mesmo `.data/pglite`, mesma main), passou limpo (7 workers, 33/33 paginas).

**Why:** `web/.env.local` nao tem `DATABASE_URL`, entao `web/src/db/index.ts` cai no
fallback PGlite (`.data/pglite`) e roda `migrate()` no connect. Os workers de prerender
do `next build` abrem o mesmo diretorio PGlite em paralelo; se `migrate()` ainda tem DDL
pendente quando dois workers colidem, o wasm aborta — mas se o schema ja esta em dia
(migrate vira no-op rapido) a corrida nao aparece. Na Vercel `DATABASE_URL` existe, o
caminho PG e usado e o build sempre passa por ali.

**How to apply:** nao marcar automaticamente como N/A — tentar rodar `npm run build` primeiro;
se falhar com esse erro especifico, so ai cair pro fallback (typecheck+lint+test) e anotar
como falha ambiental, nao de codigo. Nao apontar `DATABASE_URL` de producao pro build local
so pra "fechar o gate" — o connect executa DDL de migration.

Push na main aqui e fast-forward normal (`git push origin main`); nao precisa `-f`.
