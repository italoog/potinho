import { and, eq, ne } from "drizzle-orm";
import { getDb, orders, products } from "@/db";
import type { OrderRow } from "@/db/schema";
import { sendNewOrderNotification, sendOrderConfirmation } from "./email";

/**
 * Transição para "Pago" (P-04) — idempotente: o webhook da Stripe pode
 * reentregar o evento; só a primeira chamada tem efeito (e envia e-mails).
 */
export async function markOrderPaid(orderId: string, stripeSessionId: string): Promise<void> {
  const db = await getDb();
  const [updated] = await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date(), stripeSessionId })
    .where(and(eq(orders.id, orderId), ne(orders.status, "paid")))
    .returning();

  if (!updated) return; // já estava pago — reentrega do webhook

  const [product] = await db.select().from(products).where(eq(products.id, updated.productId));
  const productName = product?.name ?? "Produto personalizado";
  // e-mails não podem derrubar o webhook
  await Promise.allSettled([
    sendOrderConfirmation(updated, productName),
    sendNewOrderNotification(updated, productName),
  ]);
}

export async function getOrderByToken(token: string): Promise<OrderRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(orders).where(eq(orders.publicToken, token)).limit(1);
  return row ?? null;
}
