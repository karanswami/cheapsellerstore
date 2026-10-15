import {
  BannerCarouselSkeleton,
  CatalogSlotSkeleton,
} from "@/components/app/app-page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Guest `/` loading — same banner + store flow as `/app` home. */
export function LandingSkeleton() {
  return (
    <main
      className="motion-safe-page-enter mx-auto max-w-5xl flex-1 space-y-6 px-4 py-6 pb-24"
      aria-busy="true"
      aria-label="Loading store"
    >
      <BannerCarouselSkeleton />
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>
      <CatalogSlotSkeleton />
    </main>
  );
}
