import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, notifyRequests } from "@/db";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/** Captura de e-mail para "avise-me" de cor esgotada (6.4 AC1). */

const bodySchema = z.object({
  email: z.string().email(),
  colorId: z.string().min(1),
});

export async function POST(request: Request) {
  const limit = rateLimit(`notify:${clientIp(request)}`, 10, 5 * 60_000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds);

  try {
    const body = bodySchema.parse(await request.json());
    const db = await getDb();
    await db
      .insert(notifyRequests)
      .values({ email: body.email.toLowerCase(), colorId: body.colorId })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notify falhou:", err);
    const message = err instanceof z.ZodError ? "Dados inválidos" : "Não foi possível registrar seu e-mail";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
