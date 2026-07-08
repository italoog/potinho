# potinho — Plano de Expansão da Loja (Épicos 6–10)

**Criado:** 2026-07-08 · **Autor:** análise via /aios (brownfield) + ponytail
**Continua:** [PLANO-EXECUCAO.md](PLANO-EXECUCAO.md) (épicos 0–5)
**Meta:** loja profissional completa — conta do cliente, dashboard admin, Mercado Pago endurecido, frete SuperFrete.
**Design:** toda UI nova segue a skill `potinho-design` (`.claude/skills/potinho-design/SKILL.md`).

---

## 1. Objetivo e escopo

| Pedido | Épico |
|---|---|
| Cliente loga e vê os pedidos dele | 7 |
| Dashboard para administrar a loja (com resumos/métricas) | 9 |
| Criar pedidos pela tela do admin | 9 |
| Pagamento: Mercado Pago | 6 (hardening — base já existe) |
| Frete: SuperFrete | 8 |
| Loja profissional, segurança revisada | 6 + seção 6 transversal |

**Adicionado ao escopo** (lacunas encontradas na auditoria, seção 2): página `/checkout` (hoje o carrinho aponta para uma rota que **não existe**), validação de assinatura do webhook MP, tratamento de status não-aprovados (estorno/chargeback), captura "avise-me" para cor esgotada, trilha de auditoria de pedidos, rate limiting.

**Fora de escopo** (não pedir agora = não construir): multi-produto no catálogo, cupons, multi-admin com permissões granulares, app mobile, i18n.

---

## 2. Auditoria do estado atual (2026-07-08, branch `worktree-viewer-3d-home-mobile`)

### 2.1 O que já existe e funciona

| Área | Estado | Arquivos |
|---|---|---|
| Home cinematográfica + customizer 3D + carrinho multi-item (localStorage) | ✅ | `web/src/components/potinho/`, `web/src/lib/cart-storage.ts` |
| Schema: `products`, `orders` (publicToken, paymentProvider, trackingCode), `order_items` imutáveis | ✅ | `web/src/db/schema.ts`, migrações `0001–0003` |
| `POST /api/checkout`: recalcula preço no servidor (front nunca manda preço), cria pedido + sessão de pagamento | ✅ | `web/src/app/api/checkout/route.ts` |
| Mercado Pago: preferência via REST + webhook que consulta a API e chama `markOrderPaid` idempotente | ✅ base | `web/src/lib/payments/mercadopago.ts`, `web/src/app/api/mercadopago/webhook/route.ts` |
| Stripe como redundância desativada (`PAYMENT_PROVIDER=stripe` reativa) | ✅ | `web/src/lib/payments/stripe.ts` |
| Frete: Melhor Envio + fallback tabela por UF (`SHIPPING_TABLE_JSON`) | ✅ (provedor errado) | `web/src/lib/shipping.ts` |
| E-mails Resend: confirmação ao cliente + notificação ao lojista | ✅ | `web/src/lib/email.ts` |
| Página pública de status por token opaco (sem login) | ✅ | `web/src/app/pedido/[token]/page.tsx` |
| Storage S3/R2 para snapshots | ✅ | `web/src/lib/storage.ts` |
| Zod em todas as entradas de API | ✅ | `web/src/db/types.ts` |

### 2.2 O que falta (lacunas funcionais)

1. **`/checkout` não existe.** `CartUI.tsx:26` faz `router.push("/checkout")` — a página foi deletada neste branch junto com o fluxo antigo por slug. **A loja não vende hoje.**
2. **Nenhuma autenticação.** O admin antigo (cookie + hash de senha, épico 4) foi removido neste branch (`web/src/lib/auth.ts`, `web/src/app/admin/*` deletados). Não há conta de cliente nem de admin.
3. **Nenhum dashboard.** As rotas `/api/admin/*` foram deletadas junto.
4. **Frete é Melhor Envio**, o negócio decidiu SuperFrete.
5. **Sem geração de etiqueta/rastreio** — `trackingCode` existe no schema mas nada o preenche.
6. **"Avise-me" para cor esgotada** — `stockColors` tem `soldOut`, mas o `NotifyForm` foi deletado e nunca houve tabela para armazenar os e-mails.
7. **Sem histórico de status** — mudar status de pedido não deixa trilha (quem, quando, de quê para quê).

