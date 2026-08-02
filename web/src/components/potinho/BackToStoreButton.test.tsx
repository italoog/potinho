// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import BackToStoreButton from "./BackToStoreButton";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

afterEach(() => {
  cleanup();
  pathname = "/";
});

describe("BackToStoreButton", () => {
  it("não renderiza na home", () => {
    pathname = "/";
    render(<BackToStoreButton />);
    expect(screen.queryByTestId("back-to-store-button")).not.toBeInTheDocument();
  });

  it("não renderiza dentro do admin", () => {
    pathname = "/admin/pedidos";
    render(<BackToStoreButton />);
    expect(screen.queryByTestId("back-to-store-button")).not.toBeInTheDocument();
  });

  it("renderiza (e linka pra home) em outras páginas, como o checkout", () => {
    pathname = "/checkout";
    render(<BackToStoreButton />);
    const link = screen.getByTestId("back-to-store-button");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});
