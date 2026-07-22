import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const { clientIp, rateLimit } = await import("./rate-limit");

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

describe("rateLimit (P2-3 — durável via Postgres)", () => {
  it("permite até o limite e bloqueia a partir daí, na mesma janela", async () => {
    const key = `test-${crypto.randomUUID()}`;
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    const blocked = await rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("chaves diferentes têm buckets independentes", async () => {
    const a = `test-${crypto.randomUUID()}`;
    const b = `test-${crypto.randomUUID()}`;
    await rateLimit(a, 1, 60_000);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true);
  });

  it("libera novamente após a janela expirar", async () => {
    const key = `test-${crypto.randomUUID()}`;
    expect((await rateLimit(key, 1, 10)).ok).toBe(true);
    expect((await rateLimit(key, 1, 10)).ok).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect((await rateLimit(key, 1, 10)).ok).toBe(true);
  });
});

describe("clientIp (P2-4)", () => {
  it("prioriza x-vercel-forwarded-for sobre x-forwarded-for spoofável", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 10.0.0.1",
        "x-vercel-forwarded-for": "9.9.9.9",
      },
    });
    expect(clientIp(req)).toBe("9.9.9.9");
  });

  it("sem header da Vercel, usa o último hop de x-forwarded-for (não o primeiro, forjável)", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
    });
    expect(clientIp(req)).toBe("10.0.0.1");
  });

  it("cai pra x-real-ip ou 'unknown' sem nenhum header de proxy", () => {
    expect(clientIp(new Request("http://localhost", { headers: { "x-real-ip": "5.5.5.5" } }))).toBe("5.5.5.5");
    expect(clientIp(new Request("http://localhost"))).toBe("unknown");
  });
});
