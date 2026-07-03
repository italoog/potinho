import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (banco dev) usa wasm + import.meta.url — não pode ser bundlado no server
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
