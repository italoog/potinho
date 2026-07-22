import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

const createCartOrder = vi.fn();
const checkoutOrder = vi.fn();
const printLabel = vi.fn();
const cancelOrder = vi.fn();
vi.mock("./shipping-label", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./shipping-label")>();
  return { ...actual, createCartOrder, checkoutOrder, printLabel, cancelOrder };
});

const findMercadoPagoPaymentByOrderId = vi.fn();
vi.mock("./payments/mercadopago", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./payments/mercadopago")>();
  return { ...actual, findMercadoPagoPaymentByOrderId };
});

const {
  searchAdminOrders,
  changeOrderStatus,
  resendOrderConfirmation,
  markOrderPaidByAdmin,
  reconcilePaymentByAdmin,
  quoteShippingLabel,
  purchaseShippingLabel,
  cancelShippingLabel,
} = await import("./admin-orders");

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

describe("markOrderPaidByAdmin (9.4)", () => {
  it("marca como pago manualmente, com providerPaymentId sintético", async () => {
    const order = await createOrder("BENTO", "Gil", "gil@example.com", "pending");
    await markOrderPaidByAdmin(order.id, "admin@potinho.com.br");

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.status).toBe("paid");
    expect(after.providerPaymentId).toMatch(/^manual_/);
  });
});

describe("reconcilePaymentByAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("erro quando o pedido não existe", async () => {
    const result = await reconcilePaymentByAdmin(crypto.randomUUID(), "admin@potinho.com.br");
    expect(result).toEqual({ ok: false, error: "Pedido não encontrado" });
  });

  it("recusa provider diferente de mercadopago", async () => {
    const order = await createOrder("IRIS", "Hana", "hana@example.com", "pending");
    await testDb.update(schema.orders).set({ paymentProvider: "stripe" }).where(eq(schema.orders.id, order.id));
    const result = await reconcilePaymentByAdmin(order.id, "admin@potinho.com.br");
    expect(result.ok).toBe(false);
  });

  it("marca como pago quando o MP confirma aprovação", async () => {
    const order = await createOrder("JADE", "Ivo", "ivo@example.com", "pending");
    await testDb.update(schema.orders).set({ paymentProvider: "mercadopago" }).where(eq(schema.orders.id, order.id));
    findMercadoPagoPaymentByOrderId.mockResolvedValue({ status: "approved", paymentId: "mp-999" });

    const result = await reconcilePaymentByAdmin(order.id, "admin@potinho.com.br");
    expect(result).toEqual({ ok: true, status: "approved" });
    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.status).toBe("paid");
  });

  it("erro quando não há pagamento no MP pra esse pedido", async () => {
    const order = await createOrder("KIRA", "Joel", "joel@example.com", "pending");
    await testDb.update(schema.orders).set({ paymentProvider: "mercadopago" }).where(eq(schema.orders.id, order.id));
    findMercadoPagoPaymentByOrderId.mockResolvedValue(null);

    const result = await reconcilePaymentByAdmin(order.id, "admin@potinho.com.br");
    expect(result.ok).toBe(false);
  });
});

