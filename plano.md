# Plano de Correção de Segurança — potinho

> Documento de handoff para implementação. Cada item traz: arquivo exato, linha,
> o problema, o risco concreto e o código da correção. Escrito para ser
> implementado por um modelo mais barato **sem precisar re-investigar o código**.
>
> Ordem de implementação: P1 → P2 → P3. Cada item é independente (pode commitar
> separado). Depois de cada bloco, rodar `cd web && npm test` e `npm run lint`.

---

## Contexto do projeto (para quem implementa)

- App Next.js 16 (App Router) em `web/`. Rotas de API em `web/src/app/api/**/route.ts`.
- Libs de domínio em `web/src/lib/`.
- Banco via Drizzle ORM (`web/src/db`). Produção = Neon Postgres.
- Auth = Better Auth (magic link, sem senha). Admin = mesma conta com `role="admin"`.
- Gateway de pagamento principal = Mercado Pago; Stripe é redundância desativada.
- **Regra de ouro já respeitada no código:** preço NUNCA vem do front, é sempre
  recalculado no servidor (`web/src/lib/pricing.ts` + `order-creation.ts`). Não mexer nisso.

---

## O que JÁ está correto (não regredir)

Estes controles estão bem feitos. Só não quebrar:

- Webhook Mercado Pago valida `x-signature` (HMAC-SHA256, timing-safe) antes de processar — `web/src/lib/payments/mercadopago.ts:111`.
- Recusa webhook em produção sem `MERCADOPAGO_WEBHOOK_SECRET` — `web/src/app/api/mercadopago/webhook/route.ts:52`.
- Idempotência nas transições de pedido (`markOrderPaid/Rejected/Refunded`) via `WHERE status != ...`.
- Consumo atômico de cupom (anti-TOCTOU) — `web/src/lib/coupons.ts:37`.
- Login não revela se e-mail tem conta (resposta idêntica sempre) — `web/src/app/api/conta/entrar/route.ts:31`.
- Admin com defesa em profundidade: layout server-side (`role`) + `requireAdminSession()` em cada rota.
- Queries de pedido do cliente filtram por `userId` no servidor (`getOrderForUser`), não confiam no middleware.
- Preço/cupom recalculados no servidor; front nunca dita valor.

---

# P1 — ALTA PRIORIDADE (corrigir primeiro)

## P1-1 — Injeção de HTML/XSS nos e-mails transacionais

**Arquivo:** `web/src/lib/email.ts`
**Linhas:** 42-44 (`configTable`), 51-52 e 56 (`itemsBlock`), 96 e 99 (`sendOrderConfirmation`), 118-120 (`sendRefundNotification`), 132 e 138 (`sendNewOrderNotification`).

### Problema
Dados controlados pelo cliente são interpolados **crus** em HTML de e-mail, sem escape:

- `customer.name` — vem do checkout (`customerSchema`, `web/src/db/types.ts:99`), só valida `min(2)`, **não restringe caracteres**.
- Valores de `configuration` (ex.: nome do pet, um param `text`) — `validateConfiguration` (`web/src/lib/pricing.ts:61`) faz `.trim().toUpperCase()` e checa comprimento, mas **não escapa `< > " &`**.

Exemplo de valor aceito hoje no nome do pet: `<IMG SRC=X ONERROR=...>` ou `"><A HREF=...>`.

### Risco concreto
Esse HTML chega:
1. No e-mail de **notificação de novo pedido para o lojista** (`sendNewOrderNotification`) — o dono da loja abre um e-mail com HTML injetado por um cliente anônimo. Vetor de phishing/exfiltração dentro da caixa do lojista.
2. No e-mail de confirmação para o próprio cliente.

Clientes de e-mail bloqueiam `<script>`, mas `<img onerror>`, links falsos e quebra de layout passam. É injeção de conteúdo por entrada não confiável — classificar como **stored HTML injection**.

