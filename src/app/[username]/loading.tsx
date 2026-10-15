import { Skeleton } from "@/components/ui/skeleton";

export default function PublicProfileLoading() {
  return (
    <main className="relative min-h-[90vh] overflow-hidden pb-16 pt-4 sm:pt-8">
      <div className="relative z-[1] mx-auto w-full max-w-md px-4 sm:max-w-lg lg:max-w-xl">
        {/* Profile Card Skeleton */}
        <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/40 backdrop-blur-md">
          {/* Banner Skeleton */}
          <div className="h-28 w-full sm:h-32">
            <Skeleton className="h-full w-full rounded-none opacity-40" />
          </div>

          <div className="relative px-5 pb-6 pt-0 text-center">
            {/* Avatar Circle Skeleton */}
            <div className="-mt-14 mb-3 flex justify-center">
              <Skeleton className="size-24 rounded-full border-4 border-background sm:size-28" />
            </div>

            {/* Name & Handle */}
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-7 w-40 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>

            {/* Badges */}
            <div className="mt-3 flex justify-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>

            {/* Bio Tagline */}
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <Skeleton className="h-4 w-5/6 rounded" />
              <Skeleton className="h-3.5 w-2/3 rounded" />
            </div>

            {/* Promo Pill Skeleton */}
            <div className="mt-5 flex justify-center">
              <Skeleton className="h-10 w-full max-w-xs rounded-xl" />
            </div>
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="mt-3.5 grid grid-cols-3 divide-x divide-border/40 overflow-hidden rounded-[1.2rem] border border-border/50 bg-card/40">
          <div className="flex flex-col items-center p-3">
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="mt-1.5 h-3 w-8 rounded" />
          </div>
          <div className="flex flex-col items-center p-3">
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="mt-1.5 h-3 w-8 rounded" />
          </div>
          <div className="flex flex-col items-center p-3">
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="mt-1.5 h-3 w-8 rounded" />
          </div>
        </div>

        {/* Bento Tiles Skeleton */}
        <div className="mt-4 space-y-2">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>

        {/* Products List Skeleton */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      </div>
    </main>
  );
}

