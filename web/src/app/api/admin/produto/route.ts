import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { updateProductPricing } from "@/lib/products";
import { shippingPackageSchema } from "@/db/types";

const bodySchema = z.object({
  productId: z.string().uuid(),
  basePrice: z.number().int().min(0),
  status: z.enum(["draft", "published"]),
  variants: z.array(z.object({ ref: z.string(), priceDelta: z.number().int(), shipping: shippingPackageSchema })),
  colorUpdates: z.array(z.object({ paramKey: z.string(), hex: z.string(), soldOut: z.boolean() })),
});

/** Edição de preço/envio/status e soldOut por cor (9.5 AC1/AC2). */
export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  try {
    const body = bodySchema.parse(await request.json());
    await updateProductPricing(body.productId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Atualização de produto falhou:", err);
    const message = err instanceof z.ZodError ? "Dados inválidos" : "Não foi possível salvar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
