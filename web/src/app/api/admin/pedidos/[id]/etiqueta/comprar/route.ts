import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { purchaseShippingLabel } from "@/lib/admin-orders";

/** Gasta saldo real da carteira SuperFrete (ou saldo de teste em sandbox) — precisa ter cotado antes. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { id } = await params;
  try {
    const result = await purchaseShippingLabel(id, session.user.email);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ trackingCode: result.trackingCode, labelUrl: result.labelUrl });
  } catch (err) {
    console.error("Compra de etiqueta falhou:", err);
    return NextResponse.json({ error: "Não foi possível comprar a etiqueta" }, { status: 500 });
  }
}
