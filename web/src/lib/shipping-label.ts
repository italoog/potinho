import type { ShippingPackage } from "@/db/types";

/**
 * Compra e impressão de etiqueta via SuperFrete (mesma conta/token de web/src/lib/shipping.ts).
 * Fluxo em 3 chamadas, cada uma um passo do admin (nenhuma automática):
 * 1. createCartOrder  — registra o envio no carrinho da SuperFrete, SEM cobrar nada. Retorna o preço real.
 * 2. checkoutOrder    — paga com o saldo da carteira SuperFrete (dinheiro de verdade fora de sandbox) e retorna o rastreio.
 * 3. printLabel       — pega o link do PDF da etiqueta já comprada.
 *
 * ponytail: sem endpoint de saldo documentado — se a carteira estiver sem fundo, checkoutOrder
 * simplesmente falha (400) e a mensagem de erro da SuperFrete sobe pro admin.
 */

interface SuperFreteAddress {
  name: string;
  address: string;
  complement?: string;
  number?: string;
  district: string;
  city: string;
  state_abbr: string;
  postal_code: string;
  document?: string;
  email?: string;
}

export interface LabelShipmentInput {
  to: {
    name: string;
    document: string;
    email?: string;
    address: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zip: string };
  };
  service: 1 | 2 | 17;
  productName: string;
  productValueCents: number;
  packageDimensions: ShippingPackage;
}

function baseUrl(): string {
  return process.env.SUPERFRETE_SANDBOX === "true" ? "https://sandbox.superfrete.com" : "https://api.superfrete.com";
}

function headers(): HeadersInit {
  const token = process.env.SUPERFRETE_TOKEN;
  if (!token) throw new Error("SUPERFRETE_TOKEN não configurado");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "potinho (contato@potinho.com.br)",
  };
}

function originAddress(): SuperFreteAddress {
  const required = (name: string, value: string | undefined): string => {
    if (!value) throw new Error(`${name} não configurado — necessário pra gerar etiqueta (remetente)`);
    return value;
  };
  return {
    name: required("STORE_ORIGIN_NAME", process.env.STORE_ORIGIN_NAME),
    address: required("STORE_ORIGIN_ADDRESS", process.env.STORE_ORIGIN_ADDRESS),
    number: process.env.STORE_ORIGIN_NUMBER,
    complement: process.env.STORE_ORIGIN_COMPLEMENT,
    district: required("STORE_ORIGIN_DISTRICT", process.env.STORE_ORIGIN_DISTRICT),
    city: required("STORE_ORIGIN_CITY", process.env.STORE_ORIGIN_CITY),
    state_abbr: required("STORE_ORIGIN_STATE", process.env.STORE_ORIGIN_STATE),
    postal_code: required("STORE_ORIGIN_CEP", process.env.STORE_ORIGIN_CEP).replace(/\D/g, ""),
    document: process.env.STORE_ORIGIN_DOCUMENT,
  };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : `SuperFrete recusou ${path} (${res.status})`);
  }
  return data as T;
}

export interface CartOrderResult {
  superfreteOrderId: string;
  priceCents: number;
}

/** Passo 1 — registra o envio no carrinho da SuperFrete e devolve o preço real. Não gasta saldo. */
export async function createCartOrder(input: LabelShipmentInput): Promise<CartOrderResult> {
  const to: SuperFreteAddress = {
    name: input.to.name,
    address: input.to.address.street,
    number: input.to.address.number,
    complement: input.to.address.complement,
    district: input.to.address.neighborhood,
    city: input.to.address.city,
    state_abbr: input.to.address.state,
    postal_code: input.to.address.zip.replace(/\D/g, ""),
    document: input.to.document.replace(/\D/g, ""),
    email: input.to.email,
  };

  const data = await post<{ id: string; price: number; status: string }>("/api/v0/cart", {
    from: originAddress(),
    to,
    service: input.service,
    products: [{ name: input.productName, quantity: "1", unitary_value: String(input.productValueCents / 100) }],
    volumes: {
      height: input.packageDimensions.heightCm,
      width: input.packageDimensions.widthCm,
      length: input.packageDimensions.lengthCm,
      weight: input.packageDimensions.weightKg,
    },
    // ponytail: assume envio pessoal sem nota fiscal (non_commercial) — se a loja emitir NF-e,
    // trocar por options.invoice.number e tirar essa flag.
    options: { non_commercial: true, insurance_value: input.productValueCents / 100 },
    platform: "potinho",
  });

  return { superfreteOrderId: data.id, priceCents: Math.round(data.price * 100) };
}

export interface CheckoutResult {
  trackingCode: string;
  priceCents: number;
}

/** Passo 2 — paga a etiqueta com o saldo da carteira SuperFrete. Ação com custo real fora de sandbox. */
export async function checkoutOrder(superfreteOrderId: string): Promise<CheckoutResult> {
  const data = await post<{
    success: boolean;
    purchase: { orders: { id: string; price: number; tracking: string }[] };
  }>("/api/v0/checkout", { orders: [superfreteOrderId] });

  const purchased = data.purchase.orders.find((o) => o.id === superfreteOrderId) ?? data.purchase.orders[0];
  if (!purchased) throw new Error("SuperFrete não retornou o pedido comprado");
  return { trackingCode: purchased.tracking, priceCents: Math.round(purchased.price * 100) };
}

/** Passo 3 — link do PDF da etiqueta já comprada. */
export async function printLabel(superfreteOrderId: string): Promise<string> {
  const data = await post<{ url: string }>("/api/v0/tag/print", { orders: [superfreteOrderId] });
  return data.url;
}

/** Cancela uma etiqueta comprada por engano — estorna pro saldo da carteira (política SuperFrete). */
export async function cancelOrder(superfreteOrderId: string, description?: string): Promise<void> {
  await post("/api/v0/order/cancel", {
    order: { id: superfreteOrderId, description: description ?? "Cancelado pelo admin potinho" },
  });
}

export function serviceIdForLabel(service: "pac" | "sedex" | "mini"): 1 | 2 | 17 {
  return service === "pac" ? 1 : service === "sedex" ? 2 : 17;
}
