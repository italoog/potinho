// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Marquee, { PawIcon, BoneIcon } from "./Marquee";
import { marqueePhrases } from "@/lib/site-config";

describe("Marquee", () => {
  it("repete as frases da marca (8x pra loop contínuo) com as cores padrão", () => {
    const { container } = render(<Marquee />);
    const track = container.querySelector(".potinho-marquee-track")!;
    expect(track.children).toHaveLength(marqueePhrases.length * 4 * 2);
    expect(container.firstChild).toHaveClass("bg-potinho-chocolate", "text-potinho-bege");
  });

  it("inverte as cores quando inverted=true", () => {
    const { container } = render(<Marquee inverted />);
    expect(container.firstChild).toHaveClass("bg-potinho-bege", "text-potinho-chocolate");
  });
});

describe("PawIcon / BoneIcon", () => {
  it("renderizam como svg decorativo (aria-hidden)", () => {
    const { container: paw } = render(<PawIcon className="h-4 w-4" />);
    expect(paw.querySelector("svg")).toHaveAttribute("aria-hidden");
    expect(paw.querySelector("svg")).toHaveClass("h-4", "w-4");

    const { container: bone } = render(<BoneIcon />);
    expect(bone.querySelector("svg")).toHaveAttribute("aria-hidden");
  });
});