describe("etiqueta de envio (quote -> purchase -> cancel)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("quoteShippingLabel: erro quando o pedido não existe", async () => {
    const result = await quoteShippingLabel(crypto.randomUUID(), {
      recipientDocument: "12345678901",
      service: "sedex",
      package: { widthCm: 20, heightCm: 15, lengthCm: 20, weightKg: 1 },
      declaredValueCents: 10000,
    });
    expect(result).toEqual({ ok: false, error: "Pedido não encontrado" });
  });

  it("quoteShippingLabel: cota e persiste recipientDocument + shippingOrderId", async () => {
    const order = await createOrder("LUNA", "Kaká", "kaka@example.com", "pending");
    createCartOrder.mockResolvedValue({ superfreteOrderId: "sf-order-1", priceCents: 2350 });

    const result = await quoteShippingLabel(order.id, {
      recipientDocument: "12345678901",
      service: "sedex",
      package: { widthCm: 20, heightCm: 15, lengthCm: 20, weightKg: 1 },
      declaredValueCents: 14900,
    });
    expect(result).toEqual({ ok: true, priceCents: 2350 });

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.recipientDocument).toBe("12345678901");
    expect(after.shippingOrderId).toBe("sf-order-1");
  });

  it("quoteShippingLabel: erro controlado quando a SuperFrete falha", async () => {
    const order = await createOrder("MEG", "Lia", "lia@example.com", "pending");
    createCartOrder.mockRejectedValue(new Error("CEP inválido"));

    const result = await quoteShippingLabel(order.id, {
      recipientDocument: "12345678901",
      service: "pac",
      package: { widthCm: 20, heightCm: 15, lengthCm: 20, weightKg: 1 },
      declaredValueCents: 9900,
    });
    expect(result).toEqual({ ok: false, error: "CEP inválido" });
  });

  it("purchaseShippingLabel: exige cotação prévia (sem shippingOrderId)", async () => {
    const order = await createOrder("NOAH", "Mia", "mia@example.com", "pending");
    const result = await purchaseShippingLabel(order.id, "admin@potinho.com.br");
    expect(result).toEqual({ ok: false, error: "Cote a etiqueta antes de comprar" });
  });

  it("purchaseShippingLabel: compra, preenche rastreio/label e registra evento", async () => {
    const order = await createOrder("OLIVER", "Nara", "nara@example.com", "pending");
    createCartOrder.mockResolvedValue({ superfreteOrderId: "sf-order-2", priceCents: 2000 });
    await quoteShippingLabel(order.id, {
      recipientDocument: "12345678901",
      service: "sedex",
      package: { widthCm: 20, heightCm: 15, lengthCm: 20, weightKg: 1 },
      declaredValueCents: 14900,
    });

    checkoutOrder.mockResolvedValue({ trackingCode: "BR999888777", priceCents: 2000 });
    printLabel.mockResolvedValue("https://superfrete.example/label/sf-order-2.pdf");

    const result = await purchaseShippingLabel(order.id, "admin@potinho.com.br");
    expect(result).toEqual({ ok: true, trackingCode: "BR999888777", labelUrl: "https://superfrete.example/label/sf-order-2.pdf" });

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.trackingCode).toBe("BR999888777");
    expect(after.shippingLabelUrl).toBe("https://superfrete.example/label/sf-order-2.pdf");
    expect(after.shippingLabelPriceCents).toBe(2000);

    const events = await testDb.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, order.id));
    expect(events.some((e) => e.type === "label_created")).toBe(true);
  });

  it("cancelShippingLabel: erro quando não há etiqueta gerada", async () => {
    const order = await createOrder("PIPPA", "Otto", "otto@example.com", "pending");
    const result = await cancelShippingLabel(order.id, "admin@potinho.com.br");
    expect(result).toEqual({ ok: false, error: "Esse pedido não tem etiqueta gerada" });
  });

  it("cancelShippingLabel: cancela e limpa os campos da etiqueta", async () => {
    const order = await createOrder("QUINN", "Pati", "pati@example.com", "pending");
    createCartOrder.mockResolvedValue({ superfreteOrderId: "sf-order-3", priceCents: 2000 });
    await quoteShippingLabel(order.id, {
      recipientDocument: "12345678901",
      service: "sedex",
      package: { widthCm: 20, heightCm: 15, lengthCm: 20, weightKg: 1 },
      declaredValueCents: 14900,
    });
    checkoutOrder.mockResolvedValue({ trackingCode: "BR111", priceCents: 2000 });
    printLabel.mockResolvedValue("https://superfrete.example/label/sf-order-3.pdf");
    await purchaseShippingLabel(order.id, "admin@potinho.com.br");

    cancelOrder.mockResolvedValue(undefined);
    const result = await cancelShippingLabel(order.id, "admin@potinho.com.br");
    expect(result).toEqual({ ok: true });

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.shippingOrderId).toBeNull();
    expect(after.shippingLabelUrl).toBeNull();
    expect(after.shippingLabelPriceCents).toBeNull();
  });

  it("cancelShippingLabel: erro controlado quando a SuperFrete recusa o cancelamento", async () => {
    const order = await createOrder("ROXY", "Quel", "quel@example.com", "pending");
    createCartOrder.mockResolvedValue({ superfreteOrderId: "sf-order-4", priceCents: 2000 });
    await quoteShippingLabel(order.id, {
      recipientDocument: "12345678901",
      service: "sedex",
      package: { widthCm: 20, heightCm: 15, lengthCm: 20, weightKg: 1 },
      declaredValueCents: 14900,
    });
    cancelOrder.mockRejectedValue(new Error("Etiqueta já foi impressa, não pode cancelar"));

    const result = await cancelShippingLabel(order.id, "admin@potinho.com.br");
    expect(result).toEqual({ ok: false, error: "Etiqueta já foi impressa, não pode cancelar" });
  });
});
