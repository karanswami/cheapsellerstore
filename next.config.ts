import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Structural CSP directives only (no script-src) so nothing in the app can break, while still
  // blocking clickjacking, <base> hijack, plugin content and form-post exfiltration.
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self' https:",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Order pages/APIs carry bearer-style share tokens: never leak them via Referer or caches.
      {
        source: "/order/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  // Keep Prisma out of the Turbopack/webpack server bundle so runtime enums
  // (ReviewStatus, KeyStatus, …) stay defined.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  // Allow browsing the Next.js dev server via the VPS public IP / host.
  // Without this, /_next/* assets (CSS/JS) return 403 and the UI looks unstyled.
  allowedDevOrigins: [
    "drip-client.gurugaminghub.store",
    "82.21.53.153",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