### Correção
Adicionar um helper de escape e aplicá-lo em **todo** valor dinâmico que vira HTML.

No topo de `web/src/lib/email.ts`, depois dos imports (após a linha 3), adicionar:

```ts
/** Escapa entrada não confiável antes de interpolar em HTML de e-mail (P1-1). */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

Depois trocar as interpolações de dados dinâmicos:

**`configTable` (linhas 42-44)** — escapar chave e valor:
```ts
function configTable(configuration: Record<string, string>): string {
  const rows = Object.entries(configuration)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`)
    .join("");
  return `<table style="border-collapse:collapse">${rows}</table>`;
}
```

**`itemsBlock` (linha 56)** — escapar `productName`. O `snapshotUrl` é gerado pelo servidor (UUID), mas por robustez use `encodeURI`:
```ts
      const snapshot = item.snapshotUrl
        ? `<p><img src="${encodeURI(item.snapshotUrl.startsWith("http") ? item.snapshotUrl : appUrl() + item.snapshotUrl)}" alt="Produto personalizado" width="280" style="border-radius:12px"/></p>`
        : "";
      return `
      <div style="margin:12px 0;padding-top:12px;border-top:1px solid #eee">
        <p style="margin:0 0 4px"><strong>${esc(item.productName)}</strong> — ${formatBRL(item.unitPrice)}</p>
        ${snapshot}
        ${configTable(item.configuration)}
      </div>`;
```

**`sendOrderConfirmation` (linha 96):**
```ts
    <h2>Obrigado, ${esc(customer.name.split(" ")[0])}! 🎉</h2>
```

**`sendRefundNotification` (linhas 118-119)** — `status` vem do gateway (baixo risco) mas `customer.name/email` são do cliente:
```ts
    <p>Status do gateway: <strong>${esc(status)}</strong></p>
    <p>Cliente: ${esc(customer.name)} · ${esc(customer.email)}</p>
```

**`sendNewOrderNotification` (linha 138):**
```ts
    <p>Cliente: ${esc(customer.name)} · ${esc(customer.phone)} · ${esc(customer.email)}</p>
```

> Não precisa escapar `formatBRL(...)` (número), nem `appUrl()`/`url` do magic link (URL própria do Better Auth). `colorLabel` em `sendColorBackInStockEmail` vem de config do admin (confiável), mas escapar também não custa: `${esc(colorLabel)}`.

### Teste
Em `web/src/lib/email.ts` já não há teste dedicado de escape. Adicionar `web/src/lib/email.test.ts` mínimo (sem `RESEND_API_KEY`, o `send` cai no ramo de log):

```ts
import { describe, it, expect, vi } from "vitest";
import { sendNewOrderNotification } from "./email";
import type { OrderRow } from "@/db/schema";

describe("e-mail escapa entrada do cliente (P1-1)", () => {
  it("não emite HTML cru no nome do cliente", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    process.env.LOJISTA_EMAIL = "loja@x.com";
    delete process.env.RESEND_API_KEY;
    const order = {
      customer: { name: '<img src=x onerror=alert(1)>', email: "a@b.com", phone: "119" },
      totalAmount: 1000, shippingAmount: 0,
    } as unknown as OrderRow;
    await sendNewOrderNotification(order, [
      { productName: "P", configuration: { pet: '<script>x</script>' }, unitPrice: 1000 },
    ]);
    spy.mockRestore();
    // se chegou aqui sem lançar e o helper existe, o escape roda; assert real:
    expect(esc("<b>")).toBe("&lt;b&gt;");
  });
});
```
> Ajuste: como `esc` é `function` privada, exporte-a (`export function esc`) para testar diretamente, OU teste via o HTML gerado extraindo o argumento. O mais simples: exportar `esc` e testar `esc('<img>')`.

---

## P1-2 — CSV formula injection na exportação de pedidos

**Arquivo:** `web/src/app/api/admin/orders.csv/route.ts`
**Linhas:** 8-10 (`csvCell`), usada na linha 39.

### Problema
`csvCell` escapa aspas/vírgula/quebra de linha (formato CSV correto), mas **não neutraliza fórmulas**. Células de `customer.name`, `email`, `phone` e `petNames` vêm do cliente. Se um valor começa com `=`, `+`, `-`, `@` (ou `\t`, `\r`), o Excel/Sheets interpreta como fórmula ao abrir o CSV.

### Risco concreto
Cliente cadastra nome do pet como `=HYPERLINK("http://evil","clique")` ou `=cmd|...`. O lojista abre o CSV exportado → execução de fórmula na máquina dele (CSV injection → possível RCE via DDE em Excel).

### Correção
Trocar `csvCell` (linhas 8-10) por versão que prefixa `'` em células que começam com caractere perigoso, antes do escape de aspas:

```ts
function csvCell(value: string): string {
  // P1-2: neutraliza fórmula (=, +, -, @, tab, CR) prefixando aspa simples.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
```

### Teste
Criar/estender teste da rota (`web/src/app/api/admin/orders.csv/route.test.ts` já existe). Adicionar caso: pedido com `customer.name = "=1+1"` deve sair como `'=1+1` no CSV.

---

# P2 — MÉDIA PRIORIDADE

## P2-1 — Faltam Content-Security-Policy e HSTS

**Arquivo:** `web/next.config.ts` (bloco `headers()`, linhas ~9-22).

### Problema
Hoje só há `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. Não há
`Content-Security-Policy` (mitiga XSS refletido/injeção de script no app) nem
`Strict-Transport-Security` (força HTTPS).

### Risco concreto
Sem CSP, qualquer XSS que escape do React (ex.: `dangerouslySetInnerHTML` futuro,
lib de terceiro comprometida) executa sem barreira. Sem HSTS, primeira visita fica
sujeita a downgrade para HTTP.

### Correção
No array de `headers` dentro do objeto `source: "/:path*"`, adicionar (o app usa
Three.js/react-three-fiber e Next inline styles, então CSP precisa de `'unsafe-inline'`
em style e provavelmente `'unsafe-eval'`/`blob:` — começar em **report-only** para não quebrar):

```ts
{
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
},
{
  // Começa em Report-Only: NÃO bloqueia, só reporta. Validar 1 semana e então
  // trocar a key para "Content-Security-Policy". Ajustar diretivas conforme violações.
  key: "Content-Security-Policy-Report-Only",
  value: [
    "default-src 'self'",
    "img-src 'self' data: blob: https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://api.mercadopago.com https://api.superfrete.com https://sandbox.superfrete.com",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
},
```

> **Importante:** entregar como `Content-Security-Policy-Report-Only` primeiro. O
> checkout redireciona para o Mercado Pago (navegação top-level, não bloqueada por
> `connect-src`), mas o viewer 3D e os assets podem violar. Só promover para
> `Content-Security-Policy` (enforcing) depois de confirmar zero quebras no console.
> Este item **não tem teste automatizado** — validar manualmente no browser.

---

## P2-2 — Endpoint de debug expõe token de magic link

**Arquivo:** `web/src/app/api/test/last-verification/route.ts`
**Linha:** 11 (guarda `NODE_ENV === "production"`).

### Problema
A rota retorna o token do último magic link de qualquer e-mail. Guarda única:
`if (process.env.NODE_ENV === "production") return 404`. Qualquer ambiente que
**não** seja `production` mas aponte para um banco real (preview na Vercel, staging)
vaza tokens → **account takeover** de qualquer e-mail.

### Risco concreto
Deploy de preview na Vercel roda com `NODE_ENV=production` (ok), mas basta um
ambiente de staging/homolog com `NODE_ENV != production` conectado ao banco de
produção para o endpoint virar bypass total de autenticação.

### Correção (defesa em profundidade — exigir flag explícita)
Trocar a guarda (linhas 11-13) para exigir também um opt-in explícito, nunca
presente em produção:

```ts
export async function GET(request: Request) {
  // Só habilitado com flag explícita E fora de produção (P2-2). Dupla trava.
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_E2E_ENDPOINTS !== "true") {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  // ... resto igual
```

E garantir que `ALLOW_E2E_ENDPOINTS` só exista no `.env` local de teste (nunca na
Vercel). Documentar isso no `.env.example`. O runner Playwright (`web/tests`) deve
setar essa env. Ajustar `web/playwright.config.ts` se necessário para exportar
`ALLOW_E2E_ENDPOINTS=true` no ambiente do webServer.

### Teste
O teste e2e que usa essa rota (10.1) precisa da env setada. Verificar
`web/tests/**` por chamadas a `/api/test/last-verification` e garantir a env.

---

## P2-3 — Rate limit em memória é inútil no serverless (email bombing)

**Arquivo:** `web/src/lib/rate-limit.ts` (todo o módulo, já tem comentário `ponytail:` na linha 3).

### Problema
O rate limit usa um `Map` em memória de processo. Na Vercel (Fluid Compute /
serverless), cada instância tem seu próprio `Map` e instâncias são efêmeras. O
limite de **3 magic links por e-mail/hora** (`web/src/app/api/conta/entrar/route.ts:19`)
na prática não segura nada sob concorrência — cada instância conta do zero.

### Risco concreto
Email bombing: atacante dispara N requests para `/api/conta/entrar` com o e-mail
da vítima e a manda dezenas de magic links (custo de Resend + incômodo/phishing).
Também enfraquece o limite de `/api/checkout` e `/api/notify`.

### Correção (durável — Upstash Redis, já é o upgrade path citado no código)
Este é o único item que **adiciona dependência**. Justificado: proteção anti-abuso
real precisa de estado compartilhado.

1. Provisionar Upstash Redis (via Vercel Marketplace — combina com o stack). Gera
   `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
2. Instalar: `cd web && npm i @upstash/ratelimit @upstash/redis`.
3. Reescrever `rate-limit.ts` mantendo a **mesma assinatura pública**
   (`rateLimit`, `clientIp`, `rateLimitResponse`) para não tocar nos 6 call sites.
   Como `@upstash/ratelimit` é assíncrono, `rateLimit` passa a retornar `Promise`.
   Isso obriga `await` nos call sites — todos já são `async`, então é trivial:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Fallback em memória se Upstash não estiver configurado (dev). Mantém o comportamento atual.
const memory = new Map<string, number[]>();

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

export interface RateLimitResult { ok: boolean; retryAfterSeconds: number; }

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (redis) {
    const rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`), prefix: "rl" });
    const { success, reset } = await rl.limit(key);
    return { ok: success, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  }
  // fallback dev: mesma lógica de janela deslizante em memória
  const now = Date.now();
  const hits = (memory.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) };
  }
  hits.push(now);
  memory.set(key, hits);
  return { ok: true, retryAfterSeconds: 0 };
}
```

4. Em cada call site, prefixar com `await`. São 6 arquivos:
   `api/checkout/route.ts:39`, `api/checkout/cupom/route.ts:20`,
   `api/conta/entrar/route.ts:19`, `api/notify/route.ts:14`,
   `api/shipping/quote/route.ts:19`, `api/mercadopago/webhook/route.ts:18`.
   Trocar `const limit = rateLimit(...)` por `const limit = await rateLimit(...)`.

5. Atualizar `web/src/lib/rate-limit.test.ts` para `await` e cobrir o fallback.

> **Alternativa lazy (se não quiser dependência agora):** aceitar o risco e apenas
> mover o limite de magic link para uma coluna no banco (contador por e-mail/janela),
> reusando o Drizzle que já existe. Mais código, zero dependência nova. Mas Upstash
> é o caminho limpo e o próprio código já aponta pra ele.

---

## P2-4 — `clientIp` confia no primeiro valor de `x-forwarded-for` (spoofável)

**Arquivo:** `web/src/lib/rate-limit.ts:35-40`.

### Problema
`clientIp` pega `x-forwarded-for.split(",")[0]` — o primeiro valor é o que o
**cliente** enviou e pode forjar. Um atacante rotaciona o header e cada request
vira uma "chave" diferente, furando o rate limit por IP.

### Risco concreto
Bypass do rate limit de `/api/checkout`, `/api/notify`, `/api/shipping/quote`
(que usam IP como chave). Menos grave que P2-3 (o de e-mail usa a chave por e-mail),
mas real.

### Correção
Na Vercel, o IP confiável é injetado pela plataforma. Ler o header que a Vercel
controla e o cliente não consegue sobrescrever. Preferir `x-vercel-forwarded-for`
ou o **último** hop de `x-forwarded-for` (adicionado pelo proxy confiável), não o primeiro:

```ts
export function clientIp(request: Request): string {
  const h = request.headers;
  // Vercel injeta este header e sobrescreve spoof do cliente (P2-4).
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    // último hop = o que o proxy confiável anexou; menos forjável que o primeiro.
    const parts = fwd.split(",").map((s) => s.trim());
    return parts[parts.length - 1] || "unknown";
  }
  return h.get("x-real-ip") ?? "unknown";
}
```
> Confirmar o header exato no runtime da Vercel para este projeto. Se o deploy não
> for Vercel, ajustar para o header do proxy real. **Não** deixar o primeiro valor
> de `x-forwarded-for` como fonte primária.

### Teste
`rate-limit.test.ts`: request com `x-forwarded-for: "1.2.3.4, 10.0.0.1"` e
`x-vercel-forwarded-for: "9.9.9.9"` deve resolver `9.9.9.9`.

---

# P3 — BAIXA PRIORIDADE (higiene / monitorar)

## P3-1 — Path traversal no `ref` do upload de modelo (admin)

**Arquivo:** `web/src/app/api/admin/produto/tamanho/route.ts:50-54` + `web/src/lib/storage.ts:51`.

### Problema
A key do arquivo é `models/comedouro-pet/${fields.ref}.glb`. `fields.ref` valida só
`.min(1)` (linha 14). No modo filesystem (dev), `storeFile` faz
`path.resolve(cwd, "public/uploads", key)` — um `ref` com `../` escapa o diretório.
Só admin autenticado alcança isso, então risco baixo, mas é gravação de arquivo
arbitrária.

### Correção
Restringir `ref` a um padrão seguro no schema (linha 14 do route e/ou no
`shippingPackageSchema`/variante). Trocar `ref: z.string().min(1)` por:

```ts
ref: z.string().regex(/^[a-z0-9_-]+$/i, "ref inválido"),
```
Aplicar o mesmo em `deleteBodySchema.ref` e no schema de variante em
`web/src/db/types.ts` se `ref` for validado lá. Defesa extra em `storeFile`:
rejeitar `key` que contenha `..`:

```ts
if (key.includes("..")) throw new Error("key inválida");
```

## P3-2 — Sem validação do tipo real do arquivo GLB

**Arquivo:** `web/src/app/api/admin/produto/tamanho/route.ts:46-56`.

### Problema
O `content-type` gravado é fixo (`model/gltf-binary`), mas os **bytes** do arquivo
não são checados. Admin pode subir qualquer coisa. Risco baixo (admin-only, e o
arquivo é servido como asset estático, não executado).

### Correção (lazy)
Checar o magic number do GLB (primeiros 4 bytes = `glTF` / `0x46546C67`) antes de
`storeFile`:

```ts
if (buf.length < 4 || buf.readUInt32LE(0) !== 0x46546c67) {
  return NextResponse.json({ error: "Arquivo não é um GLB válido" }, { status: 400 });
}
```
> Skip aceitável se admin for 100% confiável. Adicionar quando houver mais de um admin.

## P3-3 — Dependências transitivas com CVE (`npm audit`)

**Comando:** `cd web && npm audit --omit=dev`

### Estado atual (2026-07-22)
- `sharp <0.35.0` — **high**, CVEs de libvips (CVE-2026-33327/33328/35590/35591). Transitiva via `next`.
- `postcss <8.5.10` — moderate (XSS no stringify). Transitiva via `next`.
- `esbuild <=0.24.2` — moderate (dev server). Transitiva via `drizzle-kit`/`better-auth` — **dev-only**, não afeta produção.

### Correção
**Não** rodar `npm audit fix --force` — ele quer instalar `next@9.3.3` (downgrade
catastrófico). Em vez disso:
1. Atualizar Next para o patch mais recente da linha 16.x quando disponível
   (`npm i next@latest` dentro da major 16) — puxa `sharp`/`postcss` corrigidos.
2. `esbuild` é dev-only (build/migrations), risco de produção nulo — monitorar,
   corrige quando `drizzle-kit`/`better-auth` atualizarem.
3. Reavaliar com `npm audit` a cada sprint.

## P3-4 — Confirmar `SameSite` do cookie de sessão (CSRF)

**Arquivo:** `web/src/lib/auth.ts` (config do Better Auth).

### Verificação (não é necessariamente um bug)
As rotas de mutação do admin (`/api/admin/**`, `/api/conta/excluir`) confiam no
cookie de sessão. A proteção contra CSRF depende do cookie ser `SameSite=Lax` ou
`Strict`. Better Auth usa `Lax` por padrão (protege POST cross-site top-level), o
que provavelmente já cobre. **Ação:** confirmar em runtime (DevTools → Application →
Cookies) que o cookie de sessão tem `SameSite=Lax` e `Secure` em produção. Se por
algum motivo estiver `None`, adicionar em `auth.ts`:

```ts
advanced: {
  database: { generateId: "uuid" },
  cookies: { session_token: { attributes: { sameSite: "lax", secure: true } } },
},
```
> Só mexer se a verificação mostrar que não está `Lax/Strict`. Caso contrário, nada a fazer.

---

# Checklist de execução

```
[ ] P1-1  Escape de HTML nos e-mails (email.ts) + teste
[ ] P1-2  CSV formula injection (orders.csv/route.ts) + teste
[ ] P2-1  CSP (report-only) + HSTS (next.config.ts) — validar no browser
[ ] P2-2  Trava dupla no endpoint de debug (test/last-verification) + env no e2e
[ ] P2-3  Rate limit durável (Upstash) OU contador no banco + await nos 6 call sites
[ ] P2-4  clientIp deixa de confiar no 1º x-forwarded-for
[ ] P3-1  Regex no ref do upload + guarda de ".." em storeFile
[ ] P3-2  Magic number do GLB
[ ] P3-3  Atualizar next (patch) — NÃO usar audit fix --force
[ ] P3-4  Verificar SameSite do cookie (só corrigir se não for Lax/Strict)

Após cada bloco:  cd web && npm test && npm run lint
```

## Ordem recomendada de commits
1. `fix(security): escapa entrada do cliente nos e-mails transacionais` (P1-1)
2. `fix(security): neutraliza formula injection no export CSV` (P1-2)
3. `feat(security): adiciona CSP report-only e HSTS` (P2-1)
4. `fix(security): endpoint de debug exige flag explicita alem de NODE_ENV` (P2-2)
5. `feat(security): rate limit duravel via Upstash` (P2-3, P2-4 juntos)
6. `fix(security): hardening de upload de modelo do admin` (P3-1, P3-2)
7. `chore(security): atualiza next e revisa cookies` (P3-3, P3-4)

> Push é exclusivo do @devops (ver `.claude/rules/agent-authority.md`). O modelo
> que implementar deve `git add`/`git commit` local e parar aí.
