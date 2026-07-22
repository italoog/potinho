// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const getOrderForAdmin = vi.fn();
vi.mock("@/lib/orders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/orders")>();
  return { ...actual, getOrderForAdmin };
});

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- mock de teste, não é código de produção
  default: (props: Record<string, unknown>) => <img alt={props.alt as string} {...props} />,
}));

const AdminOrderDetailPage = (await import("./page")).default;

afterEach(() => cleanup());

const CUSTOMER = {
  name: "Mariana Silva",
  email: "mariana@example.com",
  phone: "11999990000",
  address: { street: "Av. Paulista", number: "1000", complement: "", neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
};

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    createdAt: new Date("2026-01-15"),
    totalAmount: 14900,
    shippingAmount: 2000,
    status: "paid",
    customer: CUSTOMER,
    trackingCode: null,
    paymentProvider: "mercadopago",
    providerPaymentId: "mp-123",
    recipientDocument: null,
    shippingOrderId: null,
    shippingLabelUrl: null,
    shippingLabelPriceCents: null,
    ...overrides,
  };
}

function ctx(id = "order-1") {
  return { params: Promise.resolve({ id }) };
}

describe("AdminOrderDetailPage", () => {
  it("chama notFound quando o pedido não existe", async () => {
    getOrderForAdmin.mockResolvedValue(null);
    await expect(AdminOrderDetailPage(ctx())).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("mostra dados do cliente, total e status", async () => {
    getOrderForAdmin.mockResolvedValue({ order: order(), items: [], events: [] });
    const jsx = await AdminOrderDetailPage(ctx());
    render(jsx);
    expect(screen.getByText("Mariana Silva")).toBeInTheDocument();
    expect(screen.getByText("R$ 149,00")).toBeInTheDocument();
    expect(screen.getByText("pago — já vai pra impressão")).toBeInTheDocument();
  });

  it("mostra os itens com nome do pet, tamanho e cores", async () => {
    getOrderForAdmin.mockResolvedValue({
      order: order(),
      items: [
        {
          id: "item-1",
          configuration: { pet_name: "THOR", size: "15cm", color_base: "#3D6EB5", color_band: "#E88BB1" },
          paramSchema: [
            { key: "color_base", type: "color", label: "cima", options: [{ label: "Azul", hex: "#3D6EB5" }] },
            { key: "color_band", type: "color", label: "base", options: [{ label: "Rosa", hex: "#E88BB1" }] },
          ],
          productName: "Comedouro Pet",
          unitPrice: 14900,
          snapshotUrl: null,
        },
      ],
      events: [],
    });
    const jsx = await AdminOrderDetailPage(ctx());
    render(jsx);
    expect(screen.getByText("THOR")).toBeInTheDocument();
    expect(screen.getByText(/azul \+ rosa/)).toBeInTheDocument();
  });

  it("mostra a linha do tempo só com eventos conhecidos", async () => {
    getOrderForAdmin.mockResolvedValue({
      order: order(),
      items: [],
      events: [
        { id: "e1", type: "paid", actor: "webhook", createdAt: new Date("2026-01-15T10:00:00") },
        { id: "e2", type: "tipo_desconhecido", actor: "sistema", createdAt: new Date("2026-01-15T11:00:00") },
      ],
    });
    const jsx = await AdminOrderDetailPage(ctx());
    render(jsx);
    expect(screen.getByText("pagamento confirmado")).toBeInTheDocument();
    expect(screen.queryByText("sistema")).not.toBeInTheDocument();
  });

  it("mostra a foto do produto quando há snapshot", async () => {
    getOrderForAdmin.mockResolvedValue({
      order: order(),
      items: [
        {
          id: "item-1",
          configuration: { pet_name: "THOR", size: "15cm", color_base: "#3D6EB5", color_band: "#E88BB1" },
          paramSchema: [],
          productName: "Comedouro Pet",
          unitPrice: 14900,
          snapshotUrl: "/uploads/snapshots/x.png",
        },
      ],
      events: [],
    });
    const jsx = await AdminOrderDetailPage(ctx());
    render(jsx);
    expect(screen.getByAltText("Produto personalizado")).toHaveAttribute("src", "/uploads/snapshots/x.png");
  });
});
