import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { changeOrderStatus } from "@/lib/admin-orders";
import { ORDER_STATUSES } from "@/db/types";

const bodySchema = z.object({
  status: z.enum(ORDER_STATUSES),
  trackingCode: z.string().min(1).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { id } = await params;
  try {
    const body = bodySchema.parse(await request.json());
    const result = await changeOrderStatus(id, body.status, session.user.email, body.trackingCode);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Mudança de status falhou:", err);
    const message = err instanceof z.ZodError ? "Dados inválidos" : "Não foi possível mudar o status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
