import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
