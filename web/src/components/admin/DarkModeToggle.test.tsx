// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import DarkModeToggle from "./DarkModeToggle";

function withAdminRoot(initialDark: boolean) {
  const root = document.createElement("div");
  root.id = "admin-root";
  root.classList.toggle("dark", initialDark);
  document.body.appendChild(root);
  return root;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("DarkModeToggle (9.6 — escopo só do #admin-root)", () => {
  it("sincroniza com a classe já aplicada no #admin-root ao montar", async () => {
    withAdminRoot(true);
    render(<DarkModeToggle />);
    await waitFor(() => expect(screen.getByTestId("admin-dark-mode-toggle")).toHaveAttribute("aria-pressed", "true"));
  });

  it("clicar alterna a classe dark do #admin-root e persiste no localStorage", async () => {
    const root = withAdminRoot(false);
    render(<DarkModeToggle />);
    await waitFor(() => expect(screen.getByTestId("admin-dark-mode-toggle")).toHaveAttribute("aria-pressed", "false"));

    fireEvent.click(screen.getByTestId("admin-dark-mode-toggle"));

    expect(root.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("potinho-admin-theme")).toBe("dark");
    expect(screen.getByTestId("admin-dark-mode-toggle")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByTestId("admin-dark-mode-toggle"));
    expect(root.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("potinho-admin-theme")).toBe("light");
  });
});
