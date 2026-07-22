// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import LoginForm from "./LoginForm";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => ({ status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LoginForm", () => {
  it("envia o e-mail e mostra a confirmação de link enviado", async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByTestId("conta-email"), { target: { value: "cliente@example.com" } });
    fireEvent.click(screen.getByTestId("conta-entrar"));

    await waitFor(() => expect(screen.getByText("link enviado")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/conta/entrar",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "cliente@example.com" }),
      }),
    );
  });

  it("mostra erro quando o rate limit é atingido (429)", async () => {
    fetchMock.mockResolvedValue({ status: 429 });
    render(<LoginForm />);
    fireEvent.change(screen.getByTestId("conta-email"), { target: { value: "cliente@example.com" } });
    fireEvent.click(screen.getByTestId("conta-entrar"));

    expect(await screen.findByText(/muitas tentativas/)).toBeInTheDocument();
  });

  it("mostra erro quando o fetch falha (rede fora do ar)", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));
    render(<LoginForm />);
    fireEvent.change(screen.getByTestId("conta-email"), { target: { value: "cliente@example.com" } });
    fireEvent.click(screen.getByTestId("conta-entrar"));

    expect(await screen.findByText(/muitas tentativas/)).toBeInTheDocument();
  });

  it("desabilita o botão enquanto envia", async () => {
    let resolveFetch: (v: { status: number }) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));
    render(<LoginForm />);
    fireEvent.change(screen.getByTestId("conta-email"), { target: { value: "cliente@example.com" } });
    fireEvent.click(screen.getByTestId("conta-entrar"));

    await waitFor(() => expect(screen.getByTestId("conta-entrar")).toBeDisabled());
    resolveFetch!({ status: 200 });
  });
});
