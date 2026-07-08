import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb, orderItems, orders } from "@/db";
import type { OrderRow } from "@/db/schema";
import { ORDER_STATUSES, type OrderStatus } from "@/db/types";

/** Resumo da loja (9.2) — período selecionável; "aguardando ação" é sempre o estado atual (não filtra por período). */
export type MetricsPeriod = "7d" | "30d" | "all";

function periodStart(period: MetricsPeriod): Date | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export interface ComboCount {
  colorBase: string | null;
  colorBand: string | null;
  size: string | null;
  count: number;
}

export interface AdminSummary {
  revenueCents: number;
  paidOrdersCount: number;
  averageTicketCents: number;
  awaitingActionCount: number;
  statusCounts: Record<OrderStatus, number>;
  topCombos: ComboCount[];
  recentOrders: OrderRow[];
}

export async function getAdminSummary(period: MetricsPeriod): Promise<AdminSummary> {
  const db = await getDb();
  const start = periodStart(period);

  const paidFilter = start
    ? and(isNotNull(orders.paidAt), gte(orders.paidAt, start))
    : isNotNull(orders.paidAt);

  const paidOrders = await db.select({ totalAmount: orders.totalAmount }).from(orders).where(paidFilter);
  const revenueCents = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const paidOrdersCount = paidOrders.length;
  const averageTicketCents = paidOrdersCount > 0 ? Math.round(revenueCents / paidOrdersCount) : 0;

  const [awaiting] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.status, "paid"));

  const statusRows = await db
    .select({ status: orders.status, count: sql<number>`count(*)::int` })
    .from(orders)
    .groupBy(orders.status);
  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const row of statusRows) statusCounts[row.status as OrderStatus] = row.count;

  const topCombos = await db
    .select({
      colorBase: sql<string | null>`configuration->>'color_base'`,
      colorBand: sql<string | null>`configuration->>'color_band'`,
      size: sql<string | null>`configuration->>'size'`,
      count: sql<number>`count(*)::int`,
    })
    .from(orderItems)
    .groupBy(
      sql`configuration->>'color_base'`,
      sql`configuration->>'color_band'`,
      sql`configuration->>'size'`,
    )
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10);

  return {
    revenueCents,
    paidOrdersCount,
    averageTicketCents,
    awaitingActionCount: awaiting.count,
    statusCounts,
    topCombos,
    recentOrders,
  };
}
