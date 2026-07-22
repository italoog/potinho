import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const searchAdminOrders = vi.fn();
vi.mock("@/lib/admin-orders", () => ({ searchAdminOrders }));

const { GET } = await import("./route");

function req(qs = ""): Request {
  return new Request(`http://localhost/api/admin/orders.csv${qs}`);
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/admin/orders.csv", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(404);
    expect(searchAdminOrders).not.toHaveBeenCalled();
  });

  it("gera o CSV com header e uma linha por pedido", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    searchAdminOrders.mockResolvedValue({
      total: 1,
      items: [
        {
          order: {
            createdAt: new Date("2026-01-15"),
            customer: { name: "Ana Silva", email: "ana@example.com", phone: "11999990000" },
            totalAmount: 14900,
            status: "paid",
            trackingCode: null,
          },
          petNames: ["THOR"],
        },
      ],
    });

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");

    const csv = await res.text();
    const [header, row] = csv.split("\n");
    expect(header).toBe("data,cliente,email,telefone,pets,total,status,rastreio");
    expect(row).toContain("Ana Silva");
    expect(row).toContain("THOR");
    expect(row).toContain("ana@example.com");
  });

  it("escapa vírgulas e aspas nos campos (CSV correto)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    searchAdminOrders.mockResolvedValue({
      total: 1,
      items: [
        {
          order: {
            createdAt: new Date("2026-01-15"),
            customer: { name: 'Ana "Silva", Jr' , email: "ana@example.com", phone: "11999990000" },
            totalAmount: 9900,
            status: "pending",
            trackingCode: null,
          },
          petNames: [],
        },
      ],
    });

    const res = await GET(req());
    const csv = await res.text();
    expect(csv).toContain('"Ana ""Silva"", Jr"');
  });

  it("neutraliza fórmula CSV prefixando aspa simples (P1-2)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    searchAdminOrders.mockResolvedValue({
      total: 1,
      items: [
        {
          order: {
            createdAt: new Date("2026-01-15"),
            customer: { name: "=1+1", email: "ana@example.com", phone: "11999990000" },
            totalAmount: 9900,
            status: "pending",
            trackingCode: null,
          },
          petNames: [],
        },
      ],
    });

    const res = await GET(req());
    const csv = await res.text();
    expect(csv).toContain("'=1+1");
  });

  it("repassa query e status pra searchAdminOrders", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    searchAdminOrders.mockResolvedValue({ total: 0, items: [] });
    await GET(req("?q=thor&status=paid"));
    expect(searchAdminOrders).toHaveBeenCalledWith({ query: "thor", status: "paid", page: 1, pageSize: 100_000 });
  });

  it("ignora status inválido no querystring", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    searchAdminOrders.mockResolvedValue({ total: 0, items: [] });
    await GET(req("?status=nao-existe"));
    expect(searchAdminOrders).toHaveBeenCalledWith({ query: undefined, status: undefined, page: 1, pageSize: 100_000 });
  });
});
