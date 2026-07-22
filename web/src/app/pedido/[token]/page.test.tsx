// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const getOrderByToken = vi.fn();
vi.mock("@/lib/orders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/orders")>();
  return { ...actual, getOrderByToken };
});

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- mock de teste, não é código de produção
  default: (props: Record<string, unknown>) => <img alt={props.alt as string} {...props} />,
}));

const OrderStatusPage = (await import("./page")).default;

afterEach(() => cleanup());

function order(overrides: Record<string, unknown> = {}) {
  return {
    createdAt: new Date("2026-01-15"),
    status: "pending",
    shippingAmount: 2000,
    totalAmount: 16900,
    trackingCode: null,
    customer: {
      address: { street: "Av. Paulista", number: "1000", complement: "", neighborhood: "Bela Vista", city: "São Paulo", state: "SP", zip: "01310-100" },
    },
    ...overrides,
  };
}

function ctx(token = "tok-1") {
  return { params: Promise.resolve({ token }) };
}

describe("OrderStatusPage", () => {
  it("chama notFound quando o token não existe", async () => {
    getOrderByToken.mockResolvedValue(null);
    await expect(OrderStatusPage(ctx())).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("chama notFound quando a busca lança (token malformado)", async () => {
    getOrderByToken.mockRejectedValue(new Error("invalid uuid"));
    await expect(OrderStatusPage(ctx())).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("pending mostra 'pedido recebido' e sem rastreio disponível", async () => {
    getOrderByToken.mockResolvedValue({ order: order({ status: "pending" }), items: [], events: [] });
    const jsx = await OrderStatusPage(ctx());
    render(jsx);
    expect(screen.getByText("pedido recebido")).toBeInTheDocument();
    expect(screen.getByText(/ainda não disponível/)).toBeInTheDocument();
  });

  it("pago mostra 'pedido confirmado' e o link de rastreio quando existe", async () => {
    getOrderByToken.mockResolvedValue({
      order: order({ status: "paid", trackingCode: "BR123456789" }),
      items: [],
      events: [],
    });
    const jsx = await OrderStatusPage(ctx());
    render(jsx);
    expect(screen.getByText("pedido confirmado 🎉")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "BR123456789" })).toHaveAttribute(
      "href",
      expect.stringContaining("BR123456789"),
    );
  });

  it("mostra o item com cor/tamanho traduzidos e o total", async () => {
    getOrderByToken.mockResolvedValue({
      order: order(),
      items: [
        {
          id: "item-1",
          productName: "Comedouro Pet",
          unitPrice: 14900,
          snapshotUrl: null,
          configuration: { pet_name: "THOR", size: "15cm", color_base: "#3D6EB5" },
          paramSchema: [
            { key: "pet_name", type: "text", label: "nome do pet" },
            { key: "size", type: "select", label: "tamanho", options: [{ value: "15cm", label: "G — 15cm" }] },
            { key: "color_base", type: "color", label: "cor de cima", options: [{ hex: "#3D6EB5", label: "Azul" }] },
          ],
        },
      ],
      events: [],
    });
    const jsx = await OrderStatusPage(ctx());
    render(jsx);
    expect(screen.getByText("THOR")).toBeInTheDocument();
    expect(screen.getByText("G — 15cm")).toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();
    expect(screen.getByText("R$ 169,00")).toBeInTheDocument(); // total = 149 + 20 frete
  });

  it("mostra a linha do tempo só com eventos conhecidos", async () => {
    getOrderByToken.mockResolvedValue({
      order: order(),
      items: [],
      events: [
        { id: "e1", type: "created", createdAt: new Date("2026-01-15T09:00:00") },
        { id: "e2", type: "tipo_desconhecido", createdAt: new Date("2026-01-15T09:30:00") },
      ],
    });
    const jsx = await OrderStatusPage(ctx());
    render(jsx);
    // "pedido recebido" aparece 2x: título da página (status pending) + evento "created" na timeline
    expect(screen.getAllByText("pedido recebido")).toHaveLength(2);
  });
});
