import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Login por magic link (7.2 AC2): máx. 3 links por e-mail/hora — chave própria
 * (não por IP), pra não travar clientes na mesma rede. A resposta é sempre
 * idêntica, exista ou não conta com o e-mail (o magicLink do Better Auth já
 * não diferencia — sem enumeração).
 */

const bodySchema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const { email } = bodySchema.parse(await request.json());

    const limit = await rateLimit(`conta-entrar:${email.toLowerCase()}`, 3, 60 * 60_000);
    if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds);

    const auth = await getAuth();
    await auth.api.signInMagicLink({
      body: { email, callbackURL: "/conta" },
      headers: request.headers,
    });
  } catch (err) {
    console.error("Login por magic link falhou:", err);
  }

  // Resposta idêntica sempre — não revela se o e-mail tem conta.
  return NextResponse.json({ ok: true });
}
