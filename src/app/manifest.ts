import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/** Installable PWA: "Add to Home Screen" opens the customer app full-screen. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getSiteConfig();
  return {
    id: "/app",
    name: config.siteName,
    short_name: config.siteName.length > 12 ? config.siteName.split(" ")[0] : config.siteName,
    description: config.siteSeoDescription,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070d17",
    theme_color: "#070d17",
    categories: ["shopping", "games"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Deposit", url: "/app/deposit", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "My keys", url: "/app/keys", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Spin", url: "/app/referral", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
