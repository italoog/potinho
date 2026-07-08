import { getDb, orderEvents } from "@/db";
import type { OrderEventType } from "@/db/types";

/** Grava uma transição na trilha de auditoria do pedido (A6). */
export async function recordOrderEvent(
  orderId: string,
  type: OrderEventType,
  actor: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const db = await getDb();
  await db.insert(orderEvents).values({ orderId, type, actor, data });
}
