import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { searchAdminOrders } from "@/lib/admin-orders";
import { formatBRL } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/order-status";
import { ORDER_STATUSES, type OrderStatus, type Customer } from "@/db/types";

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Export CSV dos pedidos filtrados (9.3 AC4) — repõe a funcionalidade removida do épico 4. */
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const statusParam = url.searchParams.get("status");
  const status = ORDER_STATUSES.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined;

  const { items } = await searchAdminOrders({ query: q, status, page: 1, pageSize: 100_000 });

  const header = ["data", "cliente", "email", "telefone", "pets", "total", "status", "rastreio"];
  const rows = items.map(({ order, petNames }) => {
    const customer = order.customer as Customer;
    return [
      new Date(order.createdAt).toLocaleDateString("pt-BR"),
      customer.name,
      customer.email,
      customer.phone,
      petNames.join(" · "),
      formatBRL(order.totalAmount),
      STATUS_LABEL[order.status],
      order.trackingCode ?? "",
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
