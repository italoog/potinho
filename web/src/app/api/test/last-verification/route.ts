import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { getDb, verifications } from "@/db";

/**
 * Só pra e2e (10.1): expõe o token do último magic link de um e-mail, pra logar
 * sem depender de e-mail real chegando. Nunca funciona em produção — mesmo
 * padrão de guarda do ALLOW_DEV_CHECKOUT (6.3 S4).
 */
export async function GET(request: Request) {
  // Só habilitado com flag explícita E fora de produção (P2-2). Dupla trava.
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_E2E_ENDPOINTS !== "true") {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const email = new URL(request.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email obrigatório" }, { status: 400 });

  const db = await getDb();
  const [row] = await db
    .select()
    .from(verifications)
    .where(sql`${verifications.value}::jsonb->>'email' = ${email}`)
    .orderBy(desc(verifications.createdAt))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Nenhum link encontrado" }, { status: 404 });
  return NextResponse.json({ token: row.identifier });
}
