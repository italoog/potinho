import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    globals: false,
    // PGlite (WASM) inicializa em cada arquivo de teste em paralelo — sob contenção
    // de CPU (muitos arquivos ao mesmo tempo) o boot pode passar dos 10s default.
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
