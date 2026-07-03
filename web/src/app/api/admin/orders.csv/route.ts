import { desc, eq } from "drizzle-orm";
import { getDb, orders, products } from "@/db";
import { isAdmin } from "@/lib/auth";

/** Exportação CSV dos pedidos (D-06). */

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  if (!(await isAdmin())) {
    return new Response("Não autorizado", { status: 401 });
  }
  const db = await getDb();
  const rows = await db
    .select({ order: orders, productName: products.name })
    .from(orders)
    .leftJoin(products, eq(orders.productId, products.id))
    .orderBy(desc(orders.createdAt));

  const header = [
    "data",
    "status",
    "produto",
    "cliente",
    "email",
    "telefone",
    "cidade",
    "uf",
    "configuracao",
    "total_centavos",
    "frete_centavos",
    "rastreio",
  ];
  const lines = rows.map(({ order, productName }) =>
    [
      order.createdAt.toISOString(),
      order.status,
      productName,
      order.customer.name,
      order.customer.email,
      order.customer.phone,
      order.customer.address.city,
      order.customer.address.state,
      Object.entries(order.configuration)
        .map(([k, v]) => `${k}=${v}`)
        .join(" | "),
      order.totalAmount,
      order.shippingAmount,
      order.trackingCode ?? "",
    ]
      .map(csvCell)
      .join(";"),
  );

  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-forja3d-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
