// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import FreeShippingBar from "./FreeShippingBar";

let freeShippingConfig = { enabled: true, minQuantity: 2 };
vi.mock("@/lib/site-config", () => ({
  get freeShipping() {
    return freeShippingConfig;
  },
}));

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
    FakeResizeObserver.instances.push(this);
  }
  observe() {
    this.callback([{ contentRect: { height: 48 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  freeShippingConfig = { enabled: true, minQuantity: 2 };
  localStorage.clear();
  FakeResizeObserver.instances = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.documentElement.style.removeProperty("--fsb-h");
});

const OFF_COUNTDOWN = { enabled: false, durationMinutes: 60, label: "oferta por tempo limitado" };

describe("FreeShippingBar", () => {
  it("não renderiza nada quando a promoção está desligada", () => {
    freeShippingConfig = { enabled: false, minQuantity: 2 };
    const { container } = render(<FreeShippingBar urgencyCountdown={OFF_COUNTDOWN} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra o texto de frete grátis com o mínimo configurado, sem contador quando ele está desligado", () => {
    freeShippingConfig = { enabled: true, minQuantity: 3 };
    const { container } = render(<FreeShippingBar urgencyCountdown={OFF_COUNTDOWN} />);
    expect(container.textContent).toContain("frete grátis");
    expect(container.textContent).toContain("a partir de 3 potinhos");
    expect(container.textContent).not.toContain("oferta por tempo limitado");
  });

  it("mostra a contagem regressiva quando o countdown está habilitado, e guarda o início no localStorage", () => {
    render(
      <FreeShippingBar
        urgencyCountdown={{ enabled: true, durationMinutes: 60, label: "oferta por tempo limitado" }}
      />,
    );
    expect(localStorage.getItem("potinho-urgency-start")).not.toBeNull();
  });

  it("a contagem decresce com o tempo (fake timers)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { container } = render(
      <FreeShippingBar urgencyCountdown={{ enabled: true, durationMinutes: 10, label: "oferta" }} />,
    );
    expect(container.textContent).toContain("00:10:00");
    act(() => vi.advanceTimersByTime(61_000));
    expect(container.textContent).toContain("00:08:59");
  });

  it("aplica padding menor (scroll) depois de rolar mais de 8px", () => {
    const { container } = render(<FreeShippingBar urgencyCountdown={OFF_COUNTDOWN} />);
    const fixedBar = container.querySelectorAll(".free-shipping-bar > div")[1] as HTMLElement;
    expect(fixedBar.className).toContain("py-4");

    Object.defineProperty(window, "scrollY", { value: 40, configurable: true });
    fireEvent.scroll(window);

    expect(fixedBar.className).toContain("py-2.5");
  });

  it("mede a altura da barra via ResizeObserver e publica em --fsb-h", () => {
    render(<FreeShippingBar urgencyCountdown={OFF_COUNTDOWN} />);
    expect(document.documentElement.style.getPropertyValue("--fsb-h")).toBe("48px");
  });
});
