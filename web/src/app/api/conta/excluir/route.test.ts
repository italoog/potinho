import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

/** Exclusão de conta (7.3 AC4, LGPD): anonimiza o usuário, desvincula pedidos, revoga sessões. */

let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuth: async () => ({ api: { getSession } }) }));

const { POST } = await import("./route");

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

beforeEach(() => vi.clearAllMocks());

function req(): Request {
  return new Request("http://localhost/api/conta/excluir", { method: "POST" });
}

describe("POST /api/conta/excluir", () => {
  it("responde 401 sem sessão", async () => {
    getSession.mockResolvedValue(null);
    const res = await POST(req());
    expect(res.status).toBe(401);
  });

  it("anonimiza o usuário, desvincula pedidos e revoga sessões", async () => {
    const [user] = await testDb.insert(schema.users).values({ name: "Maria", email: "maria@example.com" }).returning();
    const [order] = await testDb
      .insert(schema.orders)
      .values({
        totalAmount: 9900,
        userId: user.id,
        customer: {
          name: "Maria",
          email: "maria@example.com",
          phone: "11999990000",
          address: { street: "A", number: "1", neighborhood: "B", city: "C", state: "SP", zip: "01234-567" },
        },
      })
      .returning();
    await testDb.insert(schema.sessions).values({
      userId: user.id,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    getSession.mockResolvedValue({ user: { id: user.id } });
    const res = await POST(req());
    expect(res.status).toBe(200);

    const [afterUser] = await testDb.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(afterUser.name).toBe("conta encerrada");
    expect(afterUser.email).toBe(`conta-encerrada-${user.id}@potinho.invalid`);
    expect(afterUser.emailVerified).toBe(false);

    const [afterOrder] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(afterOrder.userId).toBeNull();
    // dado fiscal do pedido é preservado — só o vínculo com a conta é removido
    expect((afterOrder.customer as { email: string }).email).toBe("maria@example.com");

    const remainingSessions = await testDb.select().from(schema.sessions).where(eq(schema.sessions.userId, user.id));
    expect(remainingSessions).toHaveLength(0);
  });
});
