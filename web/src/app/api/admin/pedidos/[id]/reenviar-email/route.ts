import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { resendOrderConfirmation } from "@/lib/admin-orders";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { id } = await params;
  const ok = await resendOrderConfirmation(id, session.user.email);
  if (!ok) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
