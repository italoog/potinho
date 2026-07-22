// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const listCoupons = vi.fn();
vi.mock("@/lib/coupons", () => ({ listCoupons }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const AdminCuponsPage = (await import("./page")).default;

afterEach(() => cleanup());

describe("AdminCuponsPage", () => {
  it("lista os cupons cadastrados", async () => {
    listCoupons.mockResolvedValue([
      {
        id: "c1",
        code: "PROMO10",
        active: true,
        productDiscountType: "percent",
        productDiscountValue: 10,
        shippingDiscountType: null,
        shippingDiscountValue: null,
        cumulative: false,
        usageLimit: null,
        usageCount: 0,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const jsx = await AdminCuponsPage();
    render(jsx);
    expect(screen.getByText("cupons de desconto")).toBeInTheDocument();
    expect(screen.getByText("PROMO10")).toBeInTheDocument();
  });
});
