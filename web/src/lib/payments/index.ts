import type { PaymentProvider } from "@/db/types";
import type { CreatePaymentSessionInput, PaymentSession } from "./types";

export type { CreatePaymentSessionInput, PaymentLineItem, PaymentSession } from "./types";

/** Mercado Pago é o gateway principal; Stripe só ativa com PAYMENT_PROVIDER=stripe (redundância). */
export function activeProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === "stripe" ? "stripe" : "mercadopago";
}

export function providerConfigured(provider: PaymentProvider): boolean {
  return provider === "stripe"
    ? Boolean(process.env.STRIPE_SECRET_KEY)
    : Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

export async function createPaymentSession(
  input: CreatePaymentSessionInput,
): Promise<PaymentSession & { provider: PaymentProvider }> {
  const provider = activeProvider();
  if (provider === "stripe") {
    const { createStripeSession } = await import("./stripe");
    return { ...(await createStripeSession(input)), provider };
  }
  const { createMercadoPagoSession } = await import("./mercadopago");
  return { ...(await createMercadoPagoSession(input)), provider };
}
