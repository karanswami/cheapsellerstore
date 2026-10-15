import { BannerCarousel } from "@/components/app/banner-carousel";
import {
  BannerCarouselSkeleton,
  CatalogSlotSkeleton,
} from "@/components/app/app-page-skeleton";
import { CatalogSection } from "@/components/catalog/catalog-section";
import { FlashOfferCarousel } from "@/components/catalog/flash-offer-carousel";
import { getActiveBanners } from "@/lib/banners";
import { getActiveOfferBanners } from "@/lib/offer-banner";
import { getCategories, getProductsPage } from "@/lib/products";
import type { UserRole } from "@prisma/client";
import { Suspense } from "react";

export async function BannerSlot() {
  let banners: Awaited<ReturnType<typeof getActiveBanners>> = [];
  let offers: Awaited<ReturnType<typeof getActiveOfferBanners>> = [];
  try {
    [banners, offers] = await Promise.all([
      getActiveBanners(),
      getActiveOfferBanners(),
    ]);
  } catch {
    // DB unavailable
  }
  return (
    <div className="space-y-4">
      <BannerCarousel banners={banners} />
      <FlashOfferCarousel offers={offers} />
    </div>
  );
}

export function BannerSlotFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <BannerCarouselSkeleton />
      <div className="h-[9.5rem] animate-pulse rounded-2xl bg-muted/60" />
    </div>
  );
}

type CatalogSlotProps = {
  categorySlug?: string;
  basePath?: string;
  role?: UserRole;
  userId?: string | null;
};

export async function CatalogSlot({
  categorySlug,
  basePath = "/",
  role = "USER",
  userId,
}: CatalogSlotProps) {
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let page: Awaited<ReturnType<typeof getProductsPage>> = {
    products: [],
    page: 1,
    limit: 12,
    total: 0,
    hasMore: false,
  };

  try {
    [categories, page] = await Promise.all([
      getCategories(),
      getProductsPage({
        categorySlug,
        role,
        userId,
        page: 1,
        limit: 12,
      }),
    ]);
  } catch {
    // DB unavailable
  }

  return (
    <section id="store" className="scroll-mt-20">
      <CatalogSection
        categories={categories}
        initialProducts={page.products}
        initialHasMore={page.hasMore}
        initialTotal={page.total}
        categorySlug={categorySlug}
        basePath={basePath}
      />
    </section>
  );
}

export function CatalogSlotFallback() {
  return (
    <section className="space-y-4" aria-busy="true">
      <div className="h-[4.25rem] animate-pulse rounded-2xl bg-muted/60" />
      <CatalogSlotSkeleton />
    </section>
  );
}

/** Wrap catalog in Suspense for streaming. */
export function CatalogSlotSuspended(props: CatalogSlotProps) {
  return (
    <Suspense fallback={<CatalogSlotFallback />}>
      <CatalogSlot {...props} />
    </Suspense>
  );
}

export function BannerSlotSuspended() {
  return (
    <Suspense fallback={<BannerSlotFallback />}>
      <BannerSlot />
    </Suspense>
  );
}
