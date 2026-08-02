// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

/** AdminLayout (9.1 AC2): 404 pra quem não é admin, sem revelar que a rota existe. */

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuth: async () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const AdminLayout = (await import("./layout")).default;

afterEach(() => cleanup());

describe("AdminLayout", () => {
  it("chama notFound sem sessão", async () => {
    getSession.mockResolvedValue(null);
    await expect(AdminLayout({ children: <p>conteúdo</p> })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("chama notFound pra usuário logado que não é admin", async () => {
    getSession.mockResolvedValue({ user: { role: "customer" } });
    await expect(AdminLayout({ children: <p>conteúdo</p> })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renderiza a navegação e o conteúdo pra admin", async () => {
    getSession.mockResolvedValue({ user: { role: "admin" } });
    const jsx = await AdminLayout({ children: <p>conteúdo</p> });
    render(jsx);
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "pedidos" })).toHaveAttribute("href", "/admin/pedidos");
  });
});
