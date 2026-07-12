import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { createCoupon, listCoupons } from "@/lib/coupons";
import { COUPON_DISCOUNT_TYPES } from "@/db/types";

const couponInputSchema = z.object({
  code: z.string().min(1).max(40),
  active: z.boolean(),
  productDiscountType: z.enum(COUPON_DISCOUNT_TYPES).nullable(),
  productDiscountValue: z.number().int().min(0).nullable(),
  shippingDiscountType: z.enum(COUPON_DISCOUNT_TYPES).nullable(),
  shippingDiscountValue: z.number().int().min(0).nullable(),
  cumulative: z.boolean(),
  usageLimit: z.number().int().min(1).nullable(),
  expiresAt: z.coerce.date().nullable(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const coupons = await listCoupons();
  return NextResponse.json({ coupons });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = couponInputSchema.parse(await request.json());
    const coupon = await createCoupon(body);
    return NextResponse.json({ coupon });
  } catch (err) {
    console.error("Cadastro de cupom falhou:", err);
    const message =
      err instanceof z.ZodError ? "Dados inválidos" : err instanceof Error ? err.message : "Não foi possível salvar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
