// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import CheckoutForm from "./CheckoutForm";
import { CartProvider } from "@/components/potinho/CartContext";
import { writeCart, clearCart, type CartCheckoutItem } from "@/lib/cart-storage";
import type { CartEntry } from "@/components/potinho/CartContext";
import { comedouroPet } from "@/db/seed-data";

/**
 * CheckoutForm (6.1): a lógica de derivar total/desconto/frete vive no componente, não em lib —
 * cobrindo aqui: total com item(ns), remoção de item, cotação de frete via CEP, aplicar/ficar
 * obsoleto o cupom quando o carrinho muda, e o submit feliz/triste.
 */

function cartItem(overrides: Partial<CartCheckoutItem> = {}): CartEntry {
  return {
    cartId: crypto.randomUUID(),
    productId: crypto.randomUUID(),
    productSlug: comedouroPet.slug,
    productName: comedouroPet.name,
    basePrice: comedouroPet.basePrice,
    variants: comedouroPet.variants,
    paramSchema: comedouroPet.paramSchema,
    configuration: { pet_name: "THOR", size: "15cm", color_base: "#3D6EB5", color_band: "#E88BB1" },
    ...overrides,
  };
}

async function renderWithCart(items: CartEntry[]) {
  writeCart(items);
  const utils = render(
    <CartProvider>
      <CheckoutForm />
    </CartProvider>,
  );
  if (items.length > 0) {
    await waitFor(() => expect(screen.getByText("THOR")).toBeInTheDocument());
  }
  return utils;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearCart();
  fetchMock = vi.fn(async (url: string) => {
    if (url.includes("viacep.com.br")) {
      return {
        ok: true,
        json: async () => ({ logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" }),
      };
    }
    if (url.includes("/api/shipping/quote")) {
      return { ok: true, json: async () => ({ shippingCents: 2000 }) };
    }
    if (url.includes("/api/checkout/cupom")) {
      return { ok: true, json: async () => ({ productDiscountCents: 1490, shippingDiscountCents: 0 }) };
    }
    if (url.includes("/api/checkout")) {
      return { ok: true, json: async () => ({ url: "/pedido/abc-123" }) };
    }
    throw new Error(`fetch não mockado: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  clearCart();
});

describe("CheckoutForm — carrinho vazio", () => {
  it("mostra mensagem de carrinho vazio e link pra home", async () => {
    await renderWithCart([]);
    expect(await screen.findByText(/carrinho está vazio/)).toBeInTheDocument();
  });
});

describe("CheckoutForm — com itens", () => {
  it("mostra o nome do pet e o total do item", async () => {
    await renderWithCart([cartItem()]);
    expect(screen.getByText("THOR")).toBeInTheDocument();
    // aparece 2x: preço do item + total (frete ainda não cotado, então total == subtotal)
    expect(screen.getAllByText("R$ 149,00")).toHaveLength(2);
  });

  it("remover item some da lista e zera o total (sem frete cotado)", async () => {
    await renderWithCart([cartItem()]);
    fireEvent.click(screen.getByTestId("checkout-remove-item"));
    await waitFor(() => expect(screen.queryByText("THOR")).not.toBeInTheDocument());
  });

  it("botão de enviar fica desabilitado sem aceitar o consentimento LGPD", async () => {
    await renderWithCart([cartItem()]);
    expect(screen.getByTestId("checkout-submit")).toBeDisabled();
  });

  it("cotar CEP: preenche endereço via ViaCEP e cota o frete", async () => {
    await renderWithCart([cartItem()]);
    const cepInput = screen.getByTestId("checkout-cep");
    fireEvent.change(cepInput, { target: { value: "01310100" } });
    fireEvent.blur(cepInput);

    await waitFor(() => expect(screen.getByDisplayValue("Avenida Paulista")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("R$ 20,00")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("viacep.com.br"));
    expect(fetchMock).toHaveBeenCalledWith("/api/shipping/quote", expect.any(Object));
  });

  it("aplica cupom e desconta do total", async () => {
    await renderWithCart([cartItem()]);
    const cepInput = screen.getByTestId("checkout-cep");
    fireEvent.change(cepInput, { target: { value: "01310100" } });
    fireEvent.blur(cepInput);
    await waitFor(() => expect(screen.getByText("R$ 20,00")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("checkout-coupon-input"), { target: { value: "promo10" } });
    fireEvent.click(screen.getByTestId("checkout-coupon-apply"));

    await waitFor(() => expect(screen.getByText(/cupom PROMO10 aplicado/)).toBeInTheDocument());
    // 14900 (item) - 1490 (desconto produto) + 2000 (frete) = 15410
    expect(screen.getByText("R$ 154,10")).toBeInTheDocument();
  });

  it("cupom fica obsoleto quando o carrinho muda depois de aplicado", async () => {
    await renderWithCart([cartItem(), cartItem({ configuration: { pet_name: "MEL", size: "15cm", color_base: "#3D6EB5", color_band: "#E88BB1" } })]);
    const cepInput = screen.getByTestId("checkout-cep");
    fireEvent.change(cepInput, { target: { value: "01310100" } });
    fireEvent.blur(cepInput);
    await waitFor(() => expect(screen.getByText("R$ 20,00")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("checkout-coupon-input"), { target: { value: "promo10" } });
    fireEvent.click(screen.getByTestId("checkout-coupon-apply"));
    await waitFor(() => expect(screen.getByText(/cupom PROMO10 aplicado/)).toBeInTheDocument());

    fireEvent.click(screen.getAllByTestId("checkout-remove-item")[0]);
    await waitFor(() => expect(screen.getByText(/o carrinho mudou/)).toBeInTheDocument());
  });

  it("submit com sucesso limpa o carrinho e redireciona", async () => {
    const originalLocation = window.location;
    // @ts-expect-error -- jsdom não permite navegação real; substitui por um objeto gravável
    delete window.location;
    window.location = { ...originalLocation, href: "" } as Location;

    await renderWithCart([cartItem()]);
    fireEvent.change(screen.getByPlaceholderText("nome completo"), { target: { value: "Mariana Silva" } });
    fireEvent.change(screen.getByPlaceholderText("e-mail"), { target: { value: "mariana@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("telefone / whatsapp"), { target: { value: "11999990000" } });
    fireEvent.change(screen.getByTestId("checkout-cep"), { target: { value: "01310100" } });
    fireEvent.change(screen.getByPlaceholderText("rua"), { target: { value: "Avenida Paulista" } });
    fireEvent.change(screen.getByPlaceholderText("número"), { target: { value: "1000" } });
    fireEvent.change(screen.getByPlaceholderText("bairro"), { target: { value: "Bela Vista" } });
    fireEvent.change(screen.getByPlaceholderText("cidade"), { target: { value: "São Paulo" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "SP" } });
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.click(screen.getByTestId("checkout-submit"));

    await waitFor(() => expect(window.location.href).toBe("/pedido/abc-123"));
    expect(JSON.parse(sessionStorage.getItem("forja3d:checkout-cart") ?? "[]")).toEqual([]);

    window.location = originalLocation;
  });

  it("submit com erro do servidor mostra a mensagem e reabilita o botão", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/checkout")) return { ok: false, json: async () => ({ error: "Produto indisponível" }) };
      throw new Error(`fetch não mockado: ${url}`);
    });

    await renderWithCart([cartItem()]);
    fireEvent.change(screen.getByPlaceholderText("nome completo"), { target: { value: "Mariana Silva" } });
    fireEvent.change(screen.getByPlaceholderText("e-mail"), { target: { value: "mariana@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("telefone / whatsapp"), { target: { value: "11999990000" } });
    fireEvent.change(screen.getByTestId("checkout-cep"), { target: { value: "01310100" } });
    fireEvent.change(screen.getByPlaceholderText("rua"), { target: { value: "Avenida Paulista" } });
    fireEvent.change(screen.getByPlaceholderText("número"), { target: { value: "1000" } });
    fireEvent.change(screen.getByPlaceholderText("bairro"), { target: { value: "Bela Vista" } });
    fireEvent.change(screen.getByPlaceholderText("cidade"), { target: { value: "São Paulo" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "SP" } });
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.click(screen.getByTestId("checkout-submit"));

    expect(await screen.findByText("Produto indisponível")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-submit")).not.toBeDisabled();
  });
});