### 2.3 Riscos de segurança encontrados (corrigir no épico 6)

| # | Risco | Onde | Severidade |
|---|---|---|---|
| S1 | Webhook MP **não valida `x-signature`** (HMAC). Mitigado por consultar a API do MP antes de agir, mas aceita tráfego arbitrário e permite enumeração/flood | `api/mercadopago/webhook/route.ts` | média |
| S2 | `catch` do checkout devolve `(err as Error).message` cru ao cliente — pode vazar detalhe interno (string de conexão em erro de DB, etc.) | `api/checkout/route.ts:126` | média |
| S3 | Sem rate limiting em rotas públicas (`/api/checkout` cria pedido + chama gateway a cada POST) | todas as APIs | média |
| S4 | `ALLOW_DEV_CHECKOUT=true` marca pedido como pago sem pagamento — precisa de guarda dura contra produção (`NODE_ENV`) | `api/checkout/route.ts:94` | alta se vazar pra prod |
| S5 | Sem cabeçalhos de segurança (CSP, X-Frame-Options, etc.) no `next.config.ts` | global | baixa |

---

## 3. Decisões de arquitetura

| # | Decisão | Justificativa |
|---|---|---|
| A1 | **Auth: Better Auth** (`better-auth`) com adapter Drizzle, login por **magic link** (plugin oficial) via Resend | Já temos Drizzle + Resend; magic link elimina senha, hash, reset e política de senha — menor superfície de ataque e menor fricção para loja de compra esporádica. Sessão em cookie httpOnly/secure/sameSite=lax gerenciada pela lib |
| A2 | **Admin = mesma auth + coluna `role`** (`customer` \| `admin`). Promoção automática no login quando o e-mail está em `ADMIN_EMAILS` (env, lista separada por vírgula) | Um sistema de auth só; zero tela de "login do admin" separada. Deploy controla quem é admin sem tocar em banco |
| A3 | **Pedido continua funcionando sem conta** (guest checkout + página por token). Conta é opcional e **vincula pedidos por e-mail verificado** no login | Não adicionar fricção à conversão. Magic link já prova posse do e-mail, então o vínculo retroativo é seguro |
| A4 | **SuperFrete substitui Melhor Envio** no `shipping.ts`, mantendo o **fallback por UF** intacto | Mesmo desenho atual (cotação real → tabela fixa); troca-se só o provider |
| A5 | **Stripe permanece como redundância desativada** | Já está pronto e isolado atrás de `PAYMENT_PROVIDER`; deletar não ganha nada, manter não custa nada |
| A6 | **Trilha de auditoria: tabela `order_events`** (append-only) | Profissional: toda transição de status, etiqueta e e-mail registrados com ator e timestamp |
| A7 | **Rate limiting in-memory** (Map por IP+rota, janela deslizante) num helper único | `// ponytail: in-memory, single-node; trocar por Upstash/Redis se for serverless multi-instância` |
| A8 | **Admin em `/admin`**, protegido por middleware + checagem de role **em cada server action/route** (defesa em profundidade — middleware sozinho não basta) | Regra: UI esconde, servidor nega |
| A9 | Métricas do dashboard = **SQL direto com Drizzle** (count/sum/group by) | Sem lib de analytics; volume de uma loja mono-produto não justifica |

---

## 4. Modelo de dados (migrações `0004` e `0005`)

**`0004` (épico 6):** `order_events`, `notify_requests`, colunas novas de `orders` (`userId` FK criada já aqui como NULL sem constraint de tabela — a FK entra na 0005 — ou simplesmente adiada; decidir na story 6.2), `labelUrl`, `superfreteOrderId`.
**`0005` (story 7.1):** tabelas do Better Auth (`users`, `sessions`, `accounts`, `verifications`) + coluna `role` + FK `orders.userId → users.id`.

