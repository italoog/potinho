import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

const { adminEmails, provisionNewUser } = await import("./account-provisioning");

async function createUser(email: string) {
  const [user] = await testDb.insert(schema.users).values({ name: "Teste", email }).returning();
  return user;
}

async function createGuestOrder(email: string) {
  const [order] = await testDb
    .insert(schema.orders)
    .values({
      totalAmount: 1000,
      customer: {
        name: "Guest",
        email,
        phone: "11999990000",
        address: {
          street: "A",
          number: "1",
          neighborhood: "B",
          city: "C",
          state: "SP",
          zip: "01234-567",
        },
      },
    })
    .returning();
  return order;
}

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

beforeEach(() => {
  delete process.env.ADMIN_EMAILS;
});

describe("adminEmails", () => {
  it("faz parse da lista separada por vírgula, normalizando espaço e caixa", () => {
    process.env.ADMIN_EMAILS = " Dono@Loja.com , outro@x.com ";
    expect(adminEmails()).toEqual(["dono@loja.com", "outro@x.com"]);
  });

  it("retorna lista vazia quando a env não está definida", () => {
    expect(adminEmails()).toEqual([]);
  });
});

describe("provisionNewUser", () => {
  it("promove a admin quando o e-mail está em ADMIN_EMAILS", async () => {
    process.env.ADMIN_EMAILS = "admin@potinho.com.br";
    const user = await createUser("admin@potinho.com.br");

    await provisionNewUser(user.id, user.email);

    const [after] = await testDb.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(after.role).toBe("admin");
  });

  it("mantém role customer quando o e-mail não está na lista", async () => {
    const user = await createUser("cliente@example.com");
    await provisionNewUser(user.id, user.email);

    const [after] = await testDb.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(after.role).toBe("customer");
  });

  it("vincula pedidos guest com o mesmo e-mail (backfill)", async () => {
    const order = await createGuestOrder("recorrente@example.com");
    const user = await createUser("recorrente@example.com");

    await provisionNewUser(user.id, user.email);

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.userId).toBe(user.id);
  });

  it("não sobrescreve pedidos já vinculados a outra conta", async () => {
    const otherUser = await createUser("outro-dono@example.com");
    const order = await createGuestOrder("compartilhado@example.com");
    await testDb.update(schema.orders).set({ userId: otherUser.id }).where(eq(schema.orders.id, order.id));

    const user = await createUser("compartilhado@example.com");
    await provisionNewUser(user.id, user.email);

    const [after] = await testDb.select().from(schema.orders).where(eq(schema.orders.id, order.id));
    expect(after.userId).toBe(otherUser.id);
  });
});
