# Épico 3 — Pedido e Pagamento (Stripe)

**Origem:** PRD §5 Épico 3 (P-01…P-07).
**Objetivo:** cliente finaliza a compra sem falar com ninguém; pedido persiste a configuração completa e imutável.
**Semana:** 4

## Pré-condição (risco #5 do PRD §10)
- [ ] Verificar elegibilidade de **Pix** na conta Stripe BR ANTES de iniciar a 3.2. Plano B: cartão no MVP.

## Stories

### Story 3.1 — Checkout: dados do cliente + frete
**Executor:** @dev · **Gate:** @qa · **Cobre:** P-01, P-06

Acceptance Criteria:
1. Formulário: nome, WhatsApp/telefone, e-mail, endereço de entrega, com validação (P-01)
2. Frete: valor fixo ou tabela por região configurada pelo admin (P-06)
3. Consentimento LGPD + link para política de privacidade (NFR §6)

### Story 3.2 — Stripe Checkout + webhook + pedido imutável
**Executor:** @dev · **Gate:** @qa · **Cobre:** P-02, P-03, P-04

Acceptance Criteria:
1. Sessão Stripe Checkout criada no backend com preço recalculado do schema (P-02; NFR segurança)
2. Pedido persiste configuração completa e imutável (valores de cada parâmetro + snapshot PNG) antes do redirect (P-03)
3. Webhook `checkout.session.completed` (assinatura verificada) muda pedido para "Pago" (P-04)
4. Idempotência do webhook (retries da Stripe não duplicam efeitos)
5. Pix habilitado se elegível; caso contrário, cartão + registro da decisão

### Story 3.3 — Confirmação: e-mail + página de status
**Executor:** @dev · **Gate:** @qa · **Cobre:** P-05, P-07

Acceptance Criteria:
1. E-mail de confirmação com resumo, imagem do produto configurado e prazo estimado (P-05, via Resend)
2. Tela de confirmação pós-pagamento com snapshot da configuração
3. Página de status por link único, sem login (P-07)

## Dependências
- Depende dos Épicos 1 (snapshot) e 2 (preço/schema)

## Rastreabilidade
- PRD §5 Épico 3 · §8 (Order) · NFR §6 (Stripe-only, LGPD) · Risco #5
