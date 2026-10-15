import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function ProductCardSkeleton() {
  return (
    <Card size="sm" className="gap-0 border-border py-0 shadow-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-none rounded-t-xl" />
      <CardHeader className="gap-2 pt-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-[85%]" />
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-4 w-14" />
        </div>
      </CardContent>
      <div className="border-t border-border/40 p-3">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </Card>
  );
}

export function BannerCarouselSkeleton() {
  return (
    <div
      className="space-y-2 rounded-2xl border border-border bg-card p-3"
      aria-busy="true"
      aria-label="Loading banners"
    >
      <Skeleton className="aspect-[21/9] w-full rounded-xl sm:aspect-[3/1]" />
      <div className="flex justify-center gap-1.5">
        <Skeleton className="h-1.5 w-5 rounded-full" />
        <Skeleton className="size-1.5 rounded-full" />
        <Skeleton className="size-1.5 rounded-full" />
      </div>
    </div>
  );
}

export function CategoryTabsSkeleton() {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-lg" />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CatalogSlotSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading catalog">
      <CategoryTabsSkeleton />
      <ProductGridSkeleton />
    </div>
  );
}

type AppPageSkeletonProps = {
  variant?: "store" | "list" | "simple";
};

/** Instant route fallback for `/app` hub pages. */
export function AppPageSkeleton({ variant = "simple" }: AppPageSkeletonProps) {
  if (variant === "store") {
    return (
      <main
        className="motion-safe-page-enter flex-1 space-y-6 px-4 py-6"
        aria-busy="true"
        aria-label="Loading store"
      >
        <BannerCarouselSkeleton />
        <div className="space-y-2 rounded-2xl border border-primary/20 bg-card/65 p-4 shadow-[var(--glow-soft)] supports-backdrop-filter:backdrop-blur-md">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <CatalogSlotSkeleton />
      </main>
    );
  }

  if (variant === "list") {
    return (
      <main
        className="motion-safe-page-enter flex-1 space-y-6 px-4 py-6"
        aria-busy="true"
        aria-label="Loading"
      >
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main
      className="motion-safe-page-enter flex-1 space-y-6 px-4 py-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </main>
  );
}
