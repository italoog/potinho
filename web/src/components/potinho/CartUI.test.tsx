// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import CartUI from "./CartUI";
import { CartProvider } from "@/components/potinho/CartContext";
import { writeCart, clearCart, type CartCheckoutItem } from "@/lib/cart-storage";
import type { CartEntry } from "@/components/potinho/CartContext";
import { comedouroPet } from "@/db/seed-data";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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
      <CartUI />
    </CartProvider>,
  );
  fireEvent.click(screen.getByTestId("cart-button"));
  if (items.length > 0) {
    await waitFor(() => expect(screen.getByText("THOR")).toBeInTheDocument());
  }
  return utils;
}

beforeEach(() => {
  clearCart();
  push.mockClear();
});

afterEach(() => {
  cleanup();
  clearCart();
});

describe("CartUI — carrinho vazio", () => {
  it("mostra o badge de contagem só quando há itens", () => {
    render(
      <CartProvider>
        <CartUI />
      </CartProvider>,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("abrir a gaveta sem itens mostra mensagem de carrinho vazio", async () => {
    await renderWithCart([]);
    expect(screen.getByText(/carrinho está vazio/)).toBeInTheDocument();
  });
});

describe("CartUI — com itens", () => {
  it("lista o item, mostra o total e o badge de contagem", async () => {
    await renderWithCart([cartItem()]);
    expect(screen.getByText("THOR")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 149,00")).toHaveLength(2); // preço do item + total
    expect(screen.getByLabelText(/abrir carrinho/)).toHaveTextContent("1");
  });

  it("remover item esvazia a gaveta", async () => {
    await renderWithCart([cartItem()]);
    fireEvent.click(screen.getByLabelText("remover item"));
    await waitFor(() => expect(screen.getByText(/carrinho está vazio/)).toBeInTheDocument());
  });

  it("finalizar pedido fecha a gaveta e navega pro checkout", async () => {
    await renderWithCart([cartItem()]);
    fireEvent.click(screen.getByTestId("go-to-checkout"));
    expect(push).toHaveBeenCalledWith("/checkout");
    await waitFor(() => expect(screen.queryByText("THOR")).not.toBeInTheDocument());
  });

  it("botão fechar (X) fecha a gaveta sem navegar", async () => {
    await renderWithCart([cartItem()]);
    fireEvent.click(screen.getByLabelText("fechar carrinho"));
    expect(push).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("THOR")).not.toBeInTheDocument());
  });
});
