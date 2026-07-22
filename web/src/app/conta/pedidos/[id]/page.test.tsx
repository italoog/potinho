// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuth: async () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const getOrderForUser = vi.fn();
vi.mock("@/lib/orders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/orders")>();
  return { ...actual, getOrderForUser };
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

const OrderDetailPage = (await import("./page")).default;

afterEach(() => cleanup());

function order(overrides: Record<string, unknown> = {}) {
  return {
    createdAt: new Date("2026-01-15"),
    status: "paid",
    totalAmount: 14900,
    trackingCode: null,
    customer: { address: { street: "Av. Paulista", number: "1000", complement: "", neighborhood: "Bela Vista", city: "São Paulo", state: "SP" } },
    ...overrides,
  };
}

function ctx(id = "order-1") {
  return { params: Promise.resolve({ id }) };
}

describe("OrderDetailPage (conta)", () => {
  it("chama notFound sem sessão", async () => {
    getSession.mockResolvedValue(null);
    await expect(OrderDetailPage(ctx())).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getOrderForUser).not.toHaveBeenCalled();
  });

  it("chama notFound quando o pedido não pertence ao usuário", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    getOrderForUser.mockResolvedValue(null);
    await expect(OrderDetailPage(ctx())).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("busca o pedido com o id do usuário da sessão (isolamento por dono)", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    getOrderForUser.mockResolvedValue({ order: order(), items: [], events: [] });
    await OrderDetailPage(ctx("order-1"));
    expect(getOrderForUser).toHaveBeenCalledWith("order-1", "user-1");
  });

  it("mostra rastreio quando existe", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    getOrderForUser.mockResolvedValue({ order: order({ trackingCode: "BR999" }), items: [], events: [] });
    const jsx = await OrderDetailPage(ctx());
    render(jsx);
    expect(screen.getByText("BR999")).toBeInTheDocument();
  });

  it("não mostra o card de rastreio quando ainda não há", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    getOrderForUser.mockResolvedValue({ order: order({ trackingCode: null }), items: [], events: [] });
    const jsx = await OrderDetailPage(ctx());
    render(jsx);
    expect(screen.queryByText("rastreio")).not.toBeInTheDocument();
  });

  it("mostra os itens e a linha do tempo", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    getOrderForUser.mockResolvedValue({
      order: order(),
      items: [
        { id: "item-1", productName: "Comedouro Pet", unitPrice: 14900, snapshotUrl: null, configuration: { pet_name: "THOR", size: "15cm" } },
      ],
      events: [{ id: "e1", type: "paid", createdAt: new Date("2026-01-15T10:00:00") }],
    });
    const jsx = await OrderDetailPage(ctx());
    render(jsx);
    expect(screen.getByText("THOR")).toBeInTheDocument();
    expect(screen.getByText("pagamento confirmado")).toBeInTheDocument();
  });
});
