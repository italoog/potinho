import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (banco dev) usa wasm + import.meta.url — não pode ser bundlado no server
  serverExternalPackages: ["@electric-sql/pglite"],

  // AVIF primeiro (≈20-30% menor que WebP) para tudo que passa por next/image.
  // Todas as imagens são locais em /public, então não há remotePatterns a declarar.
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Higiene de segurança (6.3 AC4)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Report-Only: não bloqueia, só reporta (P2-1). Validar no browser por
            // 1 semana e só então promover a key para "Content-Security-Policy".
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https://api.mercadopago.com https://api.superfrete.com https://sandbox.superfrete.com",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
