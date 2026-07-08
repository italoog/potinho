import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, orderItems, orders } from "@/db";
import { customerSchema } from "@/db/types";
import { getProductById } from "@/lib/products";
import { validateCartItems, type CartItemInput } from "@/lib/pricing";
import { shippingCentsFor } from "@/lib/shipping";
import { decodePngDataUrl, storeFile } from "@/lib/storage";
import { activeProvider, createPaymentSession, providerConfigured } from "@/lib/payments";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { recordOrderEvent } from "@/lib/order-events";
import { linkOrderToAccountIfExists } from "@/lib/orders";

/**
 * Cria o pedido (1..N itens) + sessão de pagamento (P-01..P-03, carrinho multi-item).
 * Mercado Pago é o gateway principal; Stripe fica implementado como redundância desativada
 * (reativa com PAYMENT_PROVIDER=stripe). O preço é SEMPRE recalculado aqui a partir do schema
 * de cada produto — o front não envia preço (NFR §6).
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
});

async function storeSnapshot(dataUrl: string | undefined): Promise<string | null> {
  if (!dataUrl) return null;
  try {
    const png = decodePngDataUrl(dataUrl);
    const stored = await storeFile(`snapshots/${crypto.randomUUID()}.png`, png, "image/png");
    return stored.url;
  } catch (err) {
    console.warn("Snapshot descartado:", err);
    return null;
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(`checkout:${clientIp(request)}`, 10, 5 * 60_000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds);

  try {
    const body = bodySchema.parse(await request.json());

    const products = await Promise.all(body.items.map((item) => getProductById(item.productId)));
    const missing = products.some((p) => !p || p.status !== "published");
    if (missing) {
      return NextResponse.json({ error: "Produto indisponível" }, { status: 404 });
    }

    const cartInputs: CartItemInput[] = body.items.map((item, i) => ({
      product: products[i]!,
      configuration: item.configuration,
    }));
    const validated = validateCartItems(cartInputs); // preço + config = fonte de verdade do servidor

    const packages = validated
      .map((v, i) => products[i]!.variants.find((variant) => variant.ref === v.configuration.size)?.shipping)
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    const shipping = await shippingCentsFor(
      body.customer.address.zip,
      body.customer.address.state,
      packages,
    );
    const itemsTotal = validated.reduce((sum, v) => sum + v.unitPrice, 0);
    const total = itemsTotal + shipping;

    const snapshotUrls = await Promise.all(body.items.map((item) => storeSnapshot(item.snapshotDataUrl)));

    const db = await getDb();
    const [order] = await db
      .insert(orders)
      .values({ totalAmount: total, shippingAmount: shipping, customer: body.customer })
      .returning();

    await db.insert(orderItems).values(
      validated.map((v, i) => ({
        orderId: order.id,
        productId: products[i]!.id,
        configuration: v.configuration,
        unitPrice: v.unitPrice,
        snapshotUrl: snapshotUrls[i],
      })),
    );
    await recordOrderEvent(order.id, "created", "system", { itemCount: validated.length });
    await linkOrderToAccountIfExists(order.id, body.customer.email);

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
      shippingCents: shipping,
      items: validated.map((v, i) => ({
        name: products[i]!.name,
        description: Object.entries(v.configuration)
          .map(([k, val]) => `${k}: ${val}`)
          .join(" · "),
        unitAmountCents: v.unitPrice,
        quantity: 1,
      })),
      successUrl: `${appUrl}/pedido/${order.publicToken}?paid=1`,
      cancelUrl: `${appUrl}/`,
    });

    await db
      .update(orders)
      .set({ paymentProvider: session.provider, providerPaymentId: session.providerPaymentId })
      .where(eq(orders.id, order.id));

    return NextResponse.json({ url: session.redirectUrl });
  } catch (err) {
    console.error("Checkout falhou:", err);
    const message = err instanceof z.ZodError ? "Dados inválidos" : "Não foi possível concluir o pedido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
