// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import CuponsManager from "./CuponsManager";
import type { CouponRow } from "@/db/schema";

/**
 * CuponsManager (admin): CRUD de cupons. draftToPayload/draftFromCoupon (conversão % vs centavos,
 * data yyyy-mm-dd -> fim do dia) são funções não-exportadas — cobertas via comportamento observável.
 */

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function coupon(overrides: Partial<CouponRow> = {}): CouponRow {
  return {
    id: crypto.randomUUID(),
    code: "PROMO10",
    active: true,
    productDiscountType: "percent",
    productDiscountValue: 10,
    shippingDiscountType: null,
    shippingDiscountValue: null,
    cumulative: false,
    usageLimit: null,
    usageCount: 3,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;
let confirmMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  refresh.mockClear();
  confirmMock = vi.fn(() => true);
  vi.stubGlobal("confirm", confirmMock);
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CuponsManager — listagem", () => {
  it("mostra mensagem quando não há cupons", () => {
    render(<CuponsManager coupons={[]} />);
    expect(screen.getByText(/nenhum cupom cadastrado/)).toBeInTheDocument();
  });

  it("resume desconto, uso e status de cada cupom", () => {
    render(<CuponsManager coupons={[coupon({ usageLimit: 10 })]} />);
    expect(screen.getByText("PROMO10")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("3/10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ativo" })).toBeInTheDocument();
  });

  it("cupom sem limite mostra 'ilimitado'", () => {
    render(<CuponsManager coupons={[coupon({ usageLimit: null, usageCount: 5 })]} />);
    expect(screen.getByText("5 (ilimitado)")).toBeInTheDocument();
  });
});

describe("CuponsManager — criar", () => {
  it("cria um cupom novo com desconto percentual", async () => {
    render(<CuponsManager coupons={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /criar cupom/ }));
    fireEvent.change(screen.getByPlaceholderText(/código/), { target: { value: "novo15" } });

    fireEvent.change(screen.getByLabelText("desconto no produto"), { target: { value: "percent" } });
    fireEvent.change(screen.getByLabelText("% de desconto"), { target: { value: "15" } });

    fireEvent.click(screen.getByRole("button", { name: "salvar cupom" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.code).toBe("NOVO15");
    expect(body.productDiscountType).toBe("percent");
    expect(body.productDiscountValue).toBe(15);
  });

  it("mostra erro quando a criação falha (ex.: código duplicado)", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Já existe um cupom com esse código" }) });
    render(<CuponsManager coupons={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /criar cupom/ }));
    fireEvent.change(screen.getByPlaceholderText(/código/), { target: { value: "dup" } });
    fireEvent.click(screen.getByRole("button", { name: "salvar cupom" }));

    expect(await screen.findByText("Já existe um cupom com esse código")).toBeInTheDocument();
  });

  it("cancelar descarta o formulário sem chamar a API", () => {
    render(<CuponsManager coupons={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /criar cupom/ }));
    fireEvent.click(screen.getByRole("button", { name: "cancelar" }));
    expect(screen.queryByPlaceholderText(/código/)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("CuponsManager — editar", () => {
  it("preenche o form de edição com os dados do cupom e salva", async () => {
    const existing = coupon({ code: "ANTIGO", productDiscountValue: 20 });
    render(<CuponsManager coupons={[existing]} />);
    fireEvent.click(screen.getByText("editar"));

    expect(screen.getByDisplayValue("ANTIGO")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("ANTIGO"), { target: { value: "renomeado" } });
    fireEvent.click(screen.getByRole("button", { name: "salvar alterações" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/cupons/${existing.id}`,
      expect.objectContaining({ method: "PATCH" }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.code).toBe("RENOMEADO");
  });
});

describe("CuponsManager — toggle ativo/inativo", () => {
  it("alterna o status com um clique", async () => {
    const existing = coupon({ active: true });
    render(<CuponsManager coupons={[existing]} />);
    fireEvent.click(screen.getByRole("button", { name: "ativo" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.active).toBe(false);
  });
});

describe("CuponsManager — remover", () => {
  it("remove após confirmação", async () => {
    const existing = coupon();
    render(<CuponsManager coupons={[existing]} />);
    fireEvent.click(screen.getByText("remover"));
    expect(confirmMock).toHaveBeenCalled();

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/cupons/${existing.id}`, { method: "DELETE" });
  });

  it("não remove quando o admin cancela a confirmação", () => {
    confirmMock.mockReturnValue(false);
    render(<CuponsManager coupons={[coupon()]} />);
    fireEvent.click(screen.getByText("remover"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mostra erro quando a remoção falha", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<CuponsManager coupons={[coupon()]} />);
    fireEvent.click(screen.getByText("remover"));
    expect(await screen.findByText("Não foi possível remover o cupom")).toBeInTheDocument();
  });
});
