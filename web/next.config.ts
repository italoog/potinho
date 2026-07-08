import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (banco dev) usa wasm + import.meta.url — não pode ser bundlado no server
  serverExternalPackages: ["@electric-sql/pglite"],

  // Higiene de segurança (6.3 AC4)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
