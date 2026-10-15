import { AdminListSkeleton } from "@/components/admin/admin-page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSpecialInventory() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl border border-border/50" />
        ))}
      </div>
      <div className="rounded-xl border border-border/50 bg-card/40 p-6">
        <AdminListSkeleton rows={8} />
      </div>
    </div>
  );
}
