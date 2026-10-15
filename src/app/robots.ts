import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3102"
  ).replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/faq", "/pages/", "/developers", "/docs"],
        disallow: [
          "/admin",
          "/app",
          "/api/",
          "/checkout",
          "/order/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
