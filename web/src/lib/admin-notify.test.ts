import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const { getPendingNotifyRequests, notifyAllForColor } = await import("./admin-notify");

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

describe("getPendingNotifyRequests / notifyAllForColor (9.5 AC3)", () => {
  it("agrupa pedidos pendentes por cor", async () => {
    await testDb.insert(schema.notifyRequests).values([
      { email: "a@example.com", colorId: "#708238" },
      { email: "b@example.com", colorId: "#708238" },
      { email: "c@example.com", colorId: "#1A1A1A" },
    ]);

    const groups = await getPendingNotifyRequests();
    const olive = groups.find((g) => g.colorId === "#708238");
    expect(olive?.emails.sort()).toEqual(["a@example.com", "b@example.com"]);
  });

  it("avisa todo mundo pendente de uma cor e marca como notificado (não notifica de novo)", async () => {
    const sentFirst = await notifyAllForColor("#708238", "Verde-oliva");
    expect(sentFirst).toBe(2);

    const rows = await testDb
      .select()
      .from(schema.notifyRequests)
      .where(eq(schema.notifyRequests.colorId, "#708238"));
    expect(rows.every((r) => r.notifiedAt !== null)).toBe(true);

    // segunda chamada não reenvia pra quem já foi notificado
    const sentSecond = await notifyAllForColor("#708238", "Verde-oliva");
    expect(sentSecond).toBe(0);
  });

  it("não afeta pedidos de outra cor", async () => {
    const groups = await getPendingNotifyRequests();
    expect(groups.find((g) => g.colorId === "#1A1A1A")?.emails).toContain("c@example.com");
    expect(groups.find((g) => g.colorId === "#708238")).toBeUndefined();
  });
});