```
users            id uuid PK · name · email UNIQUE · emailVerified bool · role text ('customer'|'admin')
                 createdAt · updatedAt                    ← geradas pelo Better Auth (CLI) + coluna role
sessions         (padrão Better Auth: token, userId FK, expiresAt, ipAddress, userAgent)
accounts         (padrão Better Auth — mantida mesmo sem OAuth por compatibilidade da lib)
verifications    (padrão Better Auth — tokens de magic link)

orders           + userId uuid NULL FK→users(id)          ← vínculo opcional (guest = NULL)
                 + labelUrl text NULL                     ← etiqueta SuperFrete (PDF)
                 + superfreteOrderId text NULL

order_events     id uuid PK · orderId FK CASCADE · type text
                 ('created'|'paid'|'status_changed'|'label_created'|'email_sent'|'payment_rejected'|'refunded')
                 · data jsonb · actor text ('system'|'webhook'|email do admin) · createdAt
                 índice (orderId, createdAt)

notify_requests  id uuid PK · email text · colorId text · createdAt
                 UNIQUE (email, colorId)                  ← "avise-me" de cor esgotada
```

**Backfill de vínculo:** no primeiro login de um e-mail, `UPDATE orders SET user_id = $u WHERE customer->>'email' = $email AND user_id IS NULL` (e o mesmo em cada novo pedido pago com e-mail igual ao de uma conta).

---

## 5. Épicos e stories

Fluxo por story (SDC): `@sm *draft` → `@po *validate` → `@dev *develop` → `@qa *qa-gate` → `@devops *push`.
Toda story de UI carrega a skill `potinho-design` antes de codar e termina com o checklist dela.

### Épico 6 — Checkout & hardening de pagamento *(bloqueia tudo: a loja não vende sem 6.1)*

**6.1 — Página `/checkout` multi-item** ⭐ crítica
- Rota `web/src/app/checkout/page.tsx` + form client (`web/src/components/checkout/CheckoutForm.tsx`).
- AC1: lista os itens do carrinho (nome do pet em uppercase, swatches das 2 cores, tamanho, preço via `formatBRL`), permite remover item.
- AC2: formulário do cliente (schema `customerSchema` já existente): nome, e-mail, telefone, endereço completo com máscara de CEP; busca de endereço por CEP via ViaCEP (fetch client-side, sem dependência).
- AC3: cotação de frete exibida ao preencher CEP: novo `POST /api/shipping/quote` com `{ cep, items: [{ productId, size }] }` (carrinho é multi-item — os pacotes vêm das variantes de TODOS os itens, mesma lógica do `api/checkout/route.ts:59-66`); reusa `shippingCentsFor`; rate-limited.
- AC4: consentimento LGPD obrigatório (checkbox → `consentLgpd: true`), link para `/privacidade`.
- AC5: submit → `POST /api/checkout` existente → redirect para `url` retornada (Mercado Pago ou `/pedido/[token]`).
- AC6: estados de erro amigáveis (carrinho vazio → CTA de volta pra home; erro de API → mensagem sem detalhe técnico).
- AC7: e2e Playwright: montar potinho → carrinho → checkout → pedido criado (com `ALLOW_DEV_CHECKOUT` em ambiente de teste).
- Design: painel `rounded-3xl bg-white shadow-potinho-card`, fieldsets com legend eyebrow, botão primário pill "ir para o pagamento".

**6.2 — Webhook Mercado Pago endurecido**
- AC1: validar `x-signature` (HMAC-SHA256 com `MERCADOPAGO_WEBHOOK_SECRET`, manifest `id:{data.id};request-id:{x-request-id};ts:{ts};` conforme doc oficial do MP — confirmar formato na doc durante a story). Assinatura inválida → 401 + log.
- AC2: tratar status além de `approved`: `rejected`/`cancelled` → evento `payment_rejected` (pedido continua `pending`); `refunded`/`charged_back` → status `canceled` + evento `refunded` + e-mail ao lojista.
- AC3: migração `0004` (seção 4) entra nesta story; registrar `order_events` em toda transição.
- AC4: testes unitários da validação de assinatura e da idempotência (reentrega do mesmo evento).

