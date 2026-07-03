import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/orders";

/**
 * Webhook Stripe (P-04): checkout.session.completed → pedido "Pago".
 * Assinatura SEMPRE verificada; idempotência garantida em markOrderPaid.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });
  }

  const payload = await request.text();
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(key);

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await markOrderPaid(orderId, session.id);
    }
  }

  return NextResponse.json({ received: true });
}
