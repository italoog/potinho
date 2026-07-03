import { formatBRL } from "./money";
import type { OrderRow } from "@/db/schema";
import type { Customer } from "@/db/types";

/**
 * E-mails transacionais (P-05, D-03) via Resend.
 * Sem RESEND_API_KEY (dev): loga no console e segue — nunca bloqueia o pedido.
 */

async function send(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dev] para=${to} assunto="${subject}"`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "pedidos@forja3d.com.br",
    to,
    subject,
    html,
  });
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function configTable(configuration: Record<string, string>): string {
  const rows = Object.entries(configuration)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td style="padding:4px 0"><strong>${v}</strong></td></tr>`)
    .join("");
  return `<table style="border-collapse:collapse">${rows}</table>`;
}

export async function sendOrderConfirmation(order: OrderRow, productName: string): Promise<void> {
  const customer = order.customer as Customer;
  const statusUrl = `${appUrl()}/pedido/${order.publicToken}`;
  const snapshot = order.snapshotUrl
    ? `<p><img src="${order.snapshotUrl.startsWith("http") ? order.snapshotUrl : appUrl() + order.snapshotUrl}" alt="Seu produto personalizado" width="360" style="border-radius:12px"/></p>`
    : "";
  await send(
    customer.email,
    `Pedido confirmado — ${productName}`,
    `
    <h2>Obrigado, ${customer.name.split(" ")[0]}! 🎉</h2>
    <p>Seu pedido foi confirmado e já entrou na fila de produção.</p>
    ${snapshot}
    <h3>Personalização</h3>
    ${configTable(order.configuration as Record<string, string>)}
    <p>Total: <strong>${formatBRL(order.totalAmount)}</strong></p>
    <p>Prazo estimado: 7 a 12 dias úteis (produção + envio).</p>
    <p><a href="${statusUrl}">Acompanhar o pedido</a></p>
    `,
  );
}

export async function sendNewOrderNotification(order: OrderRow, productName: string): Promise<void> {
  const lojista = process.env.LOJISTA_EMAIL;
  if (!lojista) {
    console.log("[email:dev] LOJISTA_EMAIL não configurado — notificação pulada");
    return;
  }
  const customer = order.customer as Customer;
  await send(
    lojista,
    `🖨️ Novo pedido pago — ${productName}`,
    `
    <h2>Novo pedido pago</h2>
    <p>Cliente: ${customer.name} · ${customer.phone} · ${customer.email}</p>
    <h3>Especificação completa</h3>
    ${configTable(order.configuration as Record<string, string>)}
    <p>Total: <strong>${formatBRL(order.totalAmount)}</strong> (frete: ${formatBRL(order.shippingAmount)})</p>
    <p><a href="${appUrl()}/admin">Abrir no dashboard</a></p>
    `,
  );
}
