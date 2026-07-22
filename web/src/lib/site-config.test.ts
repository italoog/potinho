import { describe, expect, it } from "vitest";
import { getColor, stockColors } from "./site-config";

describe("getColor", () => {
  it("encontra uma cor válida do estoque", () => {
    expect(getColor("azul")).toEqual(stockColors.find((c) => c.id === "azul"));
  });

  it("lança erro descritivo pra id desconhecido", () => {
    expect(() => getColor("cor-que-nao-existe")).toThrow(/Cor desconhecida/);
  });
});
