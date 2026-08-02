import { NextResponse } from "next/server";
import { getOrderStatusByToken } from "@/lib/orders";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/** Polling leve de status (P-07): só a coluna `status`, chamado pelo OrderPurchaseTracker enquanto o pedido está "pending". */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limit = await rateLimit(`order-status:${clientIp(request)}`, 30, 5 * 60_000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds);

  const { token } = await params;
  const status = await getOrderStatusByToken(token);
  if (!status) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  return NextResponse.json({ status });
}
