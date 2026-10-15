import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-9 w-full max-w-md rounded-lg" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </main>
  );
}
