import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <main
      className="motion-safe-page-enter mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="relative overflow-hidden rounded-[1.35rem] border border-primary/30 bg-[image:var(--gradient-card)] p-6 shadow-[var(--glow-soft)] sm:p-7">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Skeleton className="size-20 shrink-0 rounded-[1rem] sm:size-24" />
          <div className="flex w-full flex-col items-center gap-2 sm:items-start">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-28" />
            <div className="mt-1 flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <Skeleton className="h-16 w-full rounded-2xl" />

      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-[1.15rem] border border-border/50 bg-card/60 p-4 supports-backdrop-filter:backdrop-blur-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-14 rounded-xl" />
          </div>
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ))}
    </main>
  );
}
