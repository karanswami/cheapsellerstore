import { prisma } from "@/lib/prisma";
import type {
  PublicStaticPage,
  PublicStaticPageNav,
} from "@/types/static-page";

const NAV_SELECT = {
  id: true,
  slug: true,
  title: true,
} as const;

const PAGE_SELECT = {
  ...NAV_SELECT,
  seoTitle: true,
  seoDescription: true,
  content: true,
} as const;

/** Active static pages for footer / profile nav (sortOrder asc). */
export async function getActiveStaticPagesNav(
  take = 50,
): Promise<PublicStaticPageNav[]> {
  try {
    return await prisma.staticPage.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take,
      select: NAV_SELECT,
    });
  } catch (error) {
    console.warn("ACTIVE_STATIC_PAGES_NAV_LOAD_FAILED", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

/** Active page by slug for public `/pages/[slug]`. */
export async function getActiveStaticPageBySlug(
  slug: string,
): Promise<PublicStaticPage | null> {
  try {
    return await prisma.staticPage.findFirst({
      where: { slug, active: true },
      select: PAGE_SELECT,
    });
  } catch (error) {
    console.warn("ACTIVE_STATIC_PAGE_LOAD_FAILED", {
      slug,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}
