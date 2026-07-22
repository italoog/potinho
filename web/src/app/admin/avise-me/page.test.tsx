// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { comedouroPet } from "@/db/seed-data";

const limit = vi.fn();
const from = vi.fn(() => ({ limit }));
const select = vi.fn(() => ({ from }));
vi.mock("@/db", () => ({ getDb: async () => ({ select }), products: {} }));

const getPendingNotifyRequests = vi.fn();
vi.mock("@/lib/admin-notify", () => ({ getPendingNotifyRequests }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const AdminAviseMePage = (await import("./page")).default;

afterEach(() => cleanup());

describe("AdminAviseMePage", () => {
  it("mostra mensagem quando não há pedidos pendentes", async () => {
    limit.mockResolvedValue([{ ...comedouroPet, id: "p1" }]);
    getPendingNotifyRequests.mockResolvedValue([]);
    const jsx = await AdminAviseMePage();
    render(jsx);
    expect(screen.getByText("nenhum pedido pendente.")).toBeInTheDocument();
  });

  it("traduz o hex da cor pro label cadastrado no produto", async () => {
    limit.mockResolvedValue([{ ...comedouroPet, id: "p1" }]);
    getPendingNotifyRequests.mockResolvedValue([{ colorId: "#3d6eb5", emails: ["a@x.com"] }]);
    const jsx = await AdminAviseMePage();
    render(jsx);
    expect(screen.getByText("Azul")).toBeInTheDocument();
  });

  it("cai no próprio hex quando a cor não é mais encontrada no cadastro", async () => {
    limit.mockResolvedValue([{ ...comedouroPet, id: "p1" }]);
    getPendingNotifyRequests.mockResolvedValue([{ colorId: "#000000", emails: ["a@x.com"] }]);
    const jsx = await AdminAviseMePage();
    render(jsx);
    expect(screen.getByText("#000000")).toBeInTheDocument();
  });
});
