import { describe, expect, it } from "vitest";
import { calculateTotalCents, validateCartItems, validateConfiguration } from "./pricing";
import { comedouroPet } from "@/db/seed-data";

const validConfig = {
  pet_name: "THOR",
  color_base: "#3D6EB5",
  color_band: "#E88BB1",
  size: "15cm",
};

describe("calculateTotalCents (preço é lei no servidor)", () => {
  it("usa o preço absoluto da variante", () => {
    expect(calculateTotalCents(comedouroPet, validConfig)).toBe(14900); // G — 15cm
  });

  it("soma priceDelta de opção ao preço da variante", () => {
    const product = {
      variants: [
        {
          ref: "g",
          label: "G",
          modelUrl: "/g.glb",
          price: 1500,
          discountType: null,
          discountValue: null,
          dimensions: "20cm",
        },
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

  it("aplica desconto percentual sobre o preço da variante", () => {
    const product = {
      variants: [
        {
          ref: "g",
          label: "G",
          modelUrl: "/g.glb",
          price: 10000,
          discountType: "percent" as const,
          discountValue: 10,
          dimensions: "20cm",
        },
      ],
      paramSchema: [
        {
          key: "size",
          type: "select" as const,
          label: "Tamanho",
          options: [{ label: "G", value: "g", variantRef: "g", priceDelta: 0 }],
        },
      ],
    };
    expect(calculateTotalCents(product, { size: "g" })).toBe(9000);
  });

  it("aplica desconto de valor fixo sobre o preço da variante", () => {
    const product = {
      variants: [
        {
          ref: "g",
          label: "G",
          modelUrl: "/g.glb",
          price: 10000,
          discountType: "flat" as const,
          discountValue: 1000,
          dimensions: "20cm",
        },
      ],
      paramSchema: [
        {
          key: "size",
          type: "select" as const,
          label: "Tamanho",
          options: [{ label: "G", value: "g", variantRef: "g", priceDelta: 0 }],
        },
      ],
    };
    expect(calculateTotalCents(product, { size: "g" })).toBe(9000);
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
      ["pet_name", "color_base", "color_band", "size"].sort(),
    );
  });
});

describe("validateCartItems (carrinho multi-item)", () => {
  it("valida e precifica cada item pelo schema do seu próprio produto", () => {
    const result = validateCartItems([
      { product: comedouroPet, configuration: validConfig },
      { product: comedouroPet, configuration: { ...validConfig, pet_name: "LUNA" } },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].unitPrice).toBe(14900);
    expect(result[1].configuration.pet_name).toBe("LUNA");
  });

  it("rejeita carrinho vazio", () => {
    expect(() => validateCartItems([])).toThrow(/vazio/);
  });

  it("propaga erro de validação de qualquer item do carrinho", () => {
    expect(() =>
      validateCartItems([{ product: comedouroPet, configuration: { ...validConfig, pet_name: "A" } }]),
    ).toThrow();
  });
});
