// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "./page";

describe("PrivacyPage (LGPD, NFR §6 / 7.3 AC4)", () => {
  it("explica coleta mínima, conta opcional e retenção fiscal", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { name: "política de privacidade" })).toBeInTheDocument();
    expect(screen.getByText(/não armazenamos dados de cartão/)).toBeInTheDocument();
    expect(screen.getByText(/pode comprar sem criar conta/)).toBeInTheDocument();
  });
});