**6.3 — Higiene de segurança nas APIs**
- AC1: helper `web/src/lib/rate-limit.ts` (janela deslizante em memória, por IP+rota) aplicado a `/api/checkout`, `/api/shipping/quote`, webhook e rotas de auth. 429 com `Retry-After`.
- AC2: `catch` do checkout devolve só mensagem genérica ("não foi possível concluir o pedido") — detalhes vão para `console.error`, nunca para o cliente. ZodError continua "Dados inválidos".
- AC3: `ALLOW_DEV_CHECKOUT` só tem efeito se `process.env.NODE_ENV !== "production"` (guarda no código, não só convenção).
- AC4: cabeçalhos de segurança no `next.config.ts`: `X-Frame-Options: DENY` (exceto se embed futuro), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- AC5: revisar que nenhum log grava dados pessoais completos (endereço/telefone) — minimização LGPD.

**6.4 — "Avise-me" de cor esgotada**
- AC1: tabela `notify_requests` (já na migração `0004`, story 6.2) + `POST /api/notify` (zod, rate-limited, upsert idempotente).
- AC2: componente no seletor de cores: cor com `soldOut: true` aparece com opacidade + badge "esgotada"; clicar abre mini-form de e-mail (receita "nota informativa" + input do design system).
- AC3: lista dos e-mails visível no admin (consumida na story 9.5).

### Épico 7 — Autenticação & conta do cliente

**7.1 — Better Auth: instalação e schema**
- AC1: `npm i better-auth` (única dependência nova de auth); instância em `web/src/lib/auth.ts` com adapter Drizzle + plugin magic link; handler em `web/src/app/api/auth/[...all]/route.ts`.
- AC2: tabelas geradas via CLI do Better Auth integradas ao `schema.ts` + coluna `role` + FK `orders.userId` — migração `0005` (seção 4).
- AC3: envio do magic link via Resend (template no tom da marca: "seu link de entrada 🐾"), expiração ≤ 15 min, uso único.
- AC4: sessão: cookie httpOnly, secure em prod, sameSite=lax, expiração 30 dias com renovação deslizante.
- AC5: no callback de login: promover a `admin` se e-mail ∈ `ADMIN_EMAILS`; executar backfill de pedidos (seção 4).
- AC6: teste unitário do backfill e da promoção de role.

**7.2 — UI de login (`/conta`)**
- AC1: página `/conta` deslogada = form de e-mail ("entrar ou criar conta — sem senha, a gente manda um link") + estado "link enviado, olha seu e-mail".
- AC2: rate limit no envio (máx. 3 links/e-mail/hora) e resposta idêntica para e-mail existente/inexistente (sem enumeração de contas).
- AC3: link no footer e na página `/pedido/[token]` ("criar conta para acompanhar seus pedidos").
- Design: card central `shadow-potinho-card`, PawIcon decorativa, tudo minúsculo.

**7.3 — Meus pedidos (`/conta` logado + `/conta/pedidos/[id]`)**
- AC1: middleware protege `/conta/**` (redirect para login) — e cada query filtra por `userId` da sessão no servidor (nunca confiar só no middleware).
- AC2: lista de pedidos do usuário: data, nome(s) do(s) pet(s), swatches de cores, status com badge, total. Ordenada por `createdAt desc`.
- AC3: detalhe do pedido: itens com snapshot (quando houver), endereço de entrega, linha do tempo de status (via `order_events`), código de rastreio com link de rastreamento quando `shipped`.
- AC4: botão "sair" (sign out) e exclusão de conta (LGPD): anonimiza `users` e desvincula pedidos (`userId = NULL`; o jsonb `customer` do pedido permanece por obrigação fiscal — documentar na política de privacidade).
- AC5: status traduzidos e no tom da marca: `pending`→"aguardando pagamento", `paid`→"pago — já vai pra impressão", `production`→"sendo impresso", `shipped`→"a caminho", `delivered`→"chegou! 🐾", `canceled`→"cancelado".
- AC6: e2e: login por magic link (interceptado no ambiente de teste) → ver pedido vinculado.

### Épico 8 — Frete SuperFrete

**8.1 — Cotação SuperFrete**
- AC1: `web/src/lib/shipping.ts`: substituir `quoteMelhorEnvio` por `quoteSuperFrete` — `POST {base}/api/v0/calculator` com Bearer `SUPERFRETE_TOKEN`, `User-Agent` identificando a loja (exigência da API), timeout 5s. Base sandbox via `SUPERFRETE_SANDBOX=true`. **Confirmar contrato exato (payload/serviços 1,2,17) na doc oficial durante a story — não inventar campos.**
- AC2: mantém a assinatura `shippingCentsFor(cep, uf, packages)` e o fallback por UF — nenhum chamador muda.
- AC3: escolhe a cotação mais barata entre os serviços retornados sem erro; preço em centavos inteiros.
- AC4: atualizar `web/src/lib/shipping.test.ts` (mock do fetch: sucesso, erro, timeout → fallback).

