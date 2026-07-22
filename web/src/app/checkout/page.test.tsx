// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CheckoutPage from "./page";

afterEach(() => cleanup());

describe("CheckoutPage", () => {
  it("renderiza o CheckoutForm dentro do CartProvider (carrinho vazio por padrão)", async () => {
    render(<CheckoutPage />);
    expect(await screen.findByText(/carrinho está vazio/)).toBeInTheDocument();
  });
});
