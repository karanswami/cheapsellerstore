import { Skeleton } from "@/components/ui/skeleton";

export default function OrderLoading() {
  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-6 sm:py-10">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="mx-auto h-3 w-40" />
      </div>
    </main>
  );
}
