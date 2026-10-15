import { getSiteConfig } from "@/lib/site-config";
import type { MetadataRoute } from "next";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getSiteConfig();
  const name = config.siteName.trim() || "Cheap Seller";
  const description =
    config.siteSeoDescription.trim() ||
    config.siteTagline.trim() ||
    "Premium digital products delivered instantly.";

  const customIcon = config.faviconUrl || config.logoUrl || "";
  const icons: MetadataRoute.Manifest["icons"] = [
    {
      src: "/pwa/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/pwa/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/pwa/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];

  if (customIcon) {
    icons.unshift({
      src: customIcon,
      sizes: "any",
      type: "image/png",
      purpose: "any",
    });
  }

  return {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0c0c0e",
    theme_color: config.primaryDarkColor || "#10b981",
    categories: ["shopping", "productivity"],
    icons,
  };
}
