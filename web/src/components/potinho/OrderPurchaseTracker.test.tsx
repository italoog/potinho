// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import OrderPurchaseTracker from "./OrderPurchaseTracker";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  window.fbq = vi.fn();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.fbq;
  vi.useRealTimers();
});

describe("OrderPurchaseTracker (fix da corrida com o webhook do Mercado Pago)", () => {
  it("status já pago no mount: dispara Purchase direto, sem polling", () => {
    render(<OrderPurchaseTracker orderId="o1" token="t1" status="paid" totalAmountCents={9900} />);

    expect(window.fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      { value: 99, currency: "BRL", content_ids: ["o1"], content_type: "product" },
      { eventID: "o1" },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("status pending: faz polling e dispara Purchase assim que o status virar pago", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: "paid" }) });

    render(<OrderPurchaseTracker orderId="o2" token="t2" status="pending" totalAmountCents={9900} />);
    expect(window.fbq).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/pedido/t2/status");
    expect(window.fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      { value: 99, currency: "BRL", content_ids: ["o2"], content_type: "product" },
      { eventID: "o2" },
    );

    // parou de fazer polling depois de confirmar o pagamento
    const callsAfterPaid = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(callsAfterPaid);
  });

  it("status pending sem confirmação: para de fazer polling após o teto de tentativas (não sobrecarrega o banco)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: "pending" }) });

    render(<OrderPurchaseTracker orderId="o3" token="t3" status="pending" totalAmountCents={9900} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(8); // MAX_POLL_ATTEMPTS
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("dedupe: não dispara de novo se já disparou pra esse pedido antes (localStorage)", () => {
    localStorage.setItem("fb_purchase_o4", "1");
    render(<OrderPurchaseTracker orderId="o4" token="t4" status="paid" totalAmountCents={9900} />);
    expect(window.fbq).not.toHaveBeenCalled();
  });
});
