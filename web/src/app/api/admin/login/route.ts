import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, verifyAdminCredentials } from "@/lib/auth";

/** Login do admin com rate-limit simples em memória (D-01). */

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const bodySchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Muitas tentativas. Tente em 15 minutos." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const ok = await verifyAdminCredentials(parsed.data.email, parsed.data.password);
  if (!ok) {
    const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
    current.count += 1;
    attempts.set(ip, current);
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  attempts.delete(ip);
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
