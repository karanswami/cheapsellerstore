import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:py-12">
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 sm:w-72" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
      </div>
      <Skeleton className="h-72 w-full rounded-2xl sm:h-96" />
      <div className="mt-auto flex gap-2 border-t border-white/[0.06] pt-6">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </main>
  );
}
