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

const { POST } = await import("./route");

function req(body: unknown): Request {
  return new Request("http://localhost/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

describe("POST /api/notify", () => {
  it("registra o e-mail para a cor esgotada", async () => {
    const res = await POST(req({ email: "cliente@example.com", colorId: "#708238" }));
    expect(res.status).toBe(200);

    const rows = await testDb.select().from(schema.notifyRequests);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("cliente@example.com");
  });

  it("é idempotente para o mesmo e-mail + cor (upsert sem duplicar)", async () => {
    await POST(req({ email: "outro@example.com", colorId: "#708238" }));
    await POST(req({ email: "outro@example.com", colorId: "#708238" }));

    const all = await testDb.select().from(schema.notifyRequests);
    expect(all.filter((r) => r.email === "outro@example.com")).toHaveLength(1);
  });

  it("rejeita e-mail inválido", async () => {
    const res = await POST(req({ email: "not-an-email", colorId: "#123" }));
    expect(res.status).toBe(400);
  });
});
