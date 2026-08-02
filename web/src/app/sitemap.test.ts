import { afterEach, describe, expect, it } from "vitest";
import sitemap from "./sitemap";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("sitemap", () => {
  it("lista home e privacidade com o app url configurado", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://potinho.pet";
    const entries = sitemap();
    expect(entries.map((e) => e.url)).toEqual(["https://potinho.pet", "https://potinho.pet/privacidade"]);
    expect(entries[0].priority).toBe(1);
    expect(entries[1].priority).toBe(0.3);
  });

  it("cai no localhost quando NEXT_PUBLIC_APP_URL não está definido", () => {
    expect(sitemap()[0].url).toBe("http://localhost:3000");
  });
});
