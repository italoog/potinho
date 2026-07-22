import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { comedouroPet } from "@/db/seed-data";

/**
 * Checkout (P-01..P-03): cria pedido + sessão de pagamento. O preço SEMPRE recalculado no
 * servidor (NFR §6) já é coberto em pricing.test.ts/order-creation — aqui o foco é a rota:
 * validação de body, roteamento pro gateway, ALLOW_DEV_CHECKOUT, e erros repassados ao cliente.
 */

let testDb: ReturnType<typeof drizzle<typeof schema>>;
let productId: string;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

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

function req(body: unknown, ip = `192.0.2.${Math.floor(Math.random() * 250) + 1}`): Request {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ productId, configuration: { pet_name: "THOR", size: "15cm", color_base: "#3D6EB5", color_band: "#3D6EB5" } }],
    customer: CUSTOMER,
    consentLgpd: true,
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
  delete process.env.ALLOW_DEV_CHECKOUT;
  vi.stubEnv("NODE_ENV", "test");
});

describe("POST /api/checkout", () => {
  it("rejeita body inválido (400)", async () => {
    const res = await POST(req({ items: [], customer: CUSTOMER, consentLgpd: true }));
    expect(res.status).toBe(400);
  });

  it("rejeita sem consentimento LGPD", async () => {
    const res = await POST(req(validBody({ consentLgpd: false })));
    expect(res.status).toBe(400);
  });

  it("sem gateway configurado e sem ALLOW_DEV_CHECKOUT: cria pedido pending e devolve a página de status", async () => {
    const res = await POST(req(validBody()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toMatch(/\/pedido\/.+/);

    const token = json.url.split("/pedido/")[1];
    const [order] = await testDb.select().from(schema.orders).where(eq(schema.orders.publicToken, token));
    expect(order.status).toBe("pending");
  });

  it("com ALLOW_DEV_CHECKOUT=true fora de produção: simula pagamento aprovado", async () => {
    process.env.ALLOW_DEV_CHECKOUT = "true";
    const res = await POST(req(validBody()));
    const { url } = await res.json();
    const token = url.split("/pedido/")[1];
    const [order] = await testDb.select().from(schema.orders).where(eq(schema.orders.publicToken, token));
    expect(order.status).toBe("paid");
  });

  it("ALLOW_DEV_CHECKOUT nunca simula pagamento em produção (S4)", async () => {
    process.env.ALLOW_DEV_CHECKOUT = "true";
    vi.stubEnv("NODE_ENV", "production");
    const res = await POST(req(validBody()));
    const { url } = await res.json();
    const token = url.split("/pedido/")[1];
    const [order] = await testDb.select().from(schema.orders).where(eq(schema.orders.publicToken, token));
    expect(order.status).toBe("pending");
  });

  it("com gateway configurado: cria a sessão de pagamento e redireciona pra ela", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    createPaymentSession.mockResolvedValue({
      provider: "mercadopago",
      providerPaymentId: "mp-session-1",
      redirectUrl: "https://mp.example.com/checkout/mp-session-1",
    });
    const res = await POST(req(validBody()));
    const json = await res.json();
    expect(json.url).toBe("https://mp.example.com/checkout/mp-session-1");
    expect(createPaymentSession).toHaveBeenCalledOnce();
  });

  it("produto inexistente/despublicado responde 404", async () => {
    const res = await POST(req(validBody({ items: [{ productId: crypto.randomUUID(), configuration: {} }] })));
    expect(res.status).toBe(404);
  });

  it("cupom inválido é repassado ao cliente (mensagem específica, não a genérica)", async () => {
    const res = await POST(req(validBody({ couponCode: "NAO-EXISTE" })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Cupom inválido");
  });

  it("aplica rate limit (10 req / 5 min por IP)", async () => {
    const ip = "198.51.100.7";
    let last = new Response();
    for (let i = 0; i < 11; i++) {
      last = await POST(req(validBody(), ip));
    }
    expect(last.status).toBe(429);
  });
});
