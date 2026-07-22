import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { comedouroPet } from "@/db/seed-data";

/** Cotação de frete no checkout (6.1 AC3) — sem SUPERFRETE_TOKEN cai direto na tabela fixa, sem rede. */

let testDb: ReturnType<typeof drizzle<typeof schema>>;
let productId: string;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const { POST } = await import("./route");

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  const [product] = await testDb.insert(schema.products).values(comedouroPet).returning();
  productId = product.id;
});

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SUPERFRETE_TOKEN;
  delete process.env.SHIPPING_TABLE_JSON;
});

function req(body: unknown, ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`): Request {
  return new Request("http://localhost/api/shipping/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/shipping/quote", () => {
  it("rejeita body inválido (CEP fora do formato)", async () => {
    const res = await POST(req({ cep: "abc", uf: "SP", items: [{ productId, size: "15cm" }] }));
    expect(res.status).toBe(400);
  });

  it("cota pela tabela fixa por UF quando SuperFrete não está configurado", async () => {
    process.env.SHIPPING_TABLE_JSON = JSON.stringify({ SP: 1500, "*": 2500 });
    const res = await POST(req({ cep: "01310-100", uf: "SP", items: [{ productId, size: "15cm" }] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ shippingCents: 1500 });
  });

  it("cai no fallback '*' pra UF sem entrada específica", async () => {
    process.env.SHIPPING_TABLE_JSON = JSON.stringify({ SP: 1500, "*": 2500 });
    const res = await POST(req({ cep: "60000-000", uf: "CE", items: [{ productId, size: "15cm" }] }));
    expect(await res.json()).toEqual({ shippingCents: 2500 });
  });

  it("ignora item com productId inexistente (sem pacote, não derruba a cotação)", async () => {
    const res = await POST(req({ cep: "01310-100", uf: "SP", items: [{ productId: crypto.randomUUID(), size: "15cm" }] }));
    expect(res.status).toBe(200);
  });

  it("aplica rate limit (20 req / 5 min por IP)", async () => {
    const ip = "198.51.100.20";
    let last = new Response();
    for (let i = 0; i < 21; i++) {
      last = await POST(req({ cep: "01310-100", uf: "SP", items: [{ productId, size: "15cm" }] }, ip));
    }
    expect(last.status).toBe(429);
  });
});
