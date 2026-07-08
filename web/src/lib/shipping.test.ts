import { describe, expect, it } from "vitest";
import { shippingCentsFor } from "./shipping";

describe("shippingCentsFor (sem Melhor Envio configurado, cai na tabela fixa)", () => {
  it("usa o valor padrão quando a UF não está na tabela", async () => {
    expect(await shippingCentsFor("01234-567", "SP", [])).toBe(2000);
  });

  it("respeita SHIPPING_TABLE_JSON quando definida", async () => {
    process.env.SHIPPING_TABLE_JSON = '{"SP":1500,"*":2500}';
    expect(await shippingCentsFor("01234-567", "SP", [])).toBe(1500);
    expect(await shippingCentsFor("01234-567", "RJ", [])).toBe(2500);
    delete process.env.SHIPPING_TABLE_JSON;
  });
});
