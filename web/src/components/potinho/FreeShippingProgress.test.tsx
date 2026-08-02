// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import FreeShippingProgress from "./FreeShippingProgress";

afterEach(cleanup);

describe("FreeShippingProgress (gatilho de frete grátis — freeShipping.minQuantity = 2)", () => {
  it("não renderiza nada com o carrinho vazio", () => {
    const { container } = render(<FreeShippingProgress itemCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("com 1 item: mostra 'falta 1 potinho' e a barra na metade", () => {
    const { container } = render(<FreeShippingProgress itemCount={1} />);
    expect(screen.getByText(/falta/)).toHaveTextContent("falta 1 potinho pro frete grátis");
    const fill = container.querySelector('[style*="width"]') as HTMLElement;
    expect(fill.style.width).toBe("50%");
  });

  it("com 2+ itens: mostra frete grátis garantido e a barra cheia", () => {
    const { container } = render(<FreeShippingProgress itemCount={2} />);
    expect(screen.getByText(/frete grátis garantido/)).toBeInTheDocument();
    const fill = container.querySelector('[style*="width"]') as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });
});
