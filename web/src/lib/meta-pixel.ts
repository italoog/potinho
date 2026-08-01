/** Meta Pixel (dataset "pixel concurso afiliado", já existente na conta de anúncios) — dispara client-side via window.fbq. */
export const META_PIXEL_ID = "754167164156903";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackMetaPixel(event: string, params?: Record<string, unknown>, eventId?: string): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (eventId) {
    window.fbq("track", event, params ?? {}, { eventID: eventId });
  } else {
    window.fbq("track", event, params ?? {});
  }
}
