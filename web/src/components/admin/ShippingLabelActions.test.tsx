// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ShippingLabelActions from "./ShippingLabelActions";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const BASE_PROPS = {
  orderId: "order-1",
  recipientDocument: null,
  shippingOrderId: null,
  shippingLabelUrl: null,
  shippingLabelPriceCents: null,
  suggestedDeclaredValueCents: 14900,
};

function fillQuoteForm() {
  fireEvent.change(screen.getByLabelText(/cpf\/cnpj/), { target: { value: "123.456.789-01" } });
  fireEvent.change(screen.getByLabelText(/largura/), { target: { value: "20" } });
  fireEvent.change(screen.getByLabelText(/altura/), { target: { value: "15" } });
  fireEvent.change(screen.getByLabelText(/comprimento/), { target: { value: "20" } });
  fireEvent.change(screen.getByLabelText(/peso/), { target: { value: "1" } });
}

let fetchMock: ReturnType<typeof vi.fn>;
let confirmMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  refresh.mockClear();
  confirmMock = vi.fn(() => true);
  vi.stubGlobal("confirm", confirmMock);
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ShippingLabelActions — sem etiqueta", () => {
  it("sugere o valor declarado a partir do total dos produtos", () => {
    render(<ShippingLabelActions {...BASE_PROPS} />);
    expect(screen.getByLabelText(/valor declarado/)).toHaveValue(149);
  });

  it("cota a etiqueta (envia CPF só com dígitos) e aciona o refresh da página", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ priceCents: 2350 }) });
    render(<ShippingLabelActions {...BASE_PROPS} />);
    fillQuoteForm();
    fireEvent.click(screen.getByRole("button", { name: "cotar etiqueta" }));

    // a UI de "cotado" só aparece quando o server devolve shippingOrderId via prop (router.refresh) —
    // aqui confirmamos a chamada e o refresh, não o estado pós-refresh (fora do escopo deste componente isolado).
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/pedidos/order-1/etiqueta/cotar",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.recipientDocument).toBe("12345678901");
  });

  it("mostra erro quando a cotação falha", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "CEP de destino inválido" }) });
    render(<ShippingLabelActions {...BASE_PROPS} />);
    fillQuoteForm();
    fireEvent.click(screen.getByRole("button", { name: "cotar etiqueta" }));
    expect(await screen.findByText("CEP de destino inválido")).toBeInTheDocument();
  });
});

describe("ShippingLabelActions — cotado, aguardando compra", () => {
  const quotedProps = { ...BASE_PROPS, recipientDocument: "12345678901", shippingOrderId: "sf-1" };

  it("mostra confirmar compra / cancelar cotação", () => {
    render(<ShippingLabelActions {...quotedProps} />);
    expect(screen.getByRole("button", { name: "confirmar compra" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cancelar cotação" })).toBeInTheDocument();
  });

  it("campos da cotação ficam desabilitados", () => {
    render(<ShippingLabelActions {...quotedProps} />);
    expect(screen.getByLabelText(/cpf\/cnpj/)).toBeDisabled();
  });

  it("confirma a compra", async () => {
    render(<ShippingLabelActions {...quotedProps} />);
    fireEvent.click(screen.getByRole("button", { name: "confirmar compra" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/pedidos/order-1/etiqueta/comprar", { method: "POST" });
  });

  it("cancela a cotação após confirmação", async () => {
    render(<ShippingLabelActions {...quotedProps} />);
    fireEvent.click(screen.getByRole("button", { name: "cancelar cotação" }));
    expect(confirmMock).toHaveBeenCalled();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/pedidos/order-1/etiqueta/cancelar", { method: "POST" });
  });

  it("não cancela quando o admin desiste da confirmação", () => {
    confirmMock.mockReturnValue(false);
    render(<ShippingLabelActions {...quotedProps} />);
    fireEvent.click(screen.getByRole("button", { name: "cancelar cotação" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ShippingLabelActions — etiqueta comprada", () => {
  const labelProps = {
    ...BASE_PROPS,
    recipientDocument: "12345678901",
    shippingOrderId: "sf-1",
    shippingLabelUrl: "https://superfrete.example/label.pdf",
    shippingLabelPriceCents: 2350,
  };

  it("mostra o link do PDF e o preço pago", () => {
    render(<ShippingLabelActions {...labelProps} />);
    expect(screen.getByText(/comprada por R\$ 23,50/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir etiqueta/ })).toHaveAttribute(
      "href",
      "https://superfrete.example/label.pdf",
    );
  });

  it("cancela a etiqueta comprada após confirmação", async () => {
    render(<ShippingLabelActions {...labelProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cancelar etiqueta/ }));
    expect(confirmMock).toHaveBeenCalled();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/pedidos/order-1/etiqueta/cancelar", { method: "POST" });
  });
});
