import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { comedouroPet } from "@/db/seed-data";

let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const { markOrderPaid, markOrderRejected, markOrderRefunded, linkOrderToAccountIfExists } = await import(
  "./orders"
);

const CUSTOMER = {
  name: "Mariana Silva",
  email: "mariana@example.com",
  phone: "+5511999990000",
  address: {
    street: "Rua das Flores",
    number: "123",
    neighborhood: "Jardim",
    city: "São Paulo",
    state: "SP",
    zip: "01234-567",
  },
};

async function createOrder() {
  const [order] = await testDb
    .insert(schema.orders)
    .values({ totalAmount: 8990, shippingAmount: 1500, customer: CUSTOMER })
    .returning();
  return order;
}

async function eventsFor(orderId: string) {
  return testDb.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, orderId));
}

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  await testDb.insert(schema.products).values(comedouroPet).onConflictDoNothing();
});

describe("markOrderPaid (6.2 idempotência)", () => {
  it("marca como pago e registra evento 'paid' só na primeira chamada", async () => {
    const order = await createOrder();

    await markOrderPaid(order.id, "pay_123");
    const [afterFirst] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(afterFirst.status).toBe("paid");
    expect((await eventsFor(order.id)).filter((e) => e.type === "paid")).toHaveLength(1);

    // reentrega do webhook — não deve duplicar o evento
    await markOrderPaid(order.id, "pay_123");
    expect((await eventsFor(order.id)).filter((e) => e.type === "paid")).toHaveLength(1);
  });
});

describe("markOrderRejected (6.2 AC2)", () => {
  it("registra 'payment_rejected' e mantém o pedido pending", async () => {
    const order = await createOrder();
    await markOrderRejected(order.id, "pay_456", "rejected");

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.status).toBe("pending");
    expect((await eventsFor(order.id)).map((e) => e.type)).toContain("payment_rejected");
  });
});

describe("markOrderRefunded (6.2 AC2)", () => {
  it("cancela o pedido e registra 'refunded' uma única vez", async () => {
    const order = await createOrder();
    await markOrderRefunded(order.id, "pay_789", "charged_back");

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.status).toBe("canceled");
    expect((await eventsFor(order.id)).filter((e) => e.type === "refunded")).toHaveLength(1);

    // reentrega — idempotente
    await markOrderRefunded(order.id, "pay_789", "charged_back");
    expect((await eventsFor(order.id)).filter((e) => e.type === "refunded")).toHaveLength(1);
  });
});

describe("linkOrderToAccountIfExists (7.1)", () => {
  it("vincula o pedido quando já existe conta com o mesmo e-mail", async () => {
    const order = await createOrder();
    const [account] = await testDb
      .insert(schema.users)
      .values({ name: "Mariana", email: CUSTOMER.email })
      .returning();

    await linkOrderToAccountIfExists(order.id, CUSTOMER.email);

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.userId).toBe(account.id);
  });

  it("mantém userId nulo (guest) quando não há conta com o e-mail", async () => {
    const order = await createOrder();
    await linkOrderToAccountIfExists(order.id, "ninguem@example.com");

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.userId).toBeNull();
  });
});
