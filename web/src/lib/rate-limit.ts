/**
 * Rate limit durável (A7, PLANO-EXPANSAO-LOJA §3, P2-3): janela deslizante por chave (IP+rota),
 * persistida em Postgres — sobrevive a múltiplas instâncias serverless (o Map em memória não).
 */

import { and, asc, eq, lt } from "drizzle-orm";
import { getDb, rateLimitHits } from "@/db";

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/** `limit` requisições por `windowMs` para a mesma `key`. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const db = await getDb();
  const windowStart = new Date(Date.now() - windowMs);

  return db.transaction(async (tx) => {
    await tx.delete(rateLimitHits).where(and(eq(rateLimitHits.key, key), lt(rateLimitHits.createdAt, windowStart)));

    const hits = await tx
      .select({ createdAt: rateLimitHits.createdAt })
      .from(rateLimitHits)
      .where(eq(rateLimitHits.key, key))
      .orderBy(asc(rateLimitHits.createdAt));

    if (hits.length >= limit) {
      const retryAfterSeconds = Math.ceil((windowMs - (Date.now() - hits[0].createdAt.getTime())) / 1000);
      return { ok: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
    }

    await tx.insert(rateLimitHits).values({ key });
    return { ok: true, retryAfterSeconds: 0 };
  });
}

/** IP do cliente a partir dos headers padrão de proxy (Vercel/Fly/etc.), com fallback fixo em dev. */
export function clientIp(request: Request): string {
  const headers = request.headers;
  // Vercel injeta este header e sobrescreve spoof do cliente (P2-4).
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Último hop = o que o proxy confiável anexou; o primeiro é forjável pelo cliente.
    const parts = forwarded.split(",").map((s) => s.trim());
    return parts[parts.length - 1] || "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Muitas tentativas — aguarde um instante e tente novamente" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
