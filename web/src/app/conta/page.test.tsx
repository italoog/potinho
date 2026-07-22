// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuth: async () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const getOrdersForUser = vi.fn();
vi.mock("@/lib/orders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/orders")>();
  return { ...actual, getOrdersForUser };
});

const ContaPage = (await import("./page")).default;

afterEach(() => cleanup());

describe("ContaPage", () => {
  it("mostra o form de login quando deslogado", async () => {
    getSession.mockResolvedValue(null);
    const jsx = await ContaPage();
    render(jsx);
    expect(screen.getByText("minha conta")).toBeInTheDocument();
    expect(getOrdersForUser).not.toHaveBeenCalled();
  });

  it("mostra a lista de compras quando logado, usando o nome ou o prefixo do e-mail", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1", name: "", email: "ana@example.com" } });
    getOrdersForUser.mockResolvedValue([]);
    const jsx = await ContaPage();
    render(jsx);
    expect(screen.getByText("oi, ana")).toBeInTheDocument();
    expect(getOrdersForUser).toHaveBeenCalledWith("user-1");
  });
});
