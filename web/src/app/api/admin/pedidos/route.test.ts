import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { comedouroPet } from "@/db/seed-data";

/**
 * Criação manual de pedido pelo admin (9.4): mesmo recálculo de preço do checkout público,
 * dois desfechos — marcar pago direto ou gerar link de pagamento.
 */

let testDb: ReturnType<typeof drizzle<typeof schema>>;
let productId: string;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const createPaymentSession = vi.fn();
vi.mock("@/lib/payments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments")>();
  return { ...actual, createPaymentSession };
});

const { POST } = await import("./route");

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

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ productId, configuration: { pet_name: "THOR", size: "15cm", color_base: "#3D6EB5", color_band: "#3D6EB5" } }],
    customer: CUSTOMER,
    outcome: "paid",
    ...overrides,
  };
}

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  const [product] = await testDb.insert(schema.products).values(comedouroPet).returning();
  productId = product.id;
});

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
});

describe("POST /api/admin/pedidos", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(req(validBody()));
    expect(res.status).toBe(404);
  });

  it("rejeita body inválido (400)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(req({ ...validBody(), items: [] }));
    expect(res.status).toBe(400);
  });

  it("outcome=paid: cria o pedido já marcado como pago", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(req(validBody({ outcome: "paid" })));
    expect(res.status).toBe(200);
    const { orderId } = await res.json();

    const [order] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    expect(order.status).toBe("paid");
  });

  it("outcome=link sem gateway configurado: responde 501", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(req(validBody({ outcome: "link" })));
    expect(res.status).toBe(501);
  });

  it("outcome=link com gateway configurado: devolve o link de pagamento", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    createPaymentSession.mockResolvedValue({
      provider: "mercadopago",
      providerPaymentId: "mp-session-1",
      redirectUrl: "https://mp.example.com/checkout/mp-session-1",
    });
    const res = await POST(req(validBody({ outcome: "link" })));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.paymentLink).toBe("https://mp.example.com/checkout/mp-session-1");
  });

  it("produto inexistente/despublicado responde 404", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(
      req(validBody({ items: [{ productId: crypto.randomUUID(), configuration: {} }] })),
    );
    expect(res.status).toBe(404);
  });

  it("respeita shippingCentsOverride (admin digita o frete manualmente)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(req(validBody({ shippingCentsOverride: 3000 })));
    expect(res.status).toBe(200);
    const { orderId } = await res.json();
    const [order] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    expect(order.shippingAmount).toBe(3000);
  });
});
