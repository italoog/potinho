// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import TurntableCard from "./TurntableCard";
import { turntableClips } from "@/lib/site-config";

const clip = turntableClips.find((c) => c.id === "bege-marrom")!; // highlight:true

beforeEach(() => {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TurntableCard", () => {
  it("mostra as cores/nome do clip e o selo de destaque quando highlight=true", () => {
    render(<TurntableCard clip={clip} onCustomize={vi.fn()} />);
    expect(screen.getByText(`${clip.colorTopId} + ${clip.colorBottomId}`)).toBeInTheDocument();
    expect(screen.getByText("cores da potinho")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(clip.petName.toLowerCase()))).toBeInTheDocument();
  });

  it("hover (mouseenter) dá play e some a legenda; mouseleave pausa e reseta", async () => {
    const { container } = render(<TurntableCard clip={clip} onCustomize={vi.fn()} />);
    const hoverArea = container.querySelector(".cursor-pointer")!;

    fireEvent.mouseEnter(hoverArea);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();

    fireEvent.mouseLeave(hoverArea);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("toque alterna play/pause (1º toque = play)", () => {
    const { container } = render(<TurntableCard clip={clip} onCustomize={vi.fn()} />);
    const hoverArea = container.querySelector(".cursor-pointer")!;

    fireEvent.touchStart(hoverArea);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("clicar em 'personalizar com essas cores' chama onCustomize com o clip", () => {
    const onCustomize = vi.fn();
    render(<TurntableCard clip={clip} onCustomize={onCustomize} />);
    fireEvent.click(screen.getByRole("button", { name: /personalizar com essas cores/ }));
    expect(onCustomize).toHaveBeenCalledWith(clip);
  });
});
