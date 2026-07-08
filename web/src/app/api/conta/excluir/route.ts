import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb, orders, sessions, users } from "@/db";

/**
 * Exclusão de conta (7.3 AC4, LGPD): anonimiza `users` (não apaga a linha — o
 * jsonb `customer` de cada pedido permanece por obrigação fiscal) e desvincula
 * os pedidos (userId = NULL, voltam a ser consultáveis só pelo link público).
 * Revoga todas as sessões pra encerrar o acesso imediatamente.
 */
export async function POST(request: Request) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const db = await getDb();
  const userId = session.user.id;

  await db
    .update(users)
    .set({ name: "conta encerrada", email: `conta-encerrada-${userId}@potinho.invalid`, emailVerified: false })
    .where(eq(users.id, userId));
  await db.update(orders).set({ userId: null }).where(eq(orders.userId, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));

  return NextResponse.json({ ok: true });
}
