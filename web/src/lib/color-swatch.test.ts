import { describe, expect, it } from "vitest";
import { swatchBackground } from "./color-swatch";

describe("swatchBackground", () => {
  it("cor comum devolve o hex direto", () => {
    expect(swatchBackground({ hex: "#3D6EB5" })).toBe("#3D6EB5");
  });

  it("blend com 1 cor só (edge case) devolve o hex direto", () => {
    expect(swatchBackground({ hex: "#3D6EB5", blend: ["#3D6EB5"] })).toBe("#3D6EB5");
  });

  it("blend de 2 cores gera conic-gradient com fatias de 180deg", () => {
    expect(swatchBackground({ hex: "#000", blend: ["#3D6EB5", "#E88BB1"] })).toBe(
      "conic-gradient(#3D6EB5 0deg 180deg, #E88BB1 180deg 360deg)",
    );
  });

  it("blend de 4 cores gera fatias de 90deg", () => {
    const result = swatchBackground({ hex: "#000", blend: ["#111", "#222", "#333", "#444"] });
    expect(result).toBe("conic-gradient(#111 0deg 90deg, #222 90deg 180deg, #333 180deg 270deg, #444 270deg 360deg)");
  });
});
