// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { forwardRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import PotinhoHome from "./PotinhoHome";
import { comedouroPet } from "@/db/seed-data";
import { clearCart } from "@/lib/cart-storage";
import type { Product } from "@/lib/products";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("./PotinhoViewer", () => ({
  default: ({ topHex, bottomHex }: { topHex: string; bottomHex: string }) => (
    <div data-testid="viewer">
      {topHex}/{bottomHex}
    </div>
  ),
}));

vi.mock(
  "./Customizer",
  () => ({
    default: forwardRef<HTMLDivElement, { selection: { colorBaseHex: string; colorBandHex: string } }>(
      ({ selection }, ref) => (
        <div ref={ref} data-testid="customizer">
          {selection.colorBaseHex}/{selection.colorBandHex}
        </div>
      ),
    ),
  }),
);

const product = { id: crypto.randomUUID(), ...comedouroPet, createdAt: new Date(), updatedAt: new Date() } as Product;

beforeEach(() => {
  clearCart();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  clearCart();
  vi.restoreAllMocks();
});

describe("PotinhoHome", () => {
  it("seleção default: bege (cima) + marrom (base)", async () => {
    render(<PotinhoHome product={product} />);
    await waitFor(() => expect(screen.getByTestId("customizer")).toHaveTextContent("#E8D9C8/#5A4032"));
    expect(screen.getByTestId("viewer")).toHaveTextContent("#E8D9C8/#5A4032");
  });

  it("initialComboId pré-seleciona a combinação do clip (branco-preto) e rola até o preview", async () => {
    render(<PotinhoHome product={product} initialComboId="branco-preto" />);
    await waitFor(() => expect(screen.getByTestId("customizer")).toHaveTextContent("#F4F4F4/#1A1A1A"));
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it("clicar 'personalizar com essas cores' num card atualiza a seleção e rola até o preview", async () => {
    render(<PotinhoHome product={product} />);
    const card = screen.getByTestId("turntable-azul-cinza");
    fireEvent.click(within(card).getByRole("button", { name: /personalizar com essas cores/ }));

    await waitFor(() => expect(screen.getByTestId("customizer")).toHaveTextContent("#3D6EB5/#9E9E9E"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("clicar no CTA do hero ('quero o meu') rola até o preview sem navegar", () => {
    render(<PotinhoHome product={product} />);
    fireEvent.click(screen.getByRole("link", { name: /quero o meu/ }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
