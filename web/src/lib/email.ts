import { formatBRL } from "./money";
import type { OrderRow } from "@/db/schema";
import type { Customer, OrderConfiguration } from "@/db/types";

/**
 * E-mails transacionais (P-05, D-03) via Resend.
 * Sem RESEND_API_KEY (dev): loga no console e segue — nunca bloqueia o pedido.
 */

export interface OrderEmailItem {
  productName: string;
  configuration: OrderConfiguration;
  unitPrice: number;
  snapshotUrl?: string | null;
}

/** Escapa entrada não confiável antes de interpolar em HTML de e-mail (P1-1). */
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const link = html.match(/href="([^"]+)"/)?.[1];
    console.log(`[email:dev] para=${to} assunto="${subject}"${link ? ` link=${link}` : ""}`);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "pedidos@potinho.pet",
    to,
    subject,
    html,
  });
  if (error) {
    console.error(`[email:erro] para=${to} assunto="${subject}"`, error);
  }
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function configTable(configuration: Record<string, string>): string {
  const rows = Object.entries(configuration)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`)
    .join("");
  return `<table style="border-collapse:collapse">${rows}</table>`;
}

function itemsBlock(items: OrderEmailItem[]): string {
  return items
    .map((item) => {
      const snapshot = item.snapshotUrl
        ? `<p><img src="${encodeURI(item.snapshotUrl.startsWith("http") ? item.snapshotUrl : appUrl() + item.snapshotUrl)}" alt="Produto personalizado" width="280" style="border-radius:12px"/></p>`
        : "";
      return `
      <div style="margin:12px 0;padding-top:12px;border-top:1px solid #eee">
        <p style="margin:0 0 4px"><strong>${esc(item.productName)}</strong> — ${formatBRL(item.unitPrice)}</p>
        ${snapshot}
        ${configTable(item.configuration)}
      </div>`;
    })
    .join("");
}

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  await send(
    email,
    "seu link de entrada 🐾",
    `
    <h2>oi! 🐾</h2>
    <p>é só clicar no link abaixo pra entrar na sua conta potinho — sem senha, sem complicação.</p>
    <p><a href="${url}">entrar na minha conta</a></p>
    <p style="color:#666;font-size:13px">o link expira em 15 minutos e só funciona uma vez. se não foi você, pode ignorar este e-mail.</p>
    `,
  );
}

export async function sendColorBackInStockEmail(email: string, colorLabel: string): Promise<void> {
  await send(
    email,
    `${colorLabel} voltou! 🐾`,
    `
    <h2>a cor ${esc(colorLabel.toLowerCase())} voltou ao estoque 🎉</h2>
    <p>você deixou o e-mail avisando que queria essa cor — ela acabou de voltar. o potinho pode ficar exatamente do jeito que ficou combinado na sua cabeça.</p>
    <p><a href="${appUrl()}">montar meu potinho</a></p>
    `,
  );
}

export async function sendOrderConfirmation(order: OrderRow, items: OrderEmailItem[]): Promise<void> {
  const customer = order.customer as Customer;
  const statusUrl = `${appUrl()}/pedido/${order.publicToken}`;
  await send(
    customer.email,
    `Pedido confirmado — ${items[0]?.productName ?? "seu potinho"}`,
    `
    <h2>Obrigado, ${esc(customer.name.split(" ")[0])}! 🎉</h2>
    <p>Seu pedido foi confirmado e já entrou na fila de produção.</p>
    ${itemsBlock(items)}
    <p>Total: <strong>${formatBRL(order.totalAmount)}</strong></p>
    <p>Prazo estimado: 7 a 12 dias úteis (produção + envio).</p>
    <p><a href="${statusUrl}">Acompanhar o pedido</a></p>
    `,
  );
}

export async function sendRefundNotification(order: OrderRow, status: string): Promise<void> {
  const lojista = process.env.LOJISTA_EMAIL;
  if (!lojista) {
    console.log("[email:dev] LOJISTA_EMAIL não configurado — notificação de estorno pulada");
    return;
  }
  const customer = order.customer as Customer;
  await send(
    lojista,
    `⚠️ Pedido estornado/chargeback — ${customer.name}`,
    `
    <h2>Pagamento revertido</h2>
    <p>Status do gateway: <strong>${esc(status)}</strong></p>
    <p>Cliente: ${esc(customer.name)} · ${esc(customer.email)}</p>
    <p>Total: <strong>${formatBRL(order.totalAmount)}</strong></p>
    <p>O pedido foi marcado como cancelado automaticamente.</p>
    `,
  );
}

export async function sendNewOrderNotification(order: OrderRow, items: OrderEmailItem[]): Promise<void> {
  const lojista = process.env.LOJISTA_EMAIL;
  if (!lojista) {
    console.log("[email:dev] LOJISTA_EMAIL não configurado — notificação pulada");
    return;
  }
  const customer = order.customer as Customer;
  await send(
    lojista,
    `🖨️ Novo pedido pago — ${items.length} item(ns)`,
    `
    <h2>Novo pedido pago</h2>
    <p>Cliente: ${esc(customer.name)} · ${esc(customer.phone)} · ${esc(customer.email)}</p>
    <h3>Especificação completa</h3>
    ${itemsBlock(items)}
    <p>Total: <strong>${formatBRL(order.totalAmount)}</strong> (frete: ${formatBRL(order.shippingAmount)})</p>
    `,
  );
}
