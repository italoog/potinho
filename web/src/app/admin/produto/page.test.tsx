// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { comedouroPet } from "@/db/seed-data";

/** AdminProdutoPage é um Server Component async — chamamos a função e renderizamos o JSX resolvido. */

const limit = vi.fn();
const from = vi.fn(() => ({ limit }));
const select = vi.fn(() => ({ from }));
vi.mock("@/db", () => ({ getDb: async () => ({ select }), products: {} }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));

const AdminProdutoPage = (await import("./page")).default;

afterEach(() => cleanup());

describe("AdminProdutoPage", () => {
  it("renderiza o ProdutoForm com o produto encontrado", async () => {
    const product = { id: crypto.randomUUID(), ...comedouroPet, createdAt: new Date(), updatedAt: new Date() };
    limit.mockResolvedValue([product]);

    const jsx = await AdminProdutoPage();
    render(jsx);
    expect(screen.getByText("produto")).toBeInTheDocument();
    expect(screen.getByText("R$ 149,00")).toBeInTheDocument(); // preço final do tamanho G, vindo do ProdutoForm
  });

  it("chama notFound quando não há produto cadastrado", async () => {
    limit.mockResolvedValue([]);
    await expect(AdminProdutoPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
