import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("permite até o limite e bloqueia a partir daí, na mesma janela", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("chaves diferentes têm buckets independentes", () => {
    const a = `test-${crypto.randomUUID()}`;
    const b = `test-${crypto.randomUUID()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });

  it("libera novamente após a janela expirar", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(rateLimit(key, 1, 10).ok).toBe(true);
    expect(rateLimit(key, 1, 10).ok).toBe(false);
    return new Promise((resolve) =>
      setTimeout(() => {
        expect(rateLimit(key, 1, 10).ok).toBe(true);
        resolve(undefined);
      }, 20),
    );
  });
});