**8.2 — Etiqueta e envio (admin)**
- AC1: server action `createShippingLabel(orderId)` (só admin): cria envio no SuperFrete (fluxo carrinho → checkout → gerar → link de impressão da doc oficial), grava `superfreteOrderId`, `labelUrl`, `trackingCode`, evento `label_created`.
- AC2: transição de status `paid|production → shipped` dispara e-mail ao cliente com rastreio (novo template em `email.ts`) + evento `email_sent`.
- AC3: falha na API do SuperFrete não corrompe o pedido: erro exibido no admin, nada gravado pela metade (transação).
- AC4: botão no detalhe do pedido do admin: "gerar etiqueta" (com preço da etiqueta exibido antes de confirmar).

### Épico 9 — Dashboard admin (`/admin`)

**9.1 — Fundação do admin**
- AC1: layout `web/src/app/admin/layout.tsx`: sidebar (desktop) / tabs (mobile) — "resumo · pedidos · criar pedido · produto · avise-me". Middleware + checagem `role === "admin"` no layout (server) **e** em toda action/route do admin.
- AC2: usuário logado sem role admin → 404 (não revelar que a rota existe).
- AC3: identidade visual: mesma linguagem da loja (fundo `potinho-fundo`, cards brancos `shadow-potinho-card`, títulos lowercase chocolate) — densidade maior é permitida (tabelas `text-sm`), mas tokens e raios são os mesmos.

**9.2 — Resumo da loja (métricas)**
- AC1: cards de KPI (período selecionável: 7d / 30d / tudo): receita paga (soma `totalAmount` com `paidAt` no período), nº de pedidos pagos, ticket médio, pedidos aguardando ação (status `paid` — precisam ir pra produção).
- AC2: distribuição de pedidos por status (barras simples com tokens da marca — sem lib de gráfico; barras são `div` com largura %).
- AC3: top combinações de cores e tamanhos vendidos (agregação sobre `order_items.configuration`).
- AC4: lista dos 10 pedidos mais recentes com link pro detalhe.
- AC5: queries em `web/src/lib/admin-metrics.ts` com testes unitários (PGlite, como `db.test.ts`).

**9.3 — Gestão de pedidos**
- AC1: `/admin/pedidos`: tabela com busca (nome/e-mail/nome do pet), filtro por status, paginação. Colunas: data, cliente, pets, total, status, rastreio.
- AC2: `/admin/pedidos/[id]`: tudo do pedido (itens + configuração + snapshot, cliente completo, valores, eventos em linha do tempo, ids do gateway com link pro painel do MP).
- AC3: mudança de status via select (server action): grava `order_events` com ator = e-mail do admin; transições inválidas bloqueadas (ex.: `delivered → pending`); `shipped` exige rastreio (integra 8.2).
- AC4: export CSV dos pedidos filtrados (`/api/admin/orders.csv`, só admin) — repõe a funcionalidade deletada do épico 4.
- AC5: reenviar e-mail de confirmação (botão, action idempotente, evento `email_sent`).

**9.4 — Criar pedido pelo admin** ⭐ pedido explícito
- AC1: `/admin/pedidos/novo`: montar 1..N itens (tamanho, 2 cores da paleta de estoque, nome do pet — mesmas validações do `paramSchema`; reusa `validateCartItems`), dados do cliente (mesmo `customerSchema`), frete cotado (8.1) com opção de sobrescrever valor manualmente.
- AC2: dois desfechos: **(a) marcar como pago** (venda direta/pix por fora) → `markOrderPaid` com `providerPaymentId = "manual_{uuid}"`, evento com ator admin; **(b) gerar link de pagamento** → cria preferência MP (`createPaymentSession`) e mostra o link para copiar/enviar por e-mail ao cliente.
- AC3: preço sempre recalculado no servidor pela mesma rota de validação do checkout público — a tela do admin também não manda preço.
- AC4: pedido criado aparece nas métricas e na lista imediatamente; se o e-mail do cliente tem conta, já nasce vinculado (`userId`).
- AC5: e2e: criar pedido manual pago → visível em `/admin/pedidos` e em `/conta` do cliente.

