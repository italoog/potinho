import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { notifyAllForColor } from "@/lib/admin-notify";

const bodySchema = z.object({ colorId: z.string().min(1), colorLabel: z.string().min(1) });

/** "Avisar todos" de uma cor que voltou ao estoque (9.5 AC3). */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = bodySchema.parse(await request.json());
    const count = await notifyAllForColor(body.colorId, body.colorLabel);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    console.error("Notificação em lote falhou:", err);
    const message = err instanceof z.ZodError ? "Dados inválidos" : "Não foi possível enviar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
