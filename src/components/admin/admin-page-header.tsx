import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

/** @deprecated Prefer PageHeader — kept as thin alias for gradual migration. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <PageHeader title={title} description={description} actions={actions} />
  );
}

/** @deprecated Prefer EmptyState — message-only alias for gradual migration. */
export function AdminEmptyState({ message }: { message: string }) {
  return <EmptyState title={message} />;
}

export function AdminListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="motion-safe-page-enter space-y-2 rounded-2xl border border-primary/20 bg-card/55 p-3 shadow-[var(--glow-soft)] supports-backdrop-filter:backdrop-blur-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl border border-primary/10" />
      ))}
    </div>
  );
}