**9.5 — Produto & estoque de cores**
- AC1: `/admin/produto`: editar preços por tamanho (`priceDelta`/`basePrice`), dimensões de envio por variante e status draft/published — grava em `products` (fonte que o site já lê).
- AC2: alternar `soldOut` por cor de estoque. **Pré-requisito técnico:** mover `soldOut` de `site-config.ts` (hardcoded) para o banco (coluna/jsonb em `products` ou tabela `stock_colors`) — decidir na story com @architect; `site-config.ts` continua dono de vídeo/marketing.
- AC3: lista de e-mails "avise-me" por cor + botão "avisar todos" quando a cor volta (dispara e-mail Resend em lote, marca enviados).

### Épico 10 — Qualidade & lançamento

**10.1 — Suíte de verificação**
- AC1: e2e Playwright cobrindo os 4 fluxos de dinheiro: compra guest, compra logado, pedido manual admin, webhook de pagamento (payload assinado de teste).
- AC2: `npm run lint` + `typecheck` + `vitest` + `build` verdes; e2e no CI.
**10.2 — Checklist de produção**
- AC1: rodar checklist de segurança da seção 6 inteiro e anexar resultado ao story file.
- AC2: backup automático do Postgres (pg_dump diário ou backup gerenciado do provedor) documentado em `docs/guides/`.
- AC3: webhook do MP registrado no painel com secret; SuperFrete em produção com saldo; `ALLOW_DEV_CHECKOUT` ausente do ambiente.
- AC4: smoke test em produção com pagamento real de R$ 1 (produto de teste draft) e estorno.

---

## 6. Segurança (transversal — vale para toda story)

