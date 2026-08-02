import type { ShippingPackage } from "@/db/types";
import { freeShipping } from "./site-config";

/**
 * Frete (8.1): SuperFrete cota em tempo real quando configurado
 * (SUPERFRETE_TOKEN + STORE_ORIGIN_CEP). Sem isso — ou se a chamada falhar —
 * cai na tabela fixa por UF (mesmo padrão de redundância do Stripe em src/lib/payments).
 * Configurável por env sem código: SHIPPING_TABLE_JSON='{"SP":1500,"RJ":1800,"*":2500}'
 */

const DEFAULT_TABLE: Record<string, number> = { "*": 2000 };

/** Serviços cotados: 1=PAC, 2=SEDEX, 17=Mini Envios (Correios) — confirmado em superfrete.readme.io. */
const SUPERFRETE_SERVICES = "1,2,17";

/** Nome do serviço que carrega a promoção de frete grátis (site-config.ts) — sempre o mais barato/lento. */
export const FREE_SHIPPING_SERVICE = "PAC";

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

interface SuperFreteQuote {
  id?: number;
  price?: string | number;
  error?: string;
  /** Prazo em dias úteis — confirmado em superfrete.readme.io (reference/cotacao-de-frete). */
  delivery_time?: number;
}

export interface ShippingOption {
  service: string;
  priceCents: number;
  /** Prazo em dias úteis. null quando a fonte não informa (ex.: tabela fixa sem SuperFrete). */
  deliveryDays: number | null;
}

/** Serviços cotados mapeados pro nome exibido no admin (mesmos ids de SUPERFRETE_SERVICES). */
const SERVICE_LABELS: Record<number, string> = { 1: "PAC", 2: "SEDEX", 17: "Mini Envios" };

async function quoteSuperFreteOptions(
  destCep: string,
  packages: ShippingPackage[],
): Promise<ShippingOption[] | null> {
  const token = process.env.SUPERFRETE_TOKEN;
  const originCep = process.env.STORE_ORIGIN_CEP;
  if (!token || !originCep || packages.length === 0) return null;

  const base =
    process.env.SUPERFRETE_SANDBOX === "true"
      ? "https://sandbox.superfrete.com"
      : "https://api.superfrete.com";

  try {
    const res = await fetch(`${base}/api/v0/calculator`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        // Exigência da API: identifica a aplicação que consome o serviço.
        "User-Agent": "potinho (contato@potinho.com.br)",
      },
      body: JSON.stringify({
        from: { postal_code: originCep.replace(/\D/g, "") },
        to: { postal_code: destCep.replace(/\D/g, "") },
        products: packages.map((p) => ({
          width: p.widthCm,
          height: p.heightCm,
          length: p.lengthCm,
          weight: p.weightKg,
          quantity: 1,
        })),
        services: SUPERFRETE_SERVICES,
        options: { insurance_value: 0, receipt: false, own_hand: false },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const quotes = (await res.json()) as SuperFreteQuote[];
    // ponytail: nomes de campo da resposta (price/error/id) não documentados publicamente com
    // exemplo verbatim no momento desta story — confirmar contra o sandbox real antes de produção.
    const options = quotes
      .filter((q) => q.price !== undefined && !q.error)
      .map((q, i) => ({
        service: (q.id && SERVICE_LABELS[q.id]) || `opção ${i + 1}`,
        priceCents: Math.round(parseFloat(String(q.price)) * 100),
        deliveryDays: typeof q.delivery_time === "number" ? q.delivery_time : null,
      }))
      .filter((o) => Number.isFinite(o.priceCents) && o.priceCents >= 0)
      .sort((a, b) => a.priceCents - b.priceCents);
    return options.length > 0 ? options : null;
  } catch (err) {
    console.warn("SuperFrete indisponível, caindo pra tabela fixa por UF:", err);
    return null;
  }
}

/** Carrinho elegível pra promoção automática de frete grátis (ver site-config.ts). */
export function isFreeShippingEligible(itemCount: number): boolean {
  return freeShipping.enabled && itemCount >= freeShipping.minQuantity;
}

/**
 * Opções de frete disponíveis (mais barata primeiro): cotação real por serviço se configurado.
 * ponytail: sem SuperFrete configurado não há como cotar SEDEX de verdade, então o fallback estima
 * PAC pela tabela fixa por UF e SEDEX como 60% mais caro, com prazo fixo — teto: configurar
 * SUPERFRETE_TOKEN pra cair sempre na cotação real (quoteSuperFreteOptions).
 */
export async function shippingOptionsFor(
  destCep: string,
  uf: string,
  packages: ShippingPackage[],
): Promise<ShippingOption[]> {
  const real = await quoteSuperFreteOptions(destCep, packages);
  if (real) return real;
  const pacCents = fallbackForState(uf);
  return [
    { service: "PAC", priceCents: pacCents, deliveryDays: 8 },
    { service: "SEDEX", priceCents: Math.round(pacCents * 1.6), deliveryDays: 3 },
  ];
}

/** Preço do frete em centavos: a mais barata das opções disponíveis (ver shippingOptionsFor). */
export async function shippingCentsFor(
  destCep: string,
  uf: string,
  packages: ShippingPackage[],
): Promise<number> {
  const options = await shippingOptionsFor(destCep, uf, packages);
  return Math.min(...options.map((o) => o.priceCents));
}

/**
 * Preço do frete pra um serviço específico escolhido pelo cliente (checkout). A promoção de
 * frete grátis (site-config.ts) vale só pro PAC — se o cliente preferir SEDEX, paga o valor real
 * mesmo com o carrinho elegível.
 */
export async function shippingCentsForService(
  destCep: string,
  uf: string,
  packages: ShippingPackage[],
  service: string,
  freeShippingEligible: boolean,
): Promise<number> {
  if (freeShippingEligible && service === FREE_SHIPPING_SERVICE) return 0;
  const options = await shippingOptionsFor(destCep, uf, packages);
  return (options.find((o) => o.service === service) ?? options[0])?.priceCents ?? 0;
}
