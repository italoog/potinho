import { and, eq, isNull } from "drizzle-orm";
import { getDb, notifyRequests } from "@/db";
import { sendColorBackInStockEmail } from "./email";

export interface NotifyGroup {
  colorId: string;
  emails: string[];
}

/** Agrupa pedidos de "avise-me" ainda não notificados por cor (9.5 AC3). */
export async function getPendingNotifyRequests(): Promise<NotifyGroup[]> {
  const db = await getDb();
  const rows = await db.select().from(notifyRequests).where(isNull(notifyRequests.notifiedAt));
  const byColor = new Map<string, string[]>();
  for (const row of rows) {
    const list = byColor.get(row.colorId) ?? [];
    list.push(row.email);
    byColor.set(row.colorId, list);
  }
  return Array.from(byColor.entries()).map(([colorId, emails]) => ({ colorId, emails }));
}

/** Avisa todo mundo que pediu "avise-me" pra essa cor e marca como enviado (não notifica duas vezes). */
export async function notifyAllForColor(colorId: string, colorLabel: string): Promise<number> {
  const db = await getDb();
  const pendingFilter = and(eq(notifyRequests.colorId, colorId), isNull(notifyRequests.notifiedAt));
  const pending = await db.select().from(notifyRequests).where(pendingFilter);
  if (pending.length === 0) return 0;

  await Promise.allSettled(pending.map((row) => sendColorBackInStockEmail(row.email, colorLabel)));
  await db.update(notifyRequests).set({ notifiedAt: new Date() }).where(pendingFilter);
  return pending.length;
}
