import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { comedouroPet } from "@/db/seed-data";

let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const { getAdminSummary } = await import("./admin-metrics");

const CUSTOMER = (email: string) => ({
  name: "Cliente",
  email,
  phone: "11999990000",
  address: { street: "A", number: "1", neighborhood: "B", city: "C", state: "SP", zip: "01234-567" },
});

let productId: string;

async function createOrder(opts: { status: schema.OrderRow["status"]; paidAt?: Date; totalAmount?: number }) {
  const [order] = await testDb
    .insert(schema.orders)
    .values({
      totalAmount: opts.totalAmount ?? 10000,
      customer: CUSTOMER("cliente@example.com"),
      status: opts.status,
      paidAt: opts.paidAt,
    })
    .returning();
  await testDb.insert(schema.orderItems).values({
    orderId: order.id,
    productId,
    configuration: { pet_name: "THOR", color_base: "#E8D9C8", color_band: "#5A4032", size: "15cm" },
    unitPrice: order.totalAmount,
  });
  return order;
}

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  const [product] = await testDb.insert(schema.products).values(comedouroPet).returning();
  productId = product.id;
});

describe("getAdminSummary (9.2)", () => {
  it("soma receita e conta pedidos pagos, calcula ticket médio", async () => {
    await createOrder({ status: "paid", paidAt: new Date(), totalAmount: 10000 });
    await createOrder({ status: "delivered", paidAt: new Date(), totalAmount: 20000 });
    await createOrder({ status: "pending" }); // não pago — não entra na receita

    const summary = await getAdminSummary("all");
    expect(summary.revenueCents).toBe(30000);
    expect(summary.paidOrdersCount).toBe(2);
    expect(summary.averageTicketCents).toBe(15000);
  });

  it("conta pedidos aguardando ação (status paid) independente do período", async () => {
    const summary = await getAdminSummary("all");
    expect(summary.awaitingActionCount).toBeGreaterThanOrEqual(1);
  });

  it("filtra receita por período (7d exclui pedido pago fora da janela)", async () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await createOrder({ status: "delivered", paidAt: old, totalAmount: 99900 });

    const summary7d = await getAdminSummary("7d");
    const summaryAll = await getAdminSummary("all");
    expect(summaryAll.revenueCents).toBeGreaterThan(summary7d.revenueCents);
  });

  it("agrega top combinações de cor+tamanho a partir de order_items", async () => {
    const summary = await getAdminSummary("all");
    expect(summary.topCombos.length).toBeGreaterThan(0);
    expect(summary.topCombos[0]).toMatchObject({ colorBase: "#E8D9C8", colorBand: "#5A4032", size: "15cm" });
  });

  it("lista os pedidos mais recentes, mais novos primeiro", async () => {
    const summary = await getAdminSummary("all");
    expect(summary.recentOrders.length).toBeGreaterThan(0);
    const dates = summary.recentOrders.map((o) => o.createdAt.getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });
});
