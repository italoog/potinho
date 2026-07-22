import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

/** Login por magic link (7.2 AC1/AC2): sem senha, rate limit por e-mail, resposta idêntica sempre (sem enumeração). */

const signInMagicLink = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuth: async () => ({ api: { signInMagicLink } }) }));

let testDb: ReturnType<typeof drizzle<typeof schema>>;

// rateLimit (P2-3) bate no Postgres — usa PGlite em memória aqui em vez do fallback dev
// persistido em disco, que é lento demais pra caber no timeout padrão do teste.
vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const { POST } = await import("./route");

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

function req(email: string): Request {
  return new Request("http://localhost/api/conta/entrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/conta/entrar", () => {
  it("aceita e-mail válido e responde ok", async () => {
    signInMagicLink.mockResolvedValue(undefined);
    const email = `cliente-${crypto.randomUUID()}@example.com`;
    const res = await POST(req(email));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(signInMagicLink).toHaveBeenCalledWith(expect.objectContaining({ body: { email, callbackURL: "/conta" } }));
  });

  it("responde ok mesmo com e-mail inválido — nunca revela se a conta existe", async () => {
    const res = await POST(req("nao-e-email"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(signInMagicLink).not.toHaveBeenCalled();
  });

  it("resposta idêntica quando o envio do link falha internamente", async () => {
    signInMagicLink.mockRejectedValue(new Error("Resend fora do ar"));
    const res = await POST(req(`falha-${crypto.randomUUID()}@example.com`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("aplica rate limit de 3 por e-mail/hora (7.2 AC2)", async () => {
    signInMagicLink.mockResolvedValue(undefined);
    const email = `rate-limit-${crypto.randomUUID()}@example.com`;
    await POST(req(email));
    await POST(req(email));
    await POST(req(email));
    const fourth = await POST(req(email));
    expect(fourth.status).toBe(429);
  });

  it("rate limit é por e-mail, não por IP (chaves diferentes não colidem)", async () => {
    signInMagicLink.mockResolvedValue(undefined);
    const a = await POST(req(`a-${crypto.randomUUID()}@example.com`));
    const b = await POST(req(`b-${crypto.randomUUID()}@example.com`));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });
});
