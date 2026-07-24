// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import NovoPedidoForm from "./NovoPedidoForm";
import { comedouroPet } from "@/db/seed-data";
import type { Product } from "@/lib/products";

/** NovoPedidoForm (9.4): criação manual de pedido pelo admin — mesma revalidação de preço do checkout. */

function product(): Product {
  return { id: crypto.randomUUID(), ...comedouroPet, createdAt: new Date(), updatedAt: new Date() } as Product;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ orderId: "order-1" }) }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NovoPedidoForm — itens", () => {
  it("mostra o total de 1 item (tamanho default)", () => {
    render(<NovoPedidoForm product={product()} />);
    expect(screen.getByText(/total dos itens: R\$ 99,00/)).toBeInTheDocument();
  });

  it("trocar o tamanho recalcula o total", () => {
    render(<NovoPedidoForm product={product()} />);
    fireEvent.change(screen.getByDisplayValue("P — 5cm"), { target: { value: "15cm" } });
    expect(screen.getByText(/total dos itens: R\$ 149,00/)).toBeInTheDocument();
  });

  it("adicionar item soma o total e permite remover", () => {
    render(<NovoPedidoForm product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: /adicionar item/ }));
    expect(screen.getByText(/total dos itens: R\$ 198,00/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "remover item" })[0]);
    expect(screen.getByText(/total dos itens: R\$ 99,00/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "remover item" })).not.toBeInTheDocument();
  });
});

describe("NovoPedidoForm — submit", () => {
  it("marcar como pago envia outcome=paid e mostra a confirmação", async () => {
    const p = product();
    render(<NovoPedidoForm product={p} />);
    fireEvent.change(screen.getAllByPlaceholderText("nome do pet")[0], { target: { value: "thor" } });
    fireEvent.click(screen.getByRole("button", { name: "marcar como pago" }));

    await waitFor(() => expect(screen.getByText("pedido criado ✓")).toBeInTheDocument());
    expect(screen.getByText("marcado como pago.")).toBeInTheDocument();

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.outcome).toBe("paid");
    expect(body.items[0].configuration.pet_name).toBe("THOR"); // maiúsculas
    expect(body.items[0].productId).toBe(p.id);
  });

  it("gerar link mostra o campo de link de pagamento", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ orderId: "order-2", paymentLink: "https://mp.example.com/checkout/xyz" }),
    });
    render(<NovoPedidoForm product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: /gerar link de pagamento/ }));

    await waitFor(() => expect(screen.getByDisplayValue("https://mp.example.com/checkout/xyz")).toBeInTheDocument());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.outcome).toBe("link");
  });

  it("respeita o override de frete quando informado manualmente", async () => {
    render(<NovoPedidoForm product={product()} />);
    fireEvent.change(screen.getByPlaceholderText(/valor em R\$/), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "marcar como pago" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.shippingCentsOverride).toBe(3000);
  });

  it("cota o frete ao sair do campo de cep e permite selecionar uma opção", async () => {
    fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("viacep.com.br")) {
        return { ok: true, json: async () => ({ logradouro: "Rua A", bairro: "Centro", localidade: "SP", uf: "SP" }) };
      }
      if (String(url).includes("/api/shipping/quote")) {
        return {
          ok: true,
          json: async () => ({
            shippingCents: 1850,
            options: [
              { service: "SEDEX", priceCents: 1850 },
              { service: "PAC", priceCents: 3290 },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({ orderId: "order-1" }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<NovoPedidoForm product={product()} />);
    fireEvent.change(screen.getByPlaceholderText("cep"), { target: { value: "01310-100" } });
    fireEvent.blur(screen.getByPlaceholderText("cep"));

    await waitFor(() => expect(screen.getByText("SEDEX")).toBeInTheDocument());
    expect(screen.getByText("PAC")).toBeInTheDocument();

    fireEvent.click(screen.getByText("SEDEX"));
    expect(screen.getByText(/R\$ 117,50/)).toBeInTheDocument(); // 99,00 (item) + 18,50 (frete)
  });

  it("mostra erro quando a criação falha", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Produto indisponível" }) });
    render(<NovoPedidoForm product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: "marcar como pago" }));
    expect(await screen.findByText("Produto indisponível")).toBeInTheDocument();
  });
});
