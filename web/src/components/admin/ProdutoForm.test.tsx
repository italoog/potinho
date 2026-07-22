// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ProdutoForm from "./ProdutoForm";
import { comedouroPet } from "@/db/seed-data";
import type { Product } from "@/lib/products";

/**
 * ProdutoForm (9.5): edição de preço/desconto/envio, cadastro/remoção de tamanho e cor.
 * Cobre o cálculo de preço final com desconto, os 3 fetches (produto, tamanho, cor) e as
 * confirmações de remoção — a lógica toda vive no componente, sem lib equivalente pra testar.
 */

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function product(): Product {
  return {
    id: crypto.randomUUID(),
    ...comedouroPet,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Product;
}

let fetchMock: ReturnType<typeof vi.fn>;
let confirmMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  refresh.mockClear();
  confirmMock = vi.fn(() => true);
  vi.stubGlobal("confirm", confirmMock);
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ProdutoForm — preço/desconto por tamanho", () => {
  it("mostra o preço final sem desconto", () => {
    render(<ProdutoForm product={product()} />);
    expect(screen.getByText("R$ 149,00")).toBeInTheDocument();
  });

  it("aplica desconto percentual no preço final exibido", () => {
    render(<ProdutoForm product={product()} />);
    const discountSelects = screen.getAllByDisplayValue("sem desconto");
    fireEvent.change(discountSelects[2], { target: { value: "percent" } }); // G — 15cm é o 3º variant

    const valueInput = screen.getAllByRole("spinbutton").find((el) => (el as HTMLInputElement).step === "1")!;
    fireEvent.change(valueInput, { target: { value: "10" } });
    // 14900 - 10% = 13410
    expect(screen.getByText("R$ 134,10")).toBeInTheDocument();
  });

  it("salva as alterações (PATCH) e mostra confirmação", async () => {
    render(<ProdutoForm product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: /salvo/ })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/produto",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("mostra erro quando o PATCH falha", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Dados inválidos" }) });
    render(<ProdutoForm product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/ }));
    expect(await screen.findByText("Dados inválidos")).toBeInTheDocument();
  });
});

describe("ProdutoForm — cores", () => {
  it("clicar numa cor alterna esgotado/disponível (sem fetch, é estado local até salvar)", () => {
    render(<ProdutoForm product={product()} />);
    // "Branco" existe 2x (color_base e color_band usam a mesma paleta) — pega a primeira
    const brancoButton = screen.getAllByText("Branco")[0].closest("button")!;
    fireEvent.click(brancoButton);
    expect(screen.getByText(/Branco.*esgotada/)).toBeInTheDocument();
  });

  it("remove uma cor após confirmação", async () => {
    render(<ProdutoForm product={product()} />);
    fireEvent.click(screen.getAllByLabelText("remover Branco")[0]);
    expect(confirmMock).toHaveBeenCalled();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/produto/cor",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("não remove a cor quando o admin cancela a confirmação", async () => {
    confirmMock.mockReturnValue(false);
    render(<ProdutoForm product={product()} />);
    fireEvent.click(screen.getAllByLabelText("remover Branco")[0]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cadastra uma cor nova", async () => {
    render(<ProdutoForm product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: /adicionar cor/ }));
    fireEvent.change(screen.getByPlaceholderText(/nome da cor/), { target: { value: "Dourado" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar cor/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/produto/cor", expect.objectContaining({ method: "POST" })),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.label).toBe("Dourado");
    expect(refresh).toHaveBeenCalled();
  });
});

describe("ProdutoForm — tamanhos", () => {
  it("remove um tamanho após confirmação", async () => {
    render(<ProdutoForm product={product()} />);
    fireEvent.click(screen.getAllByRole("button", { name: /^remover$/ })[0]);
    expect(confirmMock).toHaveBeenCalled();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/produto/tamanho",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("cadastra um tamanho novo (sem arquivo, reaproveita o fallback)", async () => {
    render(<ProdutoForm product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: /adicionar tamanho/ }));
    fireEvent.change(screen.getByPlaceholderText(/referência/), { target: { value: "gg" } });
    fireEvent.change(screen.getByPlaceholderText(/rótulo/), { target: { value: "GG — 20cm" } });
    fireEvent.change(screen.getByPlaceholderText(/dimensões/), { target: { value: "20cm de altura" } });
    fireEvent.change(screen.getByPlaceholderText("preço (R$)"), { target: { value: "199" } });
    fireEvent.change(screen.getByPlaceholderText("largura (cm)"), { target: { value: "22" } });
    fireEvent.change(screen.getByPlaceholderText("altura (cm)"), { target: { value: "22" } });
    fireEvent.change(screen.getByPlaceholderText("peso (kg)"), { target: { value: "1.5" } });

    fireEvent.click(screen.getByRole("button", { name: /salvar tamanho/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/produto/tamanho", expect.objectContaining({ method: "POST" })),
    );
    const form = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(form.get("ref")).toBe("gg");
    expect(form.get("price")).toBe("19900");
  });

  it("mostra erro quando o cadastro de tamanho falha", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Já existe um tamanho com essa referência" }) });
    render(<ProdutoForm product={product()} />);
    fireEvent.click(screen.getByRole("button", { name: /adicionar tamanho/ }));
    fireEvent.change(screen.getByPlaceholderText(/referência/), { target: { value: "15cm" } });
    fireEvent.change(screen.getByPlaceholderText(/rótulo/), { target: { value: "G — 15cm" } });
    fireEvent.change(screen.getByPlaceholderText(/dimensões/), { target: { value: "15cm de altura" } });
    fireEvent.change(screen.getByPlaceholderText("preço (R$)"), { target: { value: "149" } });
    fireEvent.change(screen.getByPlaceholderText("largura (cm)"), { target: { value: "20" } });
    fireEvent.change(screen.getByPlaceholderText("altura (cm)"), { target: { value: "18" } });
    fireEvent.change(screen.getByPlaceholderText("peso (kg)"), { target: { value: "0.8" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar tamanho/ }));

    expect(await screen.findByText("Já existe um tamanho com essa referência")).toBeInTheDocument();
  });
});
