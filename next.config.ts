import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensure server external packages includes pglite for native wasm handling
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
