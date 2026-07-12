import { NextResponse } from "next/server";
import { z } from "zod";
import { applyCoupon, couponValidationError, getCouponByCode } from "@/lib/coupons";
import { getProductById } from "@/lib/products";
import { validateCartItems, type CartItemInput } from "@/lib/pricing";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Preview do cupom pro checkout mostrar o desconto ANTES de enviar o pedido — só UX.
 * A fonte de verdade continua sendo o recálculo em createOrderFromCart (POST /api/checkout),
 * que nunca confia nesse valor (mesmo princípio de preço-é-lei-no-servidor da 6.1).
 */
const bodySchema = z.object({
  couponCode: z.string().min(1),
  items: z.array(z.object({ productId: z.string().uuid(), configuration: z.record(z.string(), z.string()) })).min(1),
  shippingCents: z.number().int().min(0),
});

export async function POST(request: Request) {
  const limit = rateLimit(`cupom:${clientIp(request)}`, 20, 5 * 60_000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds);

  try {
    const body = bodySchema.parse(await request.json());

    const coupon = await getCouponByCode(body.couponCode);
    if (!coupon) return NextResponse.json({ error: "Cupom inválido" }, { status: 404 });
    const validationError = couponValidationError(coupon);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const products = await Promise.all(body.items.map((item) => getProductById(item.productId)));
    if (products.some((p) => !p || p.status !== "published")) {
      return NextResponse.json({ error: "Produto indisponível" }, { status: 404 });
    }

    const cartInputs: CartItemInput[] = body.items.map((item, i) => ({
      product: products[i]!,
      configuration: item.configuration,
    }));
    const validated = validateCartItems(cartInputs);
    const itemsTotal = validated.reduce((sum, v) => sum + v.unitPrice, 0);

    const discount = applyCoupon(
      coupon,
      validated.map((v, i) => ({ product: products[i]!, configuration: v.configuration })),
      itemsTotal,
      body.shippingCents,
    );

    return NextResponse.json(discount);
  } catch (err) {
    const message = err instanceof z.ZodError ? "Dados inválidos" : err instanceof Error ? err.message : "Cupom inválido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
