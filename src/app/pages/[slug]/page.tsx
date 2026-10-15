import { StaticPageView } from "@/components/landing/static-page-view";
import { getActiveStaticPageBySlug } from "@/lib/static-pages";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = await getActiveStaticPageBySlug(slug);
  if (!page) {
    return { title: "Page not found | Drip" };
  }
  return {
    title: page.seoTitle?.trim() || `${page.title} | Drip`,
    description:
      page.seoDescription?.trim() ||
      `${page.title} — information from Drip.`,
  };
}

export default async function PublicStaticPage({ params }: Params) {
  const { slug } = await params;
  const page = await getActiveStaticPageBySlug(slug);
  if (!page) notFound();
  return <StaticPageView page={page} />;
}
