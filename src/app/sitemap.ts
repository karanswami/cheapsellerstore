import { getActiveStaticPagesNav } from "@/lib/static-pages";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3102"
  ).replace(/\/$/, "");

  const pages = await getActiveStaticPagesNav();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: base,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/faq`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/developers`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const pageEntries: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${base}/pages/${page.slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...pageEntries];
}
