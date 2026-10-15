import { prisma } from "@/lib/prisma";
import type { PublicBanner } from "@/types/banner";

/** Active image banners for landing `/` and customer `/app` home carousels. */
export async function getActiveBanners(take = 8): Promise<PublicBanner[]> {
  try {
    const banners = await prisma.banner.findMany({
      where: {
        active: true,
        imageUrl: { not: null },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true,
        imageUrl: true,
      },
    });
    return banners.filter(
      (b): b is PublicBanner => typeof b.imageUrl === "string" && b.imageUrl.length > 0,
    );
  } catch (error) {
    console.warn("ACTIVE_BANNERS_LOAD_FAILED", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}
