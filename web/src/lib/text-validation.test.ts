import { describe, expect, it } from "vitest";
import { validateCustomText } from "./text-validation";

const param = { min: 2, max: 10, label: "Nome do pet" };

describe("validateCustomText (V-05)", () => {
  it("aceita nome válido e normaliza para maiúsculas", () => {
    const r = validateCustomText("thor", param);
    expect(r).toEqual({ ok: true, value: "THOR" });
  });

  it("aceita acentos pt-BR (FAÍSCA) e espaço", () => {
    expect(validateCustomText("Faísca", param).ok).toBe(true);
    expect(validateCustomText("REX JR", param).ok).toBe(true);
  });

  it("rejeita emoji com mensagem amigável", () => {
    const r = validateCustomText("THOR🐶", param);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/emojis/i);
  });

  it("rejeita fora dos limites 2–10", () => {
    expect(validateCustomText("A", param).ok).toBe(false);
    expect(validateCustomText("ABCDEFGHIJK", param).ok).toBe(false);
  });

  it("rejeita vazio/só espaços", () => {
    expect(validateCustomText("   ", param).ok).toBe(false);
  });

  it("usa a cobertura real da fonte quando fornecida", () => {
    const onlyAscii = (c: string) => /[A-Z0-9]/.test(c);
    const r = validateCustomText("FAÍSCA", param, onlyAscii);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Í");
  });
});
