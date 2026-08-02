import { afterEach, describe, expect, it, vi } from "vitest";
import { trackMetaPixel } from "./meta-pixel";

afterEach(() => {
  delete window.fbq;
});

describe("trackMetaPixel", () => {
  it("não faz nada quando window.fbq não está carregado", () => {
    expect(() => trackMetaPixel("PageView")).not.toThrow();
  });

  it("chama fbq('track', evento, params) sem eventId", () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    trackMetaPixel("AddToCart", { value: 10, currency: "BRL" });
    expect(fbq).toHaveBeenCalledWith("track", "AddToCart", { value: 10, currency: "BRL" });
  });

  it("com eventId, manda eventID pra deduplicar com o Conversions API", () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    trackMetaPixel("Purchase", { value: 149 }, "order-123");
    expect(fbq).toHaveBeenCalledWith("track", "Purchase", { value: 149 }, { eventID: "order-123" });
  });

  it("sem params, manda objeto vazio", () => {
    const fbq = vi.fn();
    window.fbq = fbq;
    trackMetaPixel("PageView");
    expect(fbq).toHaveBeenCalledWith("track", "PageView", {});
  });
});
