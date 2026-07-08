import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, orders } from "@/db";
import { customerSchema } from "@/db/types";
import { requireAdminSession } from "@/lib/admin-auth";
import { createOrderFromCart } from "@/lib/order-creation";
import { markOrderPaidByAdmin } from "@/lib/admin-orders";
import { activeProvider, createPaymentSession, providerConfigured } from "@/lib/payments";

/**
 * Criação manual de pedido pelo admin (9.4) — reusa createOrderFromCart, a mesma
 * validação/recálculo de preço do checkout público (AC3): a tela do admin também
 * não manda preço. Dois desfechos: marcar pago direto (AC2a) ou gerar link MP (AC2b).
 */

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  configuration: z.record(z.string(), z.string()),
});

const bodySchema = z.object({
  items: z.array(cartItemSchema).min(1),
  customer: customerSchema,
  shippingCentsOverride: z.number().int().min(0).optional(),
  outcome: z.enum(["paid", "link"]),
});

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = bodySchema.parse(await request.json());
    const { order, shippingCents, items } = await createOrderFromCart(
      { items: body.items, customer: body.customer, shippingCentsOverride: body.shippingCentsOverride },
      session.user.email,
    );

    if (body.outcome === "paid") {
      await markOrderPaidByAdmin(order.id, session.user.email);
      return NextResponse.json({ orderId: order.id });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const provider = activeProvider();
    if (!providerConfigured(provider)) {
      return NextResponse.json({ error: "Gateway de pagamento não configurado" }, { status: 501 });
    }

    const paymentSession = await createPaymentSession({
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
      .set({ paymentProvider: paymentSession.provider, providerPaymentId: paymentSession.providerPaymentId })
      .where(eq(orders.id, order.id));

    return NextResponse.json({ orderId: order.id, paymentLink: paymentSession.redirectUrl });
  } catch (err) {
    console.error("Criação manual de pedido falhou:", err);
    const message = err instanceof z.ZodError ? "Dados inválidos" : "Não foi possível criar o pedido";
    const status = err instanceof Error && err.message === "Produto indisponível" ? 404 : 400;
    return NextResponse.json({ error: err instanceof Error && status === 404 ? err.message : message }, { status });
  }
}
