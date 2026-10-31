import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Bound static-build processes on Windows without changing page/cache rules.
  experimental: process.platform === "win32" ? { cpus: 2 } : {},
  turbopack: {
    rules: {
      // Tailwind transforms the global entry only. Rewriting every CSS file
      // as *.css strips CSS Modules' class exports in this loader pipeline.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
