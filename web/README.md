# potinho

Loja de comedouros elevados para pets, personalizados com o nome do pet e visualizados em 3D antes da compra. Next.js (App Router) + Postgres/Drizzle, checkout via Mercado Pago, frete via SuperFrete, conta do cliente por magic link e um dashboard admin completo.

## Sumário

- [Stack](#stack)
- [Getting started](#getting-started)
- [Arquitetura](#arquitetura)
- [Modelo de dados](#modelo-de-dados)
- [Rotas da aplicação](#rotas-da-aplicação)
- [Rotas de API](#rotas-de-api)
- [Autenticação](#autenticação)
- [Visualizador 3D / personalização](#visualizador-3d--personalização)
- [Pagamento e frete](#pagamento-e-frete)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Testes](#testes)
- [CI/CD](#cicd)
- [Admin](#admin)
- [Cadastrar um novo produto](#cadastrar-um-novo-produto)
- [Requisitos e histórico do produto](#requisitos-e-histórico-do-produto)
- [Segurança e riscos conhecidos](#segurança-e-riscos-conhecidos)
- [Roadmap e gaps de documentação](#roadmap-e-gaps-de-documentação)

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Drizzle ORM** sobre Postgres — em dev, sem `DATABASE_URL`, roda sozinho num banco [PGlite](https://pglite.dev/) local (`.data/pglite`), sem precisar de Docker
- **Better Auth** — login sem senha (magic link), conta do cliente e do admin no mesmo fluxo
- **three.js / @react-three/fiber** — visualizador 3D do produto (customizer ao vivo, gravação do nome via CSG)
- **Mercado Pago** (pagamento) + **SuperFrete** (frete) — cada um com fallback gracioso quando não configurado
- **Resend** (e-mails transacionais) — sem chave configurada, só loga no console em dev
- **S3/R2** (snapshots do produto) — sem configurar, cai pra filesystem local em dev
- **Vitest** (unit/integration, com PGlite real) + **Playwright** (e2e)

## Getting started

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem nenhuma env var configurada, o site funciona inteiro em modo dev: banco PGlite local, e-mails só no console, frete por tabela fixa, e o checkout cria o pedido como "aguardando pagamento" (sem gateway real).

## Arquitetura

Aplicação única em `web/` (Next.js App Router, API routes no mesmo app — não há backend separado). O worker Python de geração de arquivo de produção (3MF automático, épico 5) é a única peça planejada fora deste app, e ainda não foi iniciado.

### Estrutura de pastas (`web/src/`)

**`app/`** — rotas (ver [Rotas da aplicação](#rotas-da-aplicação) e [Rotas de API](#rotas-de-api))

**`components/`**
| Pasta | Conteúdo |
|---|---|
| `admin/` | Formulários e ações do painel admin (`ProdutoForm`, `NovoPedidoForm`, `OrderActions`, `NotifyGroupRow`) |
| `checkout/` | `CheckoutForm.tsx` — formulário de finalização de compra |
| `conta/` | `LoginForm.tsx` (magic link) e `MinhasCompras.tsx` (lista de pedidos do cliente) |
| `home/` | `HeroCube.tsx` — elemento decorativo 3D da home |
| `potinho/` | Componentes de domínio da loja: carrinho (`CartContext`/`CartUI`), `Customizer`, preview 3D da home (`PotinhoViewer`), vitrine (`PotinhoHome`), utilitários visuais (`Marquee`, `Countdown`, `TurntableCard`, `NotifyColorForm`, `BackToStoreButton`) |
| `viewer/` | Motor do visualizador 3D reutilizável: `ProductViewer.tsx`, `NameText.tsx`, `textGeometry.ts`, `engravingMaterial.ts` |

**`lib/`** — regras de negócio e integrações
| Arquivo | Responsabilidade |
|---|---|
| `auth.ts` / `auth-client.ts` | Better Auth (servidor/cliente) |
| `admin-auth.ts` | Guarda de sessão admin |
| `account-provisioning.ts` | Promoção a admin + vínculo de pedidos guest a conta |
| `products.ts`, `pricing.ts` | Catálogo e cálculo de preço (sempre no servidor) |
| `orders.ts`, `order-creation.ts`, `order-events.ts`, `order-status.ts` | Domínio de pedidos e sua máquina de estados |
| `admin-metrics.ts`, `admin-orders.ts`, `admin-notify.ts` | Consultas e ações do painel admin |
| `shipping.ts` | Cotação de frete (SuperFrete + fallback) |
| `email.ts` | Envio via Resend |
| `money.ts` | Formatação/aritmética monetária em centavos |
| `rate-limit.ts` | Limitação de requisições em memória |
| `storage.ts` | Abstração de upload (S3/R2 opcional, fallback local) |
| `asset-manifest.ts` | Contrato do manifest gerado pelo pipeline 3MF→GLB |
| `payments/` | `index.ts` (seleção de provider), `mercadopago.ts`, `stripe.ts`, `types.ts` |

**`db/`** — `schema.ts` (tabelas Drizzle), `types.ts` (schemas zod + tipos de domínio), `index.ts` (conexão/`getDb()`), `migrate.ts`, `seed.ts`/`seed-data.ts`.

### Decisões de arquitetura

Registradas como ADRs em [`docs/architecture/decisoes.md`](../docs/architecture/decisoes.md). Resumo (algumas já superadas pelo plano de expansão, indicado entre parênteses):

- **App único Next.js** no mesmo repo, API routes junto — sem backend separado.
- **Drizzle + Postgres**, JSONB para schemas/configurações flexíveis (personalização, endereço, eventos). PGlite substitui Postgres real em dev e testes, sem Docker.
- **Storage plugável** (`lib/storage.ts`): local em dev, S3-compatível (R2) em produção.
- **Texto 3D via `TextGeometry` real** (extrusão, não SDF) com a mesma fonte do produto físico — o contorno gerado no navegador é o mesmo que alimenta o gerador de arquivo de produção.
- **Preço e validação sempre server-side** (`lib/pricing.ts`) — o front nunca envia preço, mitigando manipulação.
- **Auth**: substituída por Better Auth + magic link (a decisão original de auth própria via `ADMIN_EMAIL`/cookie assinado foi superada).
- **Gateway de pagamento**: Mercado Pago é o principal (a decisão original era Stripe puro); Stripe continua no código como redundância desativada por padrão.

## Modelo de dados

Tabelas do Better Auth (nomes plurais):
- **`users`** — `id`, `name`, `email` (único), `emailVerified`, `image`, `role` (`customer`|`admin`, default `customer`).
- **`sessions`** — `userId` → `users.id` (cascade), `token` (único), `expiresAt`, `ipAddress`, `userAgent`.
- **`accounts`** — `userId` → `users.id` (cascade), `providerId`/`accountId`, tokens OAuth.
- **`verifications`** — usada pelo fluxo de magic link.

Tabelas de domínio:
- **`products`** — `slug` (único), `name`, `description`, `photos` (jsonb), `basePrice`, `status` (`draft`|`published`), `variants` (jsonb), `paramSchema` (jsonb — fonte única da personalização: campos de texto, cor por malha, seleção de tamanho). A loja vende **um único produto configurável**, não um catálogo multi-produto.
- **`orders`** — `publicToken` (uuid único, usado em `/pedido/[token]` sem login), `status` (`pending`|`paid`|`production`|`shipped`|`delivered`|`canceled`), `paymentProvider` (`mercadopago`|`stripe`), `providerPaymentId` (único), `totalAmount`/`shippingAmount` (centavos), `customer` (jsonb), `trackingCode`, `userId` → `users.id` (`set null` — nulo = guest checkout), `paidAt`.
- **`orderItems`** — `orderId` → `orders.id` (cascade), `productId` → `products.id`, `configuration` (jsonb, imutável após criado), `unitPrice` (centavos, recalculado no servidor), `snapshotUrl`.
- **`orderEvents`** — trilha de auditoria append-only: `type` (`created`|`paid`|`status_changed`|`label_created`|`email_sent`|`payment_rejected`|`refunded`), `data` (jsonb livre), `actor` (`system`|`webhook`|e-mail do admin).
- **`notifyRequests`** — fluxo "avise-me" de cor esgotada: `email` + `colorId`, único composto, `notifiedAt`.

Relacionamentos: `users 1—N sessions/accounts`; `users 1—N orders` (opcional); `orders 1—N orderItems`; `orders 1—N orderEvents`; `orderItems N—1 products`.

## Rotas da aplicação

| Rota | Descrição |
|---|---|
| `/` | Home/vitrine — busca o produto publicado e renderiza tudo (visualizador, customizer, carrinho) |
| `/checkout` | Finalização de compra — carrinho vive em `sessionStorage` |
| `/conta` | Login por magic link (deslogado) ou lista "minhas compras" (logado) |
| `/conta/pedidos/[id]` | Detalhe de um pedido do próprio cliente logado (404 se não for dono) |
| `/pedido/[token]` | Status de pedido por link público opaco, sem exigir login |
| `/privacidade` | Política de privacidade (LGPD) |
| `/admin` | Resumo/KPIs (7d/30d/tudo) |
| `/admin/pedidos` | Busca/filtro/paginação de pedidos |
| `/admin/pedidos/[id]` | Detalhe do pedido + ações (mudar status, reenviar e-mail, verificar pagamento) |
| `/admin/pedidos/novo` | Criação manual de pedido pelo admin |
| `/admin/produto` | Edição de preço, variantes e cores do produto |
| `/admin/avise-me` | Lista de espera de cores esgotadas + ação "avisar todos" |

`/admin/**` é protegido em `app/admin/layout.tsx`: sem sessão ou sem `role: admin`, responde **404** (não 403 — a rota nem aparenta existir).

## Rotas de API

| Rota | Método | Descrição |
|---|---|---|
| `api/auth/[...all]` | GET/POST | Handler do Better Auth |
| `api/checkout` | POST | Cria pedido (1..N itens) + sessão de pagamento no gateway ativo |
| `api/conta/entrar` | POST | Envia magic link (rate-limit 3/e-mail/hora, resposta idêntica exista ou não a conta) |
| `api/conta/excluir` | POST | Exclusão/anonimização de conta (LGPD) |
| `api/mercadopago/webhook` | POST | Webhook do gateway principal |
| `api/stripe/webhook` | POST | Webhook da redundância desativada |
| `api/shipping/quote` | POST | Cotação de frete no checkout |
| `api/notify` | POST | Captura e-mail pro "avise-me" |
| `api/test/last-verification` | GET | Expõe o último magic link pros testes e2e — nunca funciona com `NODE_ENV=production` |
| `api/admin/avise-me` | POST | Dispara aviso pra todos os e-mails pendentes de uma cor |
| `api/admin/orders.csv` | GET | Exporta CSV dos pedidos filtrados |
| `api/admin/pedidos` | POST | Criação manual de pedido pelo admin |
| `api/admin/pedidos/[id]/status` | POST | Muda status do pedido |
| `api/admin/pedidos/[id]/reenviar-email` | POST | Reenvia e-mail de confirmação |
| `api/admin/pedidos/[id]/verificar-pagamento` | POST | Reconciliação manual — checa o Mercado Pago pra um pedido "pending" preso |
| `api/admin/produto` | PATCH | Atualiza status/preço/variantes/descontos |
| `api/admin/produto/cor` | POST/DELETE | Adiciona/remove cor |
| `api/admin/produto/tamanho` | POST/DELETE | Adiciona/remove variante (tamanho) |

Todas as `api/admin/*` chamam `requireAdminSession()` internamente — defesa em profundidade, não dependem só do layout.

## Autenticação

Better Auth com `drizzleAdapter` (Postgres) e plugin `magicLink`. Login: `api/conta/entrar` gera link de uso único (válido 15 min), enviado por `sendMagicLinkEmail` (Resend). Sessão dura 30 dias com renovação deslizante diária.

Virar admin: no primeiro login de qualquer conta, `provisionNewUser` roda e promove pra `role: admin` se o e-mail (normalizado) estiver em `ADMIN_EMAILS`. O mesmo hook vincula qualquer pedido guest antigo com o mesmo e-mail à conta recém-criada.

Checagem em duas camadas: `app/admin/layout.tsx` (server-side, 404 se não-admin) + `requireAdminSession()` repetido em cada rota `api/admin/*` (não depende só do layout).

## Visualizador 3D / personalização

Pipeline completa, do arquivo de produção ao preview no navegador:

1. **`scripts/convert-3mf-to-glb.ts`** (offline, manual) — converte o 3MF do Bambu Studio (mm, Z-up) num GLB comprimido (Draco/meshopt) + `asset-manifest.json`, mantendo o 3MF original intacto como fonte pro futuro gerador de produção.
2. **`lib/asset-manifest.ts`** — contrato zod do manifest (malhas, âncora de gravação, fontes de produção vs. web).
3. **`components/potinho/PotinhoViewer.tsx`** / **`components/viewer/ProductViewer.tsx`** — Canvas R3F: carrega o GLB, aplica cores por nome de malha, controla câmera/loading.
4. **`components/viewer/NameText.tsx`** — o nome digitado vira geometria 3D real (opentype.js → extrude), é envolvido ao redor da peça e **subtraído via CSG** (`three-bvh-csg`) da malha, simulando a gravação real do produto físico (que também é removida por corte, não impressa em relevo colado).
5. **`components/potinho/Customizer.tsx`** — formulário dinâmico gerado a partir do `paramSchema` do produto, com preço recalculado ao vivo.

Cadastrar produto novo = apontar `paramSchema` pros nomes de malha do GLB — sem escrever código novo (ver [Cadastrar um novo produto](#cadastrar-um-novo-produto)).

## Pagamento e frete

- **Mercado Pago** é o gateway principal (`lib/payments/mercadopago.ts`, REST direto). Stripe existe como redundância desativada (`PAYMENT_PROVIDER=stripe`).
- Preço e frete são **sempre recalculados no servidor** na criação do pedido — o front nunca manda preço.
- Webhook (`api/mercadopago/webhook`) valida a assinatura HMAC (`x-signature`) antes de processar, e é idempotente (reentrega não duplica e-mail nem re-credita).
- Pedido "pending" que nunca recebe o webhook não fica mais irrecuperável: `api/admin/pedidos/[id]/verificar-pagamento` busca o pagamento direto na API do MP por `external_reference` (o orderId) e reconcilia o status manualmente, pelo botão "verificar pagamento agora" no admin.
- **SuperFrete** cota frete real por CEP (`lib/shipping.ts`), com timeout de 5s e fallback pra tabela fixa por UF (`SHIPPING_TABLE_JSON`) se a API falhar ou não estiver configurada.

Detalhes de segurança e pontos ainda não validados contra as APIs reais: ver [Segurança e riscos conhecidos](#segurança-e-riscos-conhecidos).

## Variáveis de ambiente

Nenhuma é obrigatória pra rodar em dev — cada integração tem um fallback gracioso. Veja `.env.example` pro arquivo pronto pra copiar. As variáveis abaixo são as que importam pra operar de verdade (Stripe, storage S3/R2 e afins são redundância/fallback opcional e não aparecem aqui — configure só se for realmente usar):

| Variável | Uso | Fallback sem ela |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | URL pública do app (links de e-mail, `notification_url` do webhook MP) | `http://localhost:3000` |
| `ADMIN_EMAILS` | lista separada por vírgula — promove a `role: admin` no primeiro login | ninguém vira admin |
| `MERCADOPAGO_ACCESS_TOKEN` | gateway de pagamento principal | checkout fica "pending", sem cobrar |
| `MERCADOPAGO_WEBHOOK_SECRET` | valida a assinatura do webhook do MP | webhook recusa tudo em produção; em dev, aceita sem validar |
| `SUPERFRETE_TOKEN` / `SUPERFRETE_SANDBOX` | cotação de frete real | tabela fixa por UF |
| `STORE_ORIGIN_CEP` | CEP de origem pra cotação de frete | sem cotação real, cai na tabela |
| `RESEND_API_KEY` / `EMAIL_FROM` | envio de e-mail real | loga no console (`[email:dev]`) |
| `LOJISTA_EMAIL` | quem recebe notificação de novo pedido/estorno | notificação pulada |

Variáveis extras existentes no código, opcionais: `DATABASE_URL` (Postgres real — sem ela usa PGlite local), `BETTER_AUTH_URL`, `PAYMENT_PROVIDER`/`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (Stripe), `ALLOW_DEV_CHECKOUT` (nunca em produção), `SHIPPING_TABLE_JSON`, `STORAGE_ENDPOINT`/`STORAGE_BUCKET`/`STORAGE_ACCESS_KEY_ID`/`STORAGE_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_ASSETS_BASE_URL`.

## Scripts

```bash
npm run dev            # servidor de desenvolvimento
npm run build          # build de produção
npm run start          # roda o build de produção
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run test           # vitest (unit/integration, PGlite real)
npm run test:watch     # vitest em modo watch
npm run test:e2e       # playwright — sobe o dev server sozinho, ver playwright.config.ts
npm run db:generate    # gera migration a partir de src/db/schema.ts
npm run db:migrate     # aplica migrations (Postgres real; PGlite migra sozinho em dev)
npm run db:seed        # seed do produto-piloto
```

## Testes

**Unit/integration (Vitest, 14 arquivos)** — cobrem conversão 3MF→GLB, rota de "avise-me", conexão/schema do banco, promoção a admin + vínculo de pedido guest, métricas do admin, busca/filtro de pedidos, formatação monetária, criação/consulta de pedidos, Mercado Pago (HMAC + reconciliação), cálculo de preço, catálogo/variantes, rate limiting, cotação de frete.

**E2E (Playwright, `tests/e2e/`)** — os 4 fluxos de dinheiro:
- `compra-guest.spec.ts` — monta o potinho, finaliza compra sem login, vê o pedido pago.
- `compra-logada.spec.ts` — pedido aparece em `/conta` pro usuário logado.
- `pedido-manual-admin.spec.ts` — admin cria pedido manual pago; vincula à conta se o cliente se cadastrar depois com o mesmo e-mail.
- `webhook-mercadopago.spec.ts` — comportamento do webhook quando o gateway não está configurado (o teste com credenciais reais aprovando um pagamento ainda não existe — ver riscos).

## CI/CD

Único workflow, `.github/workflows/ci.yml` (raiz do repo), roda em todo `push` na `main` e todo `pull_request`: `npm ci` → `lint` → `typecheck` → `test` → `build` → `test:e2e` (Playwright/Chromium). Não há workflow de deploy separado — é só o gate de qualidade.

## Admin

Não existe login/senha de admin. Qualquer conta (magic link, sem senha) cujo e-mail esteja em `ADMIN_EMAILS` vira admin automaticamente no primeiro login, e ganha acesso a `/admin` (resumo, pedidos, criar pedido, produto, avise-me). Quem não é admin recebe 404 em `/admin/**`.

## Cadastrar um novo produto

Guia completo em [`docs/guides/onboarding-de-produto.md`](../docs/guides/onboarding-de-produto.md). Resumo:

1. Modele e monte o produto no Bambu Studio; crie o nome personalizável com o Text Tool (vira "negative part" — é como o pipeline acha âncora/fonte/tamanho); cada parte colorível como objeto separado.
2. Converta: `npx tsx scripts/convert-3mf-to-glb.ts <arquivo.3mf> public/models/<slug> <variante>`.
3. Guarde o 3MF original em `assets/models/<slug>/<ref>.3mf` — nunca alterado, é a base pro futuro gerador de arquivo de produção (épico 5).
4. Escolha uma fonte de licença livre pro visualizador web (o projeto usa Anton, do Google Fonts) — o visualizador mostra "representação aproximada" quando a fonte web difere da de produção.
5. Cadastre o produto (`db/seed-data.ts` é a referência viva) com `paramSchema` apontando pros nomes de malha do GLB gerado.
6. Valide com `npm run test` + teste manual na página do produto.

Cada tamanho é um 3MF/GLB próprio — variantes de tamanho não compartilham arquivo.

## Requisitos e histórico do produto

A documentação de produto vive em `docs/` (fora de `web/`). Resumo do que já foi definido e do estado de cada fase:

### Fase 1 — MVP (`docs/prd/epic-0-fundacao.md` a `epic-5-geracao-3mf.md`)

| Épico | Objetivo | Status |
|---|---|---|
| 0 — Fundação & Infra | Repo executável, deploy contínuo, banco modelado | ✅ concluído (pendências externas: provisionar Postgres/Vercel/R2 de produção) |
| 1 — Visualizador 3D ⭐ | Personalização 3D em tempo real, mobile-first (vindo do Instagram) | ✅ concluído (fallback sem WebGL, V-09, ainda pendente) |
| 2 — Catálogo & Personalização | Admin cadastra produto via schema, sem código novo | 🟡 parcial — motor de schema/preço/página prontos, falta CRUD completo de produto pelo admin |
| 3 — Pedido & Pagamento | Checkout autoatendido, pedido imutável | ✅ código completo (rodava sobre Stripe no desenho original — hoje é Mercado Pago, ver épico 6) |
| 4 — Dashboard do Lojista | Lojista recebe spec do pedido e inicia produção rápido | ✅ concluído |
| 5 — Geração automática de arquivo 3MF ⭐ | Pedido pago gera sozinho o arquivo "abrir e imprimir" | ⚪ **não iniciado** — depende de um worker Python separado (spike de risco: texto booleano com trimesh/manifold3d) |

### Fase 2 — Expansão da loja (`docs/PLANO-EXPANSAO-LOJA.md`, épicos 6-10)

Criada depois de uma auditoria brownfield que encontrou a loja **sem checkout funcional** (rota deletada) e sem autenticação. Escopo deliberadamente fora: multi-produto no catálogo, cupons, multi-admin com permissões granulares, app mobile, i18n.

| Épico | Entrega | Status (conforme `PLANO-EXPANSAO-LOJA.md`) |
|---|---|---|
| 6 — Checkout & hardening de pagamento | `/checkout` multi-item, webhook MP endurecido, rate-limit, guarda de `ALLOW_DEV_CHECKOUT`, "avise-me" | Base implementada (é o que este app roda hoje) |
| 7 — Autenticação & conta do cliente | Better Auth, magic link, "meus pedidos", exclusão de conta (LGPD) | Implementado |
| 8 — Frete SuperFrete | Cotação real + etiqueta/rastreio | Cotação implementada; etiqueta/rastreio automático ainda não |
| 9 — Dashboard admin | Layout, métricas, gestão de pedidos, criar pedido manual, produto & estoque de cores | Implementado |
| 10 — Qualidade & lançamento | Suíte e2e dos 4 fluxos de dinheiro, checklist de produção | Suíte e2e implementada; checklist de produção segue em aberto (ver riscos abaixo) |

### Marcos do plano de expansão

M1 (checkout volta a funcionar) e M2 (conta do cliente) atingidos; M3 (admin completo + SuperFrete) atingido; **M4 (checklist de produção fechado) ainda em aberto** — é o que motivou a auditoria de pagamento/frete e os ajustes mais recentes deste README.

## Segurança e riscos conhecidos

Pontos que já têm mitigação no código mas **precisam de validação manual contra as APIs reais** antes de operar com dinheiro de verdade:

- **Formato do HMAC do webhook Mercado Pago** (`lib/payments/mercadopago.ts`) — o manifest de assinatura foi montado a partir de fontes da comunidade, não de um exemplo verbatim da doc oficial. Revalidar com o simulador de webhook do painel do MP.
- **Formato da resposta do SuperFrete** (`lib/shipping.ts`) — os campos `price`/`error` são inferidos. Se estiverem errados, a cotação cai silenciosamente no fallback fixo por UF, sem alertar ninguém — o site continua funcionando mas cobrando frete errado.
- **Busca de pagamento por `external_reference`** (`findMercadoPagoPaymentByOrderId`, usada na reconciliação manual) — mesma ressalva: endpoint padrão da API do MP, mas nunca exercitado contra o ambiente real.

Riscos aceitos conscientemente (documentados no código com comentário `ponytail:`):
- **Rate limiting em memória** (`lib/rate-limit.ts`) — não é compartilhado entre instâncias em deploy serverless multi-node. Upgrade path: Redis/Upstash, se o volume justificar.
- **Stripe como redundância nunca testada de ponta a ponta** — sem teste unitário ou e2e cobrindo `PAYMENT_PROVIDER=stripe`. Se um dia for ativado em produção, será a primeira execução real desse caminho.

Antes de operar com dinheiro real, confirme: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `SUPERFRETE_TOKEN`, `STORE_ORIGIN_CEP`, `RESEND_API_KEY`, `EMAIL_FROM` (domínio correto) e `LOJISTA_EMAIL` configurados no host de produção, e que `NODE_ENV=production` está de fato setado (sem isso, o webhook aceita requisições sem validar assinatura).

## Roadmap e gaps de documentação

- **Story formal vs. código pronto**: `docs/stories/` só tem 5 arquivos, cobrindo o início dos épicos 0 e 1. Os épicos 2 a 10 já têm código funcionando (conforme `PLANO-EXECUCAO.md`/`PLANO-EXPANSAO-LOJA.md`), mas sem story file formal correspondente — rastreabilidade documental incompleta em relação ao código real.
- **Épico 5 (geração automática de 3MF)** não foi iniciado — hoje a produção depende de um processo manual a partir do 3MF original guardado em `assets/models/`.
- **Épico 2.1 (CRUD completo de produto pelo admin)** parcialmente feito — o admin edita preço/variantes/cores do produto existente, mas criar um segundo produto do zero ainda passa por `db/seed-data.ts` + o script de conversão manual.
- **Etiqueta/rastreio automático do SuperFrete** (épico 8.2) — cotação funciona, geração de etiqueta ainda é manual.
