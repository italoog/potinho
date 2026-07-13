import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { cancelShippingLabel } from "@/lib/admin-orders";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { id } = await params;
  try {
    const result = await cancelShippingLabel(id, session.user.email);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cancelamento de etiqueta falhou:", err);
    return NextResponse.json({ error: "Não foi possível cancelar a etiqueta" }, { status: 500 });
  }
}
