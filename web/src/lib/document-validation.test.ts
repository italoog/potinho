import { describe, expect, it } from "vitest";
import { isValidCNPJ, isValidCPF, isValidDocument } from "./document-validation";

describe("isValidCPF", () => {
  it("aceita CPF com dígito verificador correto", () => {
    expect(isValidCPF("111.444.777-35")).toBe(true);
    expect(isValidCPF("11144477735")).toBe(true);
  });

  it("rejeita dígito verificador errado", () => {
    // Mesmo CPF acima com o último dígito trocado.
    expect(isValidCPF("11144477734")).toBe(false);
    // Passa na checagem de tamanho, falha no dígito — o caso que motivou esta validação.
    expect(isValidCPF("12345678901")).toBe(false);
  });

  it("rejeita sequências repetidas e tamanhos errados", () => {
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
    expect(isValidCPF("1114447773")).toBe(false);
  });
});

describe("isValidCNPJ", () => {
  it("aceita CNPJ com dígito verificador correto", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11222333000181")).toBe(true);
  });

  it("rejeita dígito verificador errado e sequência repetida", () => {
    expect(isValidCNPJ("11222333000199")).toBe(false);
    expect(isValidCNPJ("11111111111111")).toBe(false);
  });
});

describe("isValidDocument", () => {
  it("detecta CPF ou CNPJ pelo tamanho", () => {
    expect(isValidDocument("111.444.777-35")).toBe(true);
    expect(isValidDocument("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita documento incompleto ou inválido", () => {
    expect(isValidDocument("")).toBe(false);
    expect(isValidDocument("123")).toBe(false);
    // 12 dígitos: não é CPF nem CNPJ.
    expect(isValidDocument("111444777350")).toBe(false);
  });
});
