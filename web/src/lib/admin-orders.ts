import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb, orderItems, orders } from "@/db";
import type { OrderRow } from "@/db/schema";
import type { OrderStatus } from "@/db/types";
import { getItemsWithProductNames, markOrderPaid, markOrderRefunded, markOrderRejected } from "./orders";
import { recordOrderEvent } from "./order-events";
import { sendOrderConfirmation } from "./email";
import { ORDER_STATUS_TRANSITIONS } from "./order-status";

export interface AdminOrderListItem {
  order: OrderRow;
  petNames: string[];
}

export interface AdminOrderSearch {
  query?: string;
  status?: OrderStatus;
  page: number;
  pageSize: number;
}

/** Busca/filtro/paginação de pedidos (9.3 AC1) — nome/e-mail do cliente ou nome do pet. */
export async function searchAdminOrders(
  params: AdminOrderSearch,
): Promise<{ items: AdminOrderListItem[]; total: number }> {
  const db = await getDb();
  const { query, status, page, pageSize } = params;

  const conditions = [];
  if (status) conditions.push(eq(orders.status, status));
  if (query) {
    const like = `%${query}%`;
    conditions.push(
      or(
        ilike(sql`${orders.customer}->>'name'`, like),
        ilike(sql`${orders.customer}->>'email'`, like),
        sql`EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = ${orders.id} AND oi.configuration->>'pet_name' ILIKE ${like})`,
      ),
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(orders).where(where);

  const rows = await db
    .select({
      order: orders,
      petNames: sql<string[] | null>`array_agg(${orderItems.configuration}->>'pet_name')`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(where)
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    total,
    items: rows.map((r) => ({ order: r.order, petNames: (r.petNames ?? []).filter(Boolean) })),
  };
}

/** Muda o status do pedido (9.3 AC3) — valida transição, exige rastreio pra "shipped", registra o ator. */
export async function changeOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  actorEmail: string,
  trackingCode?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false, error: "Pedido não encontrado" };

  const allowed = ORDER_STATUS_TRANSITIONS[order.status as OrderStatus];
  if (!allowed.includes(nextStatus)) {
    return { ok: false, error: `Não é possível mudar de "${order.status}" para "${nextStatus}"` };
  }
  if (nextStatus === "shipped" && !trackingCode && !order.trackingCode) {
    return { ok: false, error: "Informe o código de rastreio antes de marcar como enviado" };
  }

  await db
    .update(orders)
    .set({ status: nextStatus, trackingCode: trackingCode ?? order.trackingCode })
    .where(eq(orders.id, orderId));
  await recordOrderEvent(orderId, "status_changed", actorEmail, {
    from: order.status,
    to: nextStatus,
    trackingCode: trackingCode ?? order.trackingCode ?? undefined,
  });

  return { ok: true };
}

/** Reenvia o e-mail de confirmação (9.3 AC5) — idempotente na ação em si (pode repetir sem corromper nada). */
export async function resendOrderConfirmation(orderId: string, actorEmail: string): Promise<boolean> {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return false;

  const items = await getItemsWithProductNames(orderId);
  await sendOrderConfirmation(order, items);
  await recordOrderEvent(orderId, "email_sent", actorEmail, { type: "resend_confirmation" });
  return true;
}

/** Reaproveita markOrderPaid pra marcar como pago manualmente (9.4) — mesma idempotência/e-mails do webhook. */
export async function markOrderPaidByAdmin(orderId: string, actorEmail: string): Promise<void> {
  await markOrderPaid(orderId, `manual_${crypto.randomUUID()}`, actorEmail);
}

/**
 * Reconcilia manualmente com o Mercado Pago — cobre o caso do webhook nunca chegar e o pedido
 * ficar "pending" pra sempre. Busca pelo orderId (external_reference), não pelo providerPaymentId
 * salvo no checkout (esse é o id da preferência, não do pagamento).
 */
export async function reconcilePaymentByAdmin(
  orderId: string,
  actorEmail: string,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false, error: "Pedido não encontrado" };
  if (order.paymentProvider !== "mercadopago") {
    return { ok: false, error: `Verificação automática não suportada para "${order.paymentProvider}"` };
  }

  const { classifyMercadoPagoStatus, findMercadoPagoPaymentByOrderId } = await import("./payments/mercadopago");
  const payment = await findMercadoPagoPaymentByOrderId(orderId);
  if (!payment) return { ok: false, error: "Nenhum pagamento encontrado no Mercado Pago para este pedido" };

  const outcome = classifyMercadoPagoStatus(payment.status);
  if (outcome === "approved") {
    await markOrderPaid(orderId, payment.paymentId, actorEmail);
  } else if (outcome === "rejected") {
    await markOrderRejected(orderId, payment.paymentId, payment.status);
  } else if (outcome === "refunded") {
    await markOrderRefunded(orderId, payment.paymentId, payment.status);
  }
  return { ok: true, status: payment.status };
}
