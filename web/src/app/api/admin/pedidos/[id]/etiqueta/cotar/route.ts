import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { quoteShippingLabel } from "@/lib/admin-orders";

const bodySchema = z.object({
  recipientDocument: z.string().min(11).max(18),
  service: z.enum(["pac", "sedex", "mini"]),
  package: z.object({
    widthCm: z.number().positive(),
    heightCm: z.number().positive(),
    lengthCm: z.number().positive(),
    weightKg: z.number().positive(),
  }),
  declaredValueCents: z.number().int().positive(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { id } = await params;
  try {
    const body = bodySchema.parse(await request.json());
    const result = await quoteShippingLabel(id, body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ priceCents: result.priceCents });
  } catch (err) {
    console.error("Cotação de etiqueta falhou:", err);
    const message = err instanceof z.ZodError ? "Dados inválidos" : "Não foi possível cotar a etiqueta";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
