// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import OrderActions from "./OrderActions";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  refresh.mockClear();
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OrderActions — transição de status", () => {
  it("lista só as transições permitidas pro status atual", () => {
    render(<OrderActions orderId="o1" currentStatus="paid" trackingCode={null} paymentProvider="mercadopago" />);
    const select = screen.getByRole("combobox");
    // paid -> [production, canceled] (mais a opção "selecione")
    expect(select.querySelectorAll("option")).toHaveLength(3);
  });

  it("status terminal (delivered) não mostra form de transição", () => {
    render(<OrderActions orderId="o1" currentStatus="delivered" trackingCode={null} paymentProvider="mercadopago" />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText(/não tem mais transições/)).toBeInTheDocument();
  });

  it("exige código de rastreio só quando o próximo status é 'shipped'", () => {
    render(<OrderActions orderId="o1" currentStatus="production" trackingCode={null} paymentProvider="mercadopago" />);
    expect(screen.queryByTestId("admin-tracking-code")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "shipped" } });
    expect(screen.getByTestId("admin-tracking-code")).toBeInTheDocument();
  });

  it("muda o status e atualiza a página", async () => {
    render(<OrderActions orderId="o1" currentStatus="paid" trackingCode={null} paymentProvider="mercadopago" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "production" } });
    fireEvent.click(screen.getByTestId("admin-change-status"));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/pedidos/o1/status",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ status: "production", trackingCode: undefined }) }),
    );
  });

  it("mostra erro quando a mudança de status falha", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Não é possível mudar de status" }) });
    render(<OrderActions orderId="o1" currentStatus="paid" trackingCode={null} paymentProvider="mercadopago" />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "production" } });
    fireEvent.click(screen.getByTestId("admin-change-status"));
    expect(await screen.findByText("Não é possível mudar de status")).toBeInTheDocument();
  });
});

describe("OrderActions — verificar pagamento", () => {
  it("só mostra o botão pra pending + mercadopago", () => {
    render(<OrderActions orderId="o1" currentStatus="paid" trackingCode={null} paymentProvider="mercadopago" />);
    expect(screen.queryByText(/verificar pagamento agora/)).not.toBeInTheDocument();
  });

  it("verifica e mostra o status retornado", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, status: "approved" }) });
    render(<OrderActions orderId="o1" currentStatus="pending" trackingCode={null} paymentProvider="mercadopago" />);
    fireEvent.click(screen.getByText(/verificar pagamento agora/));

    expect(await screen.findByText(/status no Mercado Pago: approved/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/pedidos/o1/verificar-pagamento", { method: "POST" });
    expect(refresh).toHaveBeenCalled();
  });
});

describe("OrderActions — reenviar e-mail", () => {
  it("reenvia e mostra confirmação", async () => {
    render(<OrderActions orderId="o1" currentStatus="paid" trackingCode={null} paymentProvider="mercadopago" />);
    fireEvent.click(screen.getByText(/reenviar e-mail/));
    await waitFor(() => expect(screen.getByText(/e-mail reenviado/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/pedidos/o1/reenviar-email", { method: "POST" });
  });
});
