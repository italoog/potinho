// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

const getPublishedProductBySlug = vi.fn();
vi.mock("@/lib/products", () => ({ getPublishedProductBySlug }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/components/potinho/PotinhoHome", () => ({
  default: () => <div data-testid="potinho-home-stub" />,
}));

const pageModule = await import("./page");
const Home = pageModule.default;

afterEach(() => cleanup());

function ctx(cor?: string) {
  return { searchParams: Promise.resolve({ cor }) };
}

function product(overrides: Record<string, unknown> = {}) {
  return {
    name: "Comedouro Pet Elevado com Nome",
    description: "descrição do produto",
    photos: ["/products/comedouro-pet/montado.png"],
    variants: [{ price: 9900 }, { price: 11900 }, { price: 14900 }],
    ...overrides,
  };
}

describe("Home (SEO)", () => {
  it("canonical fixo em '/' — não varia com ?cor= (evita conteúdo duplicado)", () => {
    expect(pageModule.metadata.alternates).toEqual({ canonical: "/" });
  });

  it("chama notFound quando o produto não existe", async () => {
    getPublishedProductBySlug.mockResolvedValue(null);
    await expect(Home(ctx())).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("gera Product JSON-LD com preço min/max dos variants e imagem em URL absoluta", async () => {
    getPublishedProductBySlug.mockResolvedValue(product());
    const jsx = await Home(ctx());
    const { container } = render(jsx);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.innerHTML);

    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe("Comedouro Pet Elevado com Nome");
    expect(data.offers.lowPrice).toBe("99.00");
    expect(data.offers.highPrice).toBe("149.00");
    expect(data.offers.offerCount).toBe(3);
    expect(data.image[0]).toMatch(/^https?:\/\/.+\/products\/comedouro-pet\/montado\.png$/);
  });

  it("escapa '<' no JSON-LD pra não fechar a tag <script> antes da hora", async () => {
    getPublishedProductBySlug.mockResolvedValue(product({ description: "menor que </script><script>alert(1)" }));
    const jsx = await Home(ctx());
    const { container } = render(jsx);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script!.innerHTML).not.toContain("</script><script>");
    const data = JSON.parse(script!.innerHTML);
    expect(data.description).toContain("</script>");
  });
});
