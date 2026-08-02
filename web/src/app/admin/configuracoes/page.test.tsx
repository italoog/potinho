// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const getUrgencyCountdown = vi.fn();
vi.mock("@/lib/urgency-countdown", () => ({ getUrgencyCountdown }));

vi.mock("@/components/admin/UrgencyCountdownForm", () => ({
  default: ({ config }: { config: { label: string } }) => <div data-testid="urgency-form">{config.label}</div>,
}));

const AdminConfiguracoesPage = (await import("./page")).default;

afterEach(() => cleanup());

describe("AdminConfiguracoesPage", () => {
  it("busca a config de urgência e repassa pro form", async () => {
    getUrgencyCountdown.mockResolvedValue({ enabled: true, durationMinutes: 60, label: "oferta relâmpago" });
    const jsx = await AdminConfiguracoesPage();
    render(jsx);
    expect(screen.getByText("configurações")).toBeInTheDocument();
    expect(screen.getByTestId("urgency-form")).toHaveTextContent("oferta relâmpago");
  });
});
