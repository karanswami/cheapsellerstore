import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type HubPageSkeletonProps = {
  className?: string;
  rows?: number;
  showToolbar?: boolean;
  showChips?: boolean;
};

export function HubPageSkeleton({
  className,
  rows = 4,
  showToolbar = true,
  showChips = true,
}: HubPageSkeletonProps) {
  return (
    <main
      className={cn("motion-safe-page-enter flex-1 space-y-4 px-4 py-6", className)}
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-[image:var(--gradient-card)] p-3.5 shadow-[var(--glow-soft)] supports-backdrop-filter:backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Skeleton className="h-10 w-11 rounded-lg" />
          <Skeleton className="h-10 w-11 rounded-lg" />
        </div>
      </div>

      {showToolbar ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
      {showChips ? (
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ) : null}

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-[1.1rem] border border-border/50 bg-card/60 p-4 supports-backdrop-filter:backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>
    </main>
  );
}
