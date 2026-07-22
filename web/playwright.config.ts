import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (10.1) — os 4 fluxos de dinheiro do plano. Sobe o dev server com
 * ALLOW_DEV_CHECKOUT=true (simula pagamento sem gateway real) e ADMIN_EMAILS
 * pra ter uma conta admin determinística nos testes.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  // Todos os specs competem pelo mesmo dev server + banco PGlite + rate-limiter em memória —
  // rodar arquivos em paralelo causa corrida (ex.: dois logins ao mesmo tempo colidindo no
  // rate limit por IP). Força serial.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ALLOW_DEV_CHECKOUT: "true",
      ADMIN_EMAILS: "admin@potinho.com.br",
      // Habilita /api/test/last-verification (P2-2) — nunca setar em produção/preview.
      ALLOW_E2E_ENDPOINTS: "true",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
