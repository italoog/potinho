import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { updateUrgencyCountdown } from "@/lib/urgency-countdown";

const bodySchema = z.object({
  enabled: z.boolean(),
  durationMinutes: z.number().int().min(1).max(10_080), // até 7 dias
  label: z.string().min(1).max(60),
});

/** Edição do contador de urgência da FreeShippingBar (painel admin). */
export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = bodySchema.parse(await request.json());
    await updateUrgencyCountdown(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Atualização do contador de urgência falhou:", err);
    const message = err instanceof z.ZodError ? "Dados inválidos" : "Não foi possível salvar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
