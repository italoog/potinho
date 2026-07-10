import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { reconcilePaymentByAdmin } from "@/lib/admin-orders";

/** Reconciliação manual (9.x): cobre pedido "pending" preso por webhook que nunca chegou. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { id } = await params;
  try {
    const result = await reconcilePaymentByAdmin(id, session.user.email);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, status: result.status });
  } catch (err) {
    console.error("Verificação manual de pagamento falhou:", err);
    return NextResponse.json({ error: "Não foi possível verificar o pagamento agora" }, { status: 500 });
  }
}
