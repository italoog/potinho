# Checklist de segurança (seção 6 do PLANO-EXPANSAO-LOJA.md) — resultado

**Data:** 2026-07-08 · **Épico:** 10.2 AC1 · **Auditado contra:** branch `worktree-viewer-3d-home-mobile`, após épicos 6–9.

Cada item foi verificado contra o código real (arquivo:linha), não por inspeção superficial. Duas lacunas reais foram encontradas e corrigidas durante esta auditoria (marcadas ✅ *corrigido*); o resto já estava conforme.

| # | Item | Status | Evidência / observação |
|---|------|--------|-------------------------|
| 1 | Zod em toda entrada | ✅ | Todas as rotas com body validam via `bodySchema.parse`. `mercadopago/webhook/route.ts` faz parsing manual de query/body (só extrai um ID), mas a integridade real vem da assinatura HMAC, não de zod — aceitável. |
| 2 | Preço nunca vem do cliente | ✅ | `createOrderFromCart` (`lib/order-creation.ts`) é o único ponto de inserção em `orders`, usado por checkout público e admin; preço sempre recalculado via `validateCartItems`. |
| 3 | AuthZ em profundidade | ✅ | As 6 rotas `api/admin/**` chamam `requireAdminSession()` como primeira ação. |
| 4 | Cookies (httpOnly/secure/sameSite) | ✅ | Sem override em `lib/auth.ts` — defaults do Better Auth se aplicam. |
| 5 | Webhook: assinatura antes de processar + idempotência | ✅ | Assinatura verificada antes de qualquer chamada à API do MP ou escrita no banco. `markOrderPaid/Rejected/Refunded` idempotentes (testes unitários dedicados). |
| 6 | Rate limiting | ✅ | Todas as rotas públicas/anônimas (`checkout`, `shipping/quote`, `notify`, `conta/entrar`, `mercadopago/webhook`) têm rate limit. `conta/excluir` e rotas admin não têm, mas exigem sessão (e role admin, no segundo caso) — não são alvo de força bruta anônima. |
| 7 | Sem enumeração | ✅ *corrigido* | `conta/entrar` sempre responde igual. Rotas de página `/admin/**` já devolviam 404 corretamente; as rotas de **API** `admin/**` devolviam 403 (revelava a existência da rota a quem não é admin) — corrigido pra 404 em todas as 6 rotas. |
| 8 | Erros genéricos + logs sem PII completo | ✅ | Padrão consistente de `console.error` + mensagem genérica ao cliente. Nenhum log grava endereço/telefone completos do cliente. |
| 9 | Segredos só em env | ✅ | Nenhum segredo hardcoded encontrado; nenhum prefixo `NEXT_PUBLIC_` em variável sensível. |
| 10 | LGPD (consentimento, política atualizada, retenção) | ✅ *corrigido* | Checkbox de consentimento já existia (client + servidor). A página `/privacidade` ainda citava "Forja3D" (nome antigo) e não mencionava conta/exclusão/retenção fiscal dos dados do pedido — atualizada com essas seções e o nome da marca corrigido. |
| 11 | Dependências novas justificadas | ✅ | Só `better-auth` (épico 7) e `@playwright/test` (épico 10, dev) foram adicionadas — ambas previstas no plano. |

## Itens fora do escopo desta auditoria (bloqueados por infraestrutura real)

Os itens **10.2 AC3** (webhook do MP registrado no painel com secret; SuperFrete em produção com saldo; `ALLOW_DEV_CHECKOUT` ausente do ambiente) e **10.2 AC4** (smoke test com pagamento real de R$ 1 e estorno) exigem uma conta de produção real do Mercado Pago/SuperFrete e um ambiente implantado — nenhum dos dois existe neste momento (todo o trabalho até aqui foi feito localmente, num worktree git). Esses itens ficam pendentes de execução manual pelo time no momento do deploy, e não foram simulados nem marcados como concluídos.
