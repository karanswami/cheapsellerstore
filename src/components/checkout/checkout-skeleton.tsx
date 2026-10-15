import { Skeleton } from "@/components/ui/skeleton";

export function CheckoutSkeleton() {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-6 sm:py-10">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </main>
  );
}
