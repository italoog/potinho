import { describe, it, expect } from "vitest";
import { esc } from "./email";

describe("esc (P1-1)", () => {
  it("escapa caracteres perigosos de HTML", () => {
    expect(esc('<img src=x onerror=alert(1)>')).toBe(
      "&lt;img src=x onerror=alert(1)&gt;",
    );
    expect(esc(`"><script>x</script>`)).toBe(
      "&quot;&gt;&lt;script&gt;x&lt;/script&gt;",
    );
    expect(esc("Maria & João")).toBe("Maria &amp; João");
  });
});
