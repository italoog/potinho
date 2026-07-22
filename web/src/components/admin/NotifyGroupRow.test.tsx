// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import NotifyGroupRow from "./NotifyGroupRow";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  refresh.mockClear();
  fetchMock = vi.fn(async () => ({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NotifyGroupRow", () => {
  it("mostra a cor, e-mails e a contagem no botão", () => {
    render(<NotifyGroupRow colorId="#3D6EB5" colorLabel="Azul" emails={["a@x.com", "b@x.com"]} />);
    expect(screen.getByText("Azul")).toBeInTheDocument();
    expect(screen.getByText("a@x.com, b@x.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "avisar 2" })).toBeInTheDocument();
  });

  it("notifica e mostra confirmação", async () => {
    render(<NotifyGroupRow colorId="#3D6EB5" colorLabel="Azul" emails={["a@x.com"]} />);
    fireEvent.click(screen.getByRole("button", { name: "avisar 1" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /avisado/ })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/avise-me",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ colorId: "#3D6EB5", colorLabel: "Azul" }) }),
    );
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /avisado/ })).toBeDisabled();
  });

  it("mostra falha quando a notificação dá erro", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<NotifyGroupRow colorId="#3D6EB5" colorLabel="Azul" emails={["a@x.com"]} />);
    fireEvent.click(screen.getByRole("button", { name: "avisar 1" }));
    expect(await screen.findByText("falhou")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
