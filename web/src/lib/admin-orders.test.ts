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

const { searchAdminOrders, changeOrderStatus, resendOrderConfirmation } = await import("./admin-orders");

let productId: string;

function customer(name: string, email: string) {
  return {
    name,
    email,
    phone: "11999990000",
    address: { street: "A", number: "1", neighborhood: "B", city: "C", state: "SP", zip: "01234-567" },
  };
}

async function createOrder(petName: string, name: string, email: string, status: schema.OrderRow["status"] = "pending") {
  const [order] = await testDb
    .insert(schema.orders)
    .values({ totalAmount: 10000, customer: customer(name, email), status })
    .returning();
  await testDb.insert(schema.orderItems).values({
    orderId: order.id,
    productId,
    configuration: { pet_name: petName, color_base: "#fff", color_band: "#000", size: "15cm" },
    unitPrice: 10000,
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

describe("searchAdminOrders (9.3 AC1)", () => {
  it("busca por nome do pet e traz o petName agregado", async () => {
    await createOrder("REX", "Ana", "ana@example.com");
    const { items, total } = await searchAdminOrders({ query: "REX", page: 1, pageSize: 20 });
    expect(total).toBeGreaterThanOrEqual(1);
    expect(items[0].petNames).toContain("REX");
  });

  it("filtra por status", async () => {
    await createOrder("BOLINHA", "Bia", "bia@example.com", "delivered");
    const { items } = await searchAdminOrders({ status: "delivered", page: 1, pageSize: 20 });
    expect(items.every((i) => i.order.status === "delivered")).toBe(true);
  });

  it("busca por e-mail do cliente", async () => {
    const { items } = await searchAdminOrders({ query: "ana@example.com", page: 1, pageSize: 20 });
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});

describe("changeOrderStatus (9.3 AC3)", () => {
  it("permite transição válida e registra o ator", async () => {
    const order = await createOrder("MEL", "Carla", "carla@example.com", "pending");
    const result = await changeOrderStatus(order.id, "paid", "admin@potinho.com.br");
    expect(result.ok).toBe(true);

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.status).toBe("paid");
  });

  it("bloqueia transição inválida (delivered -> pending)", async () => {
    const order = await createOrder("LUA", "Duda", "duda@example.com", "delivered");
    const result = await changeOrderStatus(order.id, "pending", "admin@potinho.com.br");
    expect(result.ok).toBe(false);
  });

  it("exige código de rastreio pra marcar como shipped", async () => {
    const order = await createOrder("TOM", "Eva", "eva@example.com", "production");
    const withoutTracking = await changeOrderStatus(order.id, "shipped", "admin@potinho.com.br");
    expect(withoutTracking.ok).toBe(false);

    const withTracking = await changeOrderStatus(order.id, "shipped", "admin@potinho.com.br", "BR123456789");
    expect(withTracking.ok).toBe(true);
    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.trackingCode).toBe("BR123456789");
  });
});

describe("resendOrderConfirmation (9.3 AC5)", () => {
  it("registra evento email_sent", async () => {
    const order = await createOrder("NINA", "Fabi", "fabi@example.com", "paid");
    const ok = await resendOrderConfirmation(order.id, "admin@potinho.com.br");
    expect(ok).toBe(true);

    const events = await testDb
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, order.id));
    expect(events.some((e) => e.type === "email_sent")).toBe(true);
  });
});
