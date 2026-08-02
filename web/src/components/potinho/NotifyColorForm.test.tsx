// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import NotifyColorForm from "./NotifyColorForm";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NotifyColorForm (6.4 AC1/AC2)", () => {
  it("envia o e-mail e mostra a confirmação; onDone dispara depois do delay", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockResolvedValue({ ok: true });
    const onDone = vi.fn();
    render(<NotifyColorForm colorId="#1A1A1A" colorLabel="Preto" onDone={onDone} />);

    fireEvent.change(screen.getByTestId("notify-color-email"), { target: { value: "cliente@example.com" } });
    fireEvent.click(screen.getByTestId("notify-color-submit"));

    await vi.waitFor(() => expect(screen.getByText(/avisamos você quando preto voltar/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "cliente@example.com", colorId: "#1A1A1A" }),
      }),
    );

    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2500);
    expect(onDone).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("mostra erro quando a API falha", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<NotifyColorForm colorId="#1A1A1A" colorLabel="Preto" onDone={vi.fn()} />);

    fireEvent.change(screen.getByTestId("notify-color-email"), { target: { value: "cliente@example.com" } });
    fireEvent.click(screen.getByTestId("notify-color-submit"));

    await waitFor(() => expect(screen.getByText("não deu certo — tente de novo.")).toBeInTheDocument());
  });
});
