import { afterEach, describe, expect, it } from "vitest";
import robots from "./robots";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("robots", () => {
  it("bloqueia áreas privadas e aponta pro sitemap, usando o app url configurado", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://potinho.pet";
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/conta"] },
      sitemap: "https://potinho.pet/sitemap.xml",
    });
  });

  it("cai no localhost quando NEXT_PUBLIC_APP_URL não está definido", () => {
    expect(robots().sitemap).toBe("http://localhost:3000/sitemap.xml");
  });
});