1. **Toda entrada** passa por zod no servidor (novas rotas incluídas: notify, quote, admin actions).
2. **Preço nunca vem do cliente** — regra já existente, mantida em TODOS os fluxos novos (inclusive admin, AC 9.4.3).
3. **AuthZ em profundidade:** middleware (UX) + checagem de sessão/role dentro de cada server action e route handler (segurança). Nenhuma rota `/api/admin/*` ou action responde sem `role === "admin"`.
4. **Cookies:** httpOnly, secure (prod), sameSite=lax. Server actions do Next têm proteção CSRF nativa (origin check); rotas REST mutantes exigem sessão válida.
5. **Webhooks:** assinatura HMAC verificada antes de qualquer processamento; idempotência garantida (já existe em `markOrderPaid`, estender a novos eventos).
6. **Rate limiting** nas rotas públicas e de auth (A7).
7. **Sem enumeração:** login responde igual para conta existente/inexistente; rotas admin retornam 404 para não-admin.
8. **Erros:** mensagem genérica pro cliente, detalhe só em log de servidor. Logs sem dados pessoais completos.
9. **Segredos** só em env (`MERCADOPAGO_*`, `SUPERFRETE_TOKEN`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`) — nunca em código ou `NEXT_PUBLIC_*`.
10. **LGPD:** consentimento no checkout (existe), política de privacidade atualizada com conta/exclusão (7.3.AC4), minimização em logs, dados fiscais retidos com base legal documentada.
11. **Dependências:** única dependência nova prevista é `better-auth` (+ `@playwright/test` em dev). Qualquer outra exige justificativa na story.

## 7. UI — aplicação do design system por tela

| Tela | Receitas da skill `potinho-design` |
|---|---|
| `/checkout` | painel de formulário, fieldset+legend eyebrow, input, botão primário pill, nota informativa (frete/LGPD) |
| `/conta` login | card central `shadow-potinho-card`, input de e-mail (sem uppercase), botão primário, PawIcon decorativa |
| `/conta` pedidos | cards de lista `rounded-2xl`, badges de status (`bg-potinho-bege` + variações), nome do pet uppercase tracking-widest |
| `/admin` | mesmo tom (fundo, chocolate, lowercase); tabelas densas `text-sm`; KPIs como cards brancos com número `text-3xl font-bold text-potinho-chocolate`; barras de status com tokens da marca |
| e-mails novos | mesmo template base do `email.ts` atual, voz da marca |

Badges de status (novo padrão a adicionar na skill quando implementado): `pending` bege, `paid`/`production` chocolate, `shipped` azul do estoque, `delivered` verde-oliva do estoque, `canceled` cinza.

## 8. Variáveis de ambiente

| Var | Uso | Nova? |
|---|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | API MP | existe |
| `MERCADOPAGO_WEBHOOK_SECRET` | validação x-signature (6.2) | **nova** |
| `SUPERFRETE_TOKEN` / `SUPERFRETE_SANDBOX` | cotação + etiquetas (ép. 8) | **novas** |
| `STORE_ORIGIN_CEP` | origem do frete | existe |
| `SHIPPING_TABLE_JSON` | fallback por UF | existe |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | auth (7.1) | **novas** |
| `ADMIN_EMAILS` | allowlist de admins (A2) | **nova** |
| `RESEND_API_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, S3/R2 | já existentes | existe |
| `ALLOW_DEV_CHECKOUT` | só dev — neutralizada em prod (6.3) | existe |
| `MELHORENVIO_TOKEN` | **remover** após 8.1 | remove |

## 9. Ordem de execução e dependências

```
6.1 checkout ──► (loja volta a vender — DEPLOY 1)
6.2 webhook ─┐
6.3 higiene ─┼─► DEPLOY 2 (pagamento endurecido)
6.4 avise-me ┘
7.1 auth ──► 7.2 login ──► 7.3 meus pedidos ──► DEPLOY 3 (conta do cliente)
8.1 cotação SuperFrete (independente; pode rodar em paralelo ao ép. 7)
9.1 fundação admin (depende de 7.1) ──► 9.2 métricas ──► 9.3 pedidos ──► 9.4 criar pedido
                                                    8.2 etiquetas (depende de 9.3)
9.5 produto/estoque
10.1–10.2 qualidade & lançamento (fim)
```

Marcos: **M1** = deploy 1 (vendas funcionando) · **M2** = deploy 3 (cliente loga e vê pedidos) · **M3** = admin completo + SuperFrete · **M4** = checklist de produção fechado.

## 10. Riscos e questões em aberto

| # | Item | Ação |
|---|---|---|
| R1 | Contrato exato da API SuperFrete (payload da calculadora, fluxo de etiqueta) | Confirmar na doc oficial na story 8.1 antes de codar (Constituição art. IV — não inventar) |
| R2 | Formato do manifest do `x-signature` do MP pode variar por tipo de notificação | Confirmar na doc oficial na story 6.2; testar com simulador de webhook do painel MP |
| R3 | Deploy serverless multi-instância quebra rate limit in-memory | Aceito com comentário `ponytail:`; upgrade path = Upstash |
| R4 | `soldOut` hardcoded em `site-config.ts` vs. admin editável (9.5) | @architect decide na story: coluna em `products` vs. tabela própria |
| R5 | Melhor Envio já configurado em algum ambiente? | Verificar env de prod antes de remover token |
| R6 | Better Auth gera tabelas com nomes próprios (`user`, `session`) — conflito de convenção com o schema atual em inglês plural | Mapear nomes no adapter Drizzle na 7.1 (suportado pela lib) |

## 11. Critérios de aceite globais (definition of done do plano)

- [ ] Cliente compra sem conta (guest) e com conta; nos dois casos o pedido aparece em `/pedido/[token]`.
- [ ] Cliente loga por magic link e vê todos os pedidos do e-mail dele, com linha do tempo e rastreio.
- [ ] Admin loga com o mesmo fluxo, acessa `/admin`, vê receita/pedidos/ticket médio/top cores por período.
- [ ] Admin cria pedido manual (pago ou com link MP) e o pedido entra no fluxo normal.
- [ ] Pagamento 100% Mercado Pago com webhook assinado; estorno/chargeback refletem no pedido.
- [ ] Frete cotado e etiqueta gerada pelo SuperFrete; rastreio chega por e-mail ao cliente.
- [ ] Checklist de segurança (seção 6) auditado story a story pelo @qa.
- [ ] Toda tela nova passa no checklist da skill `potinho-design`.
