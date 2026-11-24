import type { NextConfig } from "next";

// Public provenance page (/origin/<qr token>): reachable by anyone who scans a QR code, so it is never framed, sends no referrer (the token is in the URL),
// and loads only same-origin content (photos come through the signed image proxy). Inline script/style are kept because Next injects its own; dev also needs eval for hot reload.
const developing = process.env.NODE_ENV !== "production";
const originSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${developing ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      `connect-src 'self'${developing ? " ws: wss:" : ""}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/origin/:path*", headers: originSecurityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Bound static-build processes on Windows without changing page/cache rules.
  experimental: {
    agentUpgrade: "security",
    ...(process.platform === "win32" ? { cpus: 2 } : {}),
  },
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
