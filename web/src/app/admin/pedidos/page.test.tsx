// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const searchAdminOrders = vi.fn();
vi.mock("@/lib/admin-orders", () => ({ searchAdminOrders }));

const AdminPedidosPage = (await import("./page")).default;

afterEach(() => cleanup());

function params(p: Record<string, string> = {}) {
  return Promise.resolve(p);
}

describe("AdminPedidosPage", () => {
  it("lista os pedidos encontrados", async () => {
    searchAdminOrders.mockResolvedValue({
      total: 1,
      items: [
        {
          order: {
            id: "order-1",
            createdAt: new Date("2026-01-15"),
            customer: { name: "Ana Silva", email: "ana@example.com" },
            totalAmount: 14900,
            status: "paid",
            trackingCode: null,
          },
          petNames: ["THOR"],
        },
      ],
    });
    const jsx = await AdminPedidosPage({ searchParams: params() });
    render(jsx);
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("R$ 149,00")).toBeInTheDocument();
  });

  it("mostra mensagem quando não há pedidos", async () => {
    searchAdminOrders.mockResolvedValue({ total: 0, items: [] });
    const jsx = await AdminPedidosPage({ searchParams: params() });
    render(jsx);
    expect(screen.getByText("nenhum pedido encontrado.")).toBeInTheDocument();
  });

  it("ignora status inválido no querystring", async () => {
    searchAdminOrders.mockResolvedValue({ total: 0, items: [] });
    await AdminPedidosPage({ searchParams: params({ status: "nao-existe" }) });
    expect(searchAdminOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
    );
  });

  it("mostra paginação quando há mais de 1 página", async () => {
    searchAdminOrders.mockResolvedValue({ total: 41, items: [] });
    const jsx = await AdminPedidosPage({ searchParams: params({ page: "2" }) });
    render(jsx);
    expect(screen.getByText("3")).toBeInTheDocument(); // ceil(41/20) = 3 páginas
  });
});
