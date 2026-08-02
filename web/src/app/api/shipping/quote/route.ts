import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductById } from "@/lib/products";
import { FREE_SHIPPING_SERVICE, isFreeShippingEligible, shippingOptionsFor, type ShippingOption } from "@/lib/shipping";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Cotação de frete exibida no checkout ao preencher o CEP (6.1 AC3) — carrinho multi-item,
 * pacotes vêm da variante (tamanho) de cada item. Mesma lógica de api/checkout/route.ts.
 */

const bodySchema = z.object({
  cep: z.string().regex(/^\d{5}-?\d{3}$/),
  uf: z.string().length(2),
  items: z.array(z.object({ productId: z.string().uuid(), size: z.string().min(1) })).min(1),
});

export async function POST(request: Request) {
  const limit = await rateLimit(`shipping-quote:${clientIp(request)}`, 20, 5 * 60_000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds);

  try {
    const body = bodySchema.parse(await request.json());
    const products = await Promise.all(body.items.map((item) => getProductById(item.productId)));

    const packages = body.items
      .map((item, i) => products[i]?.variants.find((v) => v.ref === item.size)?.shipping)
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    // Frete grátis (site-config.ts) zera só o PAC — SEDEX continua com preço real pra quem
    // preferir pagar por prazo menor (ver shippingCentsForService em order-creation.ts).
    const eligible = isFreeShippingEligible(body.items.length);
    const quoted = await shippingOptionsFor(body.cep, body.uf, packages);
    const options: ShippingOption[] = quoted.map((o) =>
      eligible && o.service === FREE_SHIPPING_SERVICE ? { ...o, priceCents: 0 } : o,
    );
    const shippingCents = Math.min(...options.map((o) => o.priceCents));
    return NextResponse.json({ shippingCents, options });
  } catch (err) {
    console.error("Cotação de frete falhou:", err);
    const message = err instanceof z.ZodError ? "Dados inválidos" : "Não foi possível cotar o frete";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
