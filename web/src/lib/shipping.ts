import type { ShippingPackage } from "@/db/types";

/**
 * Frete (P-06): Melhor Envio cota em tempo real quando configurado
 * (MELHORENVIO_TOKEN + STORE_ORIGIN_CEP). Sem isso — ou se a chamada falhar —
 * cai na tabela fixa por UF (redundância, mesmo padrão do Stripe em src/lib/payments).
 * Configurável por env sem código: SHIPPING_TABLE_JSON='{"SP":1500,"RJ":1800,"*":2500}'
 */

const DEFAULT_TABLE: Record<string, number> = { "*": 2000 };

function fallbackForState(uf: string): number {
  let table = DEFAULT_TABLE;
  const raw = process.env.SHIPPING_TABLE_JSON;
  if (raw) {
    try {
      table = JSON.parse(raw);
    } catch {
      table = DEFAULT_TABLE;
    }
  }
  const value = table[uf.toUpperCase()] ?? table["*"] ?? 0;
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

interface MelhorEnvioQuote {
  price?: string;
  error?: string;
}

async function quoteMelhorEnvio(
  destCep: string,
  packages: ShippingPackage[],
): Promise<number | null> {
  const token = process.env.MELHORENVIO_TOKEN;
  const originCep = process.env.STORE_ORIGIN_CEP;
  if (!token || !originCep || packages.length === 0) return null;

  const base =
    process.env.MELHORENVIO_SANDBOX === "true"
      ? "https://sandbox.melhorenvio.com.br"
      : "https://melhorenvio.com.br";

  try {
    const res = await fetch(`${base}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "potinho (contato@potinho.com.br)",
      },
      body: JSON.stringify({
        from: { postal_code: originCep.replace(/\D/g, "") },
        to: { postal_code: destCep.replace(/\D/g, "") },
        products: packages.map((p, i) => ({
          id: `item-${i}`,
          width: p.widthCm,
          height: p.heightCm,
          length: p.lengthCm,
          weight: p.weightKg,
          insurance_value: 0,
          quantity: 1,
        })),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const quotes = (await res.json()) as MelhorEnvioQuote[];
    const pricesCents = quotes
      .filter((q) => q.price && !q.error)
      .map((q) => Math.round(parseFloat(q.price!) * 100))
      .filter((cents) => Number.isFinite(cents) && cents >= 0);
    return pricesCents.length > 0 ? Math.min(...pricesCents) : null;
  } catch (err) {
    console.warn("Melhor Envio indisponível, caindo pra tabela fixa por UF:", err);
    return null;
  }
}

/** Preço do frete em centavos: cotação real (mais barata) se configurado, senão tabela fixa por UF. */
export async function shippingCentsFor(
  destCep: string,
  uf: string,
  packages: ShippingPackage[],
): Promise<number> {
  const real = await quoteMelhorEnvio(destCep, packages);
  return real ?? fallbackForState(uf);
}
