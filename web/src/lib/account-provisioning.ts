import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, orders, users } from "@/db";

/** ADMIN_EMAILS (env, lista separada por vírgula) — quem promove a admin no primeiro login (A2). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Roda no primeiro login de um e-mail (databaseHooks.user.create.after): promove a admin e vincula pedidos guest antigos. */
export async function provisionNewUser(userId: string, email: string): Promise<void> {
  const normalized = email.toLowerCase();
  const db = await getDb();

  if (adminEmails().includes(normalized)) {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
  }

  await db
    .update(orders)
    .set({ userId })
    .where(and(isNull(orders.userId), sql`lower(${orders.customer}->>'email') = ${normalized}`));
}
