import { describe, expect, it } from "vitest";
import { calculateTotalCents, validateConfiguration } from "./pricing";
import { comedouroPet } from "@/db/seed-data";

const validConfig = {
  pet_name: "THOR",
  color_base: "#1E5AA8",
  color_band: "#E85D9A",
  color_name: "#F4F4F4",
  size: "15cm",
};

describe("calculateTotalCents (preço é lei no servidor)", () => {
  it("calcula preço base + deltas de variante", () => {
    expect(calculateTotalCents(comedouroPet, validConfig)).toBe(8990);
  });

  it("soma priceDelta de opção e de variante", () => {
    const product = {
      basePrice: 1000,
      variants: [
        { ref: "g", label: "G", modelUrl: "/g.glb", priceDelta: 500, dimensions: "20cm" },
      ],
      paramSchema: [
        {
          key: "size",
          type: "select" as const,
          label: "Tamanho",
          options: [{ label: "G", value: "g", variantRef: "g", priceDelta: 1500 }],
        },
      ],
    };
    expect(calculateTotalCents(product, { size: "g" })).toBe(3000);
  });

  it("rejeita opção de select inexistente", () => {
    expect(() => calculateTotalCents(comedouroPet, { ...validConfig, size: "999cm" })).toThrow();
  });
});

describe("validateConfiguration (nunca confiar no front)", () => {
  it("aceita e normaliza configuração válida (nome em MAIÚSCULAS)", () => {
    const clean = validateConfiguration(comedouroPet, { ...validConfig, pet_name: "thor" });
    expect(clean.pet_name).toBe("THOR");
  });

  it("rejeita cor fora da paleta (ataque de payload)", () => {
    expect(() =>
      validateConfiguration(comedouroPet, { ...validConfig, color_base: "#BADA55" }),
    ).toThrow(/paleta/);
  });

  it("rejeita nome fora dos limites", () => {
    expect(() => validateConfiguration(comedouroPet, { ...validConfig, pet_name: "A" })).toThrow();
    expect(() =>
      validateConfiguration(comedouroPet, { ...validConfig, pet_name: "ABCDEFGHIJK" }),
    ).toThrow();
  });

  it("rejeita parâmetro ausente", () => {
    const incomplete: Record<string, unknown> = { ...validConfig };
    delete incomplete.color_band;
    expect(() => validateConfiguration(comedouroPet, incomplete)).toThrow(/obrigatório/);
  });

  it("descarta chaves desconhecidas (whitelist do schema)", () => {
    const clean = validateConfiguration(comedouroPet, { ...validConfig, __proto__x: "hack" });
    expect(Object.keys(clean).sort()).toEqual(
      ["pet_name", "color_base", "color_band", "color_name", "size"].sort(),
    );
  });
});
