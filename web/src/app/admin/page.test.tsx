// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const getAdminSummary = vi.fn();
vi.mock("@/lib/admin-metrics", () => ({ getAdminSummary }));

const AdminResumoPage = (await import("./page")).default;

afterEach(() => cleanup());

function summary(overrides: Partial<Awaited<ReturnType<typeof getAdminSummary>>> = {}) {
  return {
    revenueCents: 149000,
    paidOrdersCount: 10,
    averageTicketCents: 14900,
    awaitingActionCount: 3,
    statusCounts: { pending: 2, paid: 3, production: 1, shipped: 1, delivered: 3, canceled: 0 },
    topCombos: [],
    recentOrders: [],
    ...overrides,
  };
}

function params(p: Record<string, string> = {}) {
  return Promise.resolve(p);
}

describe("AdminResumoPage", () => {
  it("mostra os KPIs principais", async () => {
    getAdminSummary.mockResolvedValue(summary());
    const jsx = await AdminResumoPage({ searchParams: params() });
    render(jsx);
    expect(screen.getByText("R$ 1.490,00")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("usa 30d como período padrão quando ausente/inválido", async () => {
    getAdminSummary.mockResolvedValue(summary());
    await AdminResumoPage({ searchParams: params({ periodo: "lixo" }) });
    expect(getAdminSummary).toHaveBeenCalledWith("30d");
  });

  it("repassa o período válido da query", async () => {
    getAdminSummary.mockResolvedValue(summary());
    await AdminResumoPage({ searchParams: params({ periodo: "7d" }) });
    expect(getAdminSummary).toHaveBeenCalledWith("7d");
  });

  it("mostra combos e pedidos recentes quando existem", async () => {
    getAdminSummary.mockResolvedValue(
      summary({
        topCombos: [{ colorBase: "#3D6EB5", colorBand: "#E88BB1", size: "15cm", count: 5 }],
        recentOrders: [{ id: "order-12345678", createdAt: new Date("2026-01-15"), status: "paid", totalAmount: 14900 }],
      }),
    );
    const jsx = await AdminResumoPage({ searchParams: params() });
    render(jsx);
    expect(screen.getByText("5×")).toBeInTheDocument();
    expect(screen.getByText(/order-12/)).toBeInTheDocument();
  });
});
