import { and, eq, ne } from "drizzle-orm";
import { getDb, orderItems, orders, products } from "@/db";
import type { OrderItemRow, OrderRow } from "@/db/schema";
import { sendNewOrderNotification, sendOrderConfirmation, sendRefundNotification } from "./email";
import { recordOrderEvent } from "./order-events";

export interface OrderItemWithProduct extends OrderItemRow {
  productName: string;
}

async function getItemsWithProductNames(orderId: string): Promise<OrderItemWithProduct[]> {
  const db = await getDb();
  const rows = await db
    .select({ item: orderItems, productName: products.name })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));
  return rows.map(({ item, productName }) => ({ ...item, productName: productName ?? "Produto" }));
}

/**
 * Transição para "Pago" (P-04) — idempotente: o webhook da Stripe pode
 * reentregar o evento; só a primeira chamada tem efeito (e envia e-mails).
 */
export async function markOrderPaid(
  orderId: string,
  providerPaymentId: string,
  actor: string = "webhook",
): Promise<void> {
  const db = await getDb();
  const [updated] = await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date(), providerPaymentId })
    .where(and(eq(orders.id, orderId), ne(orders.status, "paid")))
    .returning();

  if (!updated) return; // já estava pago — reentrega do webhook

  await recordOrderEvent(updated.id, "paid", actor, { providerPaymentId });

  const items = await getItemsWithProductNames(updated.id);
  // e-mails não podem derrubar o webhook
  const [confirmationResult, notificationResult] = await Promise.allSettled([
    sendOrderConfirmation(updated, items),
    sendNewOrderNotification(updated, items),
  ]);
  if (confirmationResult.status === "fulfilled" || notificationResult.status === "fulfilled") {
    await recordOrderEvent(updated.id, "email_sent", "system", {
      confirmation: confirmationResult.status,
      notification: notificationResult.status,
    });
  }
}

/** Pagamento recusado/cancelado no gateway (6.2 AC2) — pedido continua "pending", só registra o evento. */
export async function markOrderRejected(
  orderId: string,
  providerPaymentId: string,
  gatewayStatus: string,
): Promise<void> {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status === "paid") return; // já pago — reentrega ou corrida com aprovação
  await recordOrderEvent(orderId, "payment_rejected", "webhook", { providerPaymentId, gatewayStatus });
}

/** Estorno/chargeback (6.2 AC2) — cancela o pedido e avisa o lojista. Idempotente. */
export async function markOrderRefunded(
  orderId: string,
  providerPaymentId: string,
  gatewayStatus: string,
): Promise<void> {
  const db = await getDb();
  const [updated] = await db
    .update(orders)
    .set({ status: "canceled" })
    .where(and(eq(orders.id, orderId), ne(orders.status, "canceled")))
    .returning();

  if (!updated) return; // já estava cancelado — reentrega do webhook

  await recordOrderEvent(updated.id, "refunded", "webhook", { providerPaymentId, gatewayStatus });
  await sendRefundNotification(updated, gatewayStatus);
}

export async function getOrderByToken(
  token: string,
): Promise<{ order: OrderRow; items: OrderItemWithProduct[] } | null> {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.publicToken, token)).limit(1);
  if (!order) return null;
  return { order, items: await getItemsWithProductNames(order.id) };
}
