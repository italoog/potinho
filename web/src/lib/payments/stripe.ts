import type { CreatePaymentSessionInput, PaymentSession } from "./types";

/** Redundância desativada por padrão — só roda com PAYMENT_PROVIDER=stripe. */
export async function createStripeSession(input: CreatePaymentSessionInput): Promise<PaymentSession> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurado");

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(key);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail,
    line_items: [
      ...input.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "brl" as const,
          unit_amount: item.unitAmountCents,
          product_data: { name: item.name, description: item.description },
        },
      })),
      ...(input.shippingCents > 0
        ? [
            {
              quantity: 1,
              price_data: {
                currency: "brl" as const,
                unit_amount: input.shippingCents,
                product_data: { name: "Frete" },
              },
            },
          ]
        : []),
    ],
    metadata: { orderId: input.orderId },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
  return { redirectUrl: session.url!, providerPaymentId: session.id };
}
