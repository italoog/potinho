// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import Countdown from "./Countdown";

let dropCountdownConfig: { enabled: boolean; target: string; label: string } = {
  enabled: false,
  target: "2026-07-31T20:00:00-03:00",
  label: "primeiro drop",
};
vi.mock("@/lib/site-config", () => ({
  get dropCountdown() {
    return dropCountdownConfig;
  },
}));

beforeEach(() => {
  dropCountdownConfig = { enabled: false, target: "2026-07-31T20:00:00-03:00", label: "primeiro drop" };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Countdown", () => {
  it("não renderiza nada quando a flag está desligada", () => {
    const { container } = render(<Countdown />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza nada quando o drop já passou", () => {
    dropCountdownConfig = { enabled: true, target: "2020-01-01T00:00:00-03:00", label: "primeiro drop" };
    const { container } = render(<Countdown />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra dias/horas/min/seg até o alvo quando a flag está ligada e o drop é futuro", async () => {
    const target = new Date(Date.now() + 2 * 86_400_000); // 2 dias no futuro — não expira durante o teste
    dropCountdownConfig = { enabled: true, target: target.toISOString(), label: "primeiro drop" };

    const { container } = render(<Countdown />);

    // 1º tick vem de um requestAnimationFrame real (jsdom) — espera resolver.
    await waitFor(() => expect(container.textContent).toContain("primeiro drop"));
    expect(container.textContent).toContain("dias");
    expect(container.textContent).toContain("horas");
  });
});
