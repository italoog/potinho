// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import MinhasCompras from "./MinhasCompras";
import type { OrderRow } from "@/db/schema";
import type { OrderItemWithProduct } from "@/lib/orders";

const signOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: (...args: unknown[]) => signOut(...args) } }));

function order(overrides: Partial<OrderRow> = {}): { order: OrderRow; items: OrderItemWithProduct[] } {
  const row = {
    id: crypto.randomUUID(),
    status: "paid",
    totalAmount: 14900,
    createdAt: new Date("2026-01-15"),
    ...overrides,
  } as OrderRow;
  const items = [
    { configuration: { pet_name: "THOR", color_base: "#3D6EB5", color_band: "#E88BB1" } } as unknown as OrderItemWithProduct,
  ];
  return { order: row, items };
}

let fetchMock: ReturnType<typeof vi.fn>;
let confirmMock: ReturnType<typeof vi.fn>;
let originalLocation: Location;

beforeEach(() => {
  signOut.mockClear();
  confirmMock = vi.fn(() => true);
  vi.stubGlobal("confirm", confirmMock);
  fetchMock = vi.fn(async () => ({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  originalLocation = window.location;
  // @ts-expect-error -- jsdom não permite navegação real
  delete window.location;
  window.location = { ...originalLocation, href: "" } as Location;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.location = originalLocation;
});

describe("MinhasCompras", () => {
  it("saudação usa o primeiro nome em minúsculas", () => {
    render(<MinhasCompras userName="Mariana Silva" orders={[]} />);
    expect(screen.getByText("oi, mariana")).toBeInTheDocument();
  });

  it("mostra mensagem quando não há pedidos", () => {
    render(<MinhasCompras userName="Mariana" orders={[]} />);
    expect(screen.getByText(/ainda não tem pedidos/)).toBeInTheDocument();
  });

  it("lista os pedidos com pet, status e total", () => {
    render(<MinhasCompras userName="Mariana" orders={[order()]} />);
    expect(screen.getByText("THOR")).toBeInTheDocument();
    expect(screen.getByText("R$ 149,00")).toBeInTheDocument();
    expect(screen.getByText("pago — já vai pra impressão")).toBeInTheDocument();
  });

  it("sair encerra a sessão e redireciona pra home", async () => {
    render(<MinhasCompras userName="Mariana" orders={[]} />);
    fireEvent.click(screen.getByTestId("conta-sair"));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(window.location.href).toBe("/");
  });

  it("excluir conta pede confirmação, chama a API e desloga", async () => {
    render(<MinhasCompras userName="Mariana" orders={[]} />);
    fireEvent.click(screen.getByText("excluir minha conta"));
    expect(confirmMock).toHaveBeenCalled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/conta/excluir", { method: "POST" }));
    expect(signOut).toHaveBeenCalled();
    expect(window.location.href).toBe("/");
  });

  it("cancela a exclusão sem chamar a API", () => {
    confirmMock.mockReturnValue(false);
    render(<MinhasCompras userName="Mariana" orders={[]} />);
    fireEvent.click(screen.getByText("excluir minha conta"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});
