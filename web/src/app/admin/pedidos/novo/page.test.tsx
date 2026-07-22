// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { comedouroPet } from "@/db/seed-data";

const getPublishedProductBySlug = vi.fn();
vi.mock("@/lib/products", () => ({ getPublishedProductBySlug }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const AdminNovoPedidoPage = (await import("./page")).default;

afterEach(() => cleanup());

describe("AdminNovoPedidoPage", () => {
  it("renderiza o NovoPedidoForm com o produto publicado", async () => {
    getPublishedProductBySlug.mockResolvedValue({
      id: crypto.randomUUID(),
      ...comedouroPet,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const jsx = await AdminNovoPedidoPage();
    render(jsx);
    expect(screen.getByText("criar pedido")).toBeInTheDocument();
    expect(getPublishedProductBySlug).toHaveBeenCalledWith("comedouro-pet");
  });

  it("chama notFound quando o produto não está publicado", async () => {
    getPublishedProductBySlug.mockResolvedValue(null);
    await expect(AdminNovoPedidoPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
