import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

/** Endpoint só de e2e (10.1) — dupla trava: nunca em produção, e só com ALLOW_E2E_ENDPOINTS=true. */

let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const { GET } = await import("./route");

function req(email?: string): Request {
  const url = new URL("http://localhost/api/test/last-verification");
  if (email) url.searchParams.set("email", email);
  return new Request(url);
}

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env.ALLOW_E2E_ENDPOINTS;
});

describe("GET /api/test/last-verification", () => {
  it("404 em produção, mesmo com a flag ligada", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.ALLOW_E2E_ENDPOINTS = "true";
    const res = await GET(req("cliente@example.com"));
    expect(res.status).toBe(404);
  });

  it("404 fora de produção sem a flag", async () => {
    const res = await GET(req("cliente@example.com"));
    expect(res.status).toBe(404);
  });

  it("400 sem e-mail na query", async () => {
    process.env.ALLOW_E2E_ENDPOINTS = "true";
    const res = await GET(req());
    expect(res.status).toBe(400);
  });

  it("404 quando não há link salvo pro e-mail", async () => {
    process.env.ALLOW_E2E_ENDPOINTS = "true";
    const res = await GET(req("ninguem@example.com"));
    expect(res.status).toBe(404);
  });

  it("devolve o token do link mais recente salvo pro e-mail", async () => {
    process.env.ALLOW_E2E_ENDPOINTS = "true";
    await testDb.insert(schema.verifications).values({
      identifier: "token-antigo",
      value: JSON.stringify({ email: "cliente@example.com" }),
      expiresAt: new Date(Date.now() + 3600_000),
      createdAt: new Date(Date.now() - 60_000),
    });
    await testDb.insert(schema.verifications).values({
      identifier: "token-novo",
      value: JSON.stringify({ email: "cliente@example.com" }),
      expiresAt: new Date(Date.now() + 3600_000),
      createdAt: new Date(),
    });

    const res = await GET(req("cliente@example.com"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ token: "token-novo" });
  });
});
