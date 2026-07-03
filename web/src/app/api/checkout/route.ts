import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, orders } from "@/db";
import { customerSchema } from "@/db/types";
import { getProductById } from "@/lib/products";
import { calculateTotalCents, validateConfiguration } from "@/lib/pricing";
import { shippingForState } from "@/lib/shipping";
import { decodePngDataUrl, storeFile } from "@/lib/storage";

/**
 * Cria o pedido + sessão Stripe Checkout (P-01..P-03).
 * O preço é SEMPRE recalculado aqui a partir do schema — o front não envia preço (NFR §6).
 */

const bodySchema = z.object({
  productId: z.string().uuid(),
  configuration: z.record(z.string(), z.string()),
  customer: customerSchema,
  consentLgpd: z.literal(true),
  snapshotDataUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());

    const product = await getProductById(body.productId);
    if (!product || product.status !== "published") {
      return NextResponse.json({ error: "Produto indisponível" }, { status: 404 });
    }

    // validação + preço server-side (fonte de verdade)
    const configuration = validateConfiguration(product, body.configuration);
    const itemTotal = calculateTotalCents(product, configuration);
    const shipping = shippingForState(body.customer.address.state);
    const total = itemTotal + shipping;

    // snapshot da configuração (V-07 / P-03)
    let snapshotUrl: string | null = null;
    if (body.snapshotDataUrl) {
      try {
        const png = decodePngDataUrl(body.snapshotDataUrl);
        const stored = await storeFile(`snapshots/${crypto.randomUUID()}.png`, png, "image/png");
        snapshotUrl = stored.url;
      } catch (err) {
        console.warn("Snapshot descartado:", err);
      }
    }

    const db = await getDb();
    const [order] = await db
      .insert(orders)
      .values({
        productId: product.id,
        totalAmount: total,
        shippingAmount: shipping,
        customer: body.customer,
        configuration,
        snapshotUrl,
      })
      .returning();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      // Dev sem Stripe: pedido fica "pending"; página de status explica.
      // Com ALLOW_DEV_CHECKOUT=true o pagamento é simulado (para testar o fluxo completo).
      if (process.env.ALLOW_DEV_CHECKOUT === "true") {
        const { markOrderPaid } = await import("@/lib/orders");
        await markOrderPaid(order.id, `dev_${order.id}`);
      }
      return NextResponse.json({ url: `${appUrl}/pedido/${order.publicToken}` });
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.customer.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: itemTotal,
            product_data: {
              name: product.name,
              description: Object.entries(configuration)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · "),
            },
          },
        },
        ...(shipping > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "brl" as const,
                  unit_amount: shipping,
                  product_data: { name: "Frete" },
                },
              },
            ]
          : []),
      ],
      metadata: { orderId: order.id },
      success_url: `${appUrl}/pedido/${order.publicToken}?paid=1`,
      cancel_url: `${appUrl}/p/${product.slug}`,
    });

    const db2 = await getDb();
    const { eq } = await import("drizzle-orm");
    await db2.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order.id));

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout falhou:", err);
    const message = err instanceof z.ZodError ? "Dados inválidos" : (err as Error).message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
