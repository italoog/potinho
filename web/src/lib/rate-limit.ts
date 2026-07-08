/**
 * Rate limit em memória (A7, PLANO-EXPANSAO-LOJA §3): janela deslizante por chave (IP+rota).
 * ponytail: single-node — quebra em deploy serverless multi-instância (R3); upgrade path = Upstash/Redis.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/** `limit` requisições por `windowMs` para a mesma `key`. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const retryAfterSeconds = Math.ceil((windowMs - (now - bucket.hits[0])) / 1000);
    buckets.set(key, bucket);
    return { ok: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, retryAfterSeconds: 0 };
}

/** IP do cliente a partir dos headers padrão de proxy (Vercel/Fly/etc.), com fallback fixo em dev. */
export function clientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Muitas tentativas — aguarde um instante e tente novamente" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
