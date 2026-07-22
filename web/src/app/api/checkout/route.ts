import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, orders } from "@/db";
import { customerSchema } from "@/db/types";
import { createOrderFromCart } from "@/lib/order-creation";
import { activeProvider, createPaymentSession, providerConfigured } from "@/lib/payments";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Cria o pedido (1..N itens) + sessão de pagamento (P-01..P-03, carrinho multi-item).
 * Mercado Pago é o gateway principal; Stripe fica implementado como redundância desativada
 * (reativa com PAYMENT_PROVIDER=stripe). O preço é SEMPRE recalculado em createOrderFromCart
 * a partir do schema de cada produto — o front não envia preço (NFR §6).
 */

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  configuration: z.record(z.string(), z.string()),
  snapshotDataUrl: z.string().optional(),
});

const bodySchema = z.object({
  items: z.array(cartItemSchema).min(1),
  customer: customerSchema,
  consentLgpd: z.literal(true),
  couponCode: z.string().min(1).optional(),
});

/** Mensagens de erro que podem ir direto pro cliente — o resto vira o genérico (evita vazar detalhe interno). */
const USER_FACING_ERRORS = [
  "Cupom inválido",
  "Esse cupom não pode ser combinado com itens já em promoção",
  "Esse cupom expirou",
  "Esse cupom atingiu o limite de usos",
];

export async function POST(request: Request) {
  const limit = await rateLimit(`checkout:${clientIp(request)}`, 10, 5 * 60_000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds);

  try {
    const body = bodySchema.parse(await request.json());
    const { order, shippingCents, items } = await createOrderFromCart(
      { items: body.items, customer: body.customer, couponCode: body.couponCode },
      "system",
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const provider = activeProvider();

    if (!providerConfigured(provider)) {
      // Dev sem gateway configurado: pedido fica "pending"; página de status explica.
      // Com ALLOW_DEV_CHECKOUT=true (nunca em produção — S4) o pagamento é simulado.
      if (process.env.ALLOW_DEV_CHECKOUT === "true" && process.env.NODE_ENV !== "production") {
        const { markOrderPaid } = await import("@/lib/orders");
        await markOrderPaid(order.id, `dev_${order.id}`, "system");
      }
      return NextResponse.json({ url: `${appUrl}/pedido/${order.publicToken}` });
    }

    const session = await createPaymentSession({
      orderId: order.id,
      customerEmail: body.customer.email,
      shippingCents,
      items: items.map((item) => ({
        name: item.productName,
        description: Object.entries(item.configuration)
          .map(([k, val]) => `${k}: ${val}`)
          .join(" · "),
        unitAmountCents: item.unitPrice,
        quantity: 1,
      })),
      successUrl: `${appUrl}/pedido/${order.publicToken}?paid=1`,
      cancelUrl: `${appUrl}/`,
    });

    const db = await getDb();
    await db
      .update(orders)
      .set({ paymentProvider: session.provider, providerPaymentId: session.providerPaymentId })
      .where(eq(orders.id, order.id));

    return NextResponse.json({ url: session.redirectUrl });
  } catch (err) {
    console.error("Checkout falhou:", err);
    const status = err instanceof Error && err.message === "Produto indisponível" ? 404 : 400;
    const passthrough = err instanceof Error && (status === 404 || USER_FACING_ERRORS.includes(err.message));
    const message = err instanceof z.ZodError ? "Dados inválidos" : "Não foi possível concluir o pedido";
    return NextResponse.json({ error: passthrough ? (err as Error).message : message }, { status });
  }
}
