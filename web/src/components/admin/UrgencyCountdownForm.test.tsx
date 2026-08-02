// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import UrgencyCountdownForm from "./UrgencyCountdownForm";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  refresh.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const CONFIG = { enabled: true, durationMinutes: 167, label: "oferta por tempo limitado" };

describe("UrgencyCountdownForm (9.2 admin)", () => {
  it("pré-preenche horas/minutos a partir de durationMinutes (167min = 2h47)", () => {
    render(<UrgencyCountdownForm config={CONFIG} />);
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("47")).toBeInTheDocument();
    expect(screen.getByDisplayValue("oferta por tempo limitado")).toBeInTheDocument();
  });

  it("salva com sucesso: converte horas+minutos em durationMinutes e chama router.refresh", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<UrgencyCountdownForm config={CONFIG} />);

    fireEvent.change(screen.getByDisplayValue("2"), { target: { value: "1" } });
    fireEvent.change(screen.getByDisplayValue("47"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "salvar" }));

    await waitFor(() => expect(screen.getByText("salvo ✓")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/configuracoes/urgencia",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ enabled: true, durationMinutes: 90, label: "oferta por tempo limitado" }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("alterna 'contador ativo' e edita o texto exibido", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<UrgencyCountdownForm config={CONFIG} />);

    const checkbox = screen.getByRole("checkbox", { name: "contador ativo" });
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    fireEvent.change(screen.getByDisplayValue("oferta por tempo limitado"), { target: { value: "última chance" } });
    fireEvent.click(screen.getByRole("button", { name: "salvar" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/configuracoes/urgencia",
        expect.objectContaining({
          body: JSON.stringify({ enabled: false, durationMinutes: 167, label: "última chance" }),
        }),
      ),
    );
  });

  it("mostra o erro do servidor quando o PATCH falha", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Dados inválidos" }) });
    render(<UrgencyCountdownForm config={CONFIG} />);

    fireEvent.click(screen.getByRole("button", { name: "salvar" }));

    expect(await screen.findByText("Dados inválidos")).toBeInTheDocument();
  });
});
