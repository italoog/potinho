import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, orders } from "@/db";
import { isAdmin } from "@/lib/auth";
import { ORDER_STATUSES } from "@/db/types";

const bodySchema = z.object({
  status: z.enum(ORDER_STATUSES),
  trackingCode: z.string().max(64).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  const db = await getDb();
  await db
    .update(orders)
    .set({ status: parsed.data.status, trackingCode: parsed.data.trackingCode ?? null })
    .where(eq(orders.id, id));
  return NextResponse.json({ ok: true });
}
