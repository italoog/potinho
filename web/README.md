# potinho

Loja de comedouros elevados para pets, personalizados com o nome do pet e visualizados em 3D antes da compra. Next.js (App Router) + Postgres/Drizzle, checkout via Mercado Pago, frete via SuperFrete, conta do cliente por magic link e um dashboard admin completo.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Drizzle ORM** sobre Postgres — em dev, sem `DATABASE_URL`, roda sozinho num banco [PGlite](https://pglite.dev/) local (`.data/pglite`), sem precisar de Docker
- **Better Auth** — login sem senha (magic link), conta do cliente e do admin no mesmo fluxo
- **three.js / @react-three/fiber** — visualizador 3D do produto (customizer ao vivo)
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

## Variáveis de ambiente

Nenhuma é obrigatória pra rodar em dev — cada integração tem um fallback. Para produção, configure as que fizerem sentido:

| Variável | Uso | Fallback sem ela |
|---|---|---|
| `DATABASE_URL` | Postgres real | PGlite local em `.data/pglite` |
| `NEXT_PUBLIC_APP_URL` | URL pública do app (links de e-mail, callbacks) | `http://localhost:3000` |
| `BETTER_AUTH_URL` | Base URL do Better Auth | usa `NEXT_PUBLIC_APP_URL` |
| `ADMIN_EMAILS` | lista separada por vírgula — promove a `role: admin` no primeiro login | ninguém vira admin |
| `MERCADOPAGO_ACCESS_TOKEN` | gateway de pagamento principal | checkout fica "pending", sem cobrar |
| `MERCADOPAGO_WEBHOOK_SECRET` | valida a assinatura do webhook do MP | webhook recusa tudo em produção; em dev, aceita sem validar |
| `PAYMENT_PROVIDER` | `stripe` reativa o Stripe como gateway (redundância desativada por padrão) | Mercado Pago |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | só se `PAYMENT_PROVIDER=stripe` | — |
| `ALLOW_DEV_CHECKOUT` | `true` simula pagamento aprovado sem gateway (nunca em produção — guarda por `NODE_ENV`) | pedido fica pendente |
| `SUPERFRETE_TOKEN` / `SUPERFRETE_SANDBOX` | cotação de frete real | tabela fixa por UF (`SHIPPING_TABLE_JSON`) |
| `STORE_ORIGIN_CEP` | CEP de origem pra cotação de frete | sem cotação real, cai na tabela |
| `SHIPPING_TABLE_JSON` | tabela fixa de frete por UF, ex. `{"SP":1500,"*":2500}` | R$ 20,00 fixo |
| `RESEND_API_KEY` / `EMAIL_FROM` | envio de e-mail real | loga no console (`[email:dev]`) |
| `LOJISTA_EMAIL` | quem recebe notificação de novo pedido/estorno | notificação pulada |
| `STORAGE_ENDPOINT` / `STORAGE_BUCKET` / `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | snapshots do produto num bucket S3/R2 | salva em `public/uploads` |
| `NEXT_PUBLIC_ASSETS_BASE_URL` | CDN dos modelos 3D/assets | serve local |

## Scripts

```bash
npm run dev         # servidor de desenvolvimento
npm run build       # build de produção
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run test         # vitest (unit/integration, PGlite real)
npm run test:e2e     # playwright — sobe o dev server sozinho, ver playwright.config.ts
npm run db:generate  # gera migration a partir de src/db/schema.ts
npm run db:migrate   # aplica migrations (Postgres real; PGlite migra sozinho em dev)
npm run db:seed      # seed do produto-piloto
```

## Admin

Não existe login/senha de admin. Qualquer conta (magic link, sem senha) cujo e-mail esteja em `ADMIN_EMAILS` vira admin automaticamente no primeiro login, e ganha acesso a `/admin` (resumo, pedidos, criar pedido, produto, avise-me). Quem não é admin recebe 404 em `/admin/**` — a rota nem aparenta existir.

## Testes de ponta a ponta (e2e)

`npm run test:e2e` cobre os 4 fluxos de dinheiro (compra guest, compra logada, pedido manual do admin, portão de segurança do webhook do Mercado Pago). Usa uma rota auxiliar (`/api/test/last-verification`) pra logar por magic link sem precisar de e-mail real — essa rota nunca funciona com `NODE_ENV=production`.
