import { describe, expect, it } from "vitest";
import { formatBRL } from "./money";

describe("formatBRL", () => {
  it("formata centavos em reais pt-BR", () => {
    // Intl usa espaço não separável entre R$ e o número
    expect(formatBRL(12990).replace(/ /g, " ")).toBe("R$ 129,90");
  });

  it("formata zero", () => {
    expect(formatBRL(0).replace(/ /g, " ")).toBe("R$ 0,00");
  });

  it("rejeita valores não inteiros (float não é dinheiro)", () => {
    expect(() => formatBRL(129.9)).toThrow();
  });
});
