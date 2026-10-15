import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Unified page header for customer hub + admin desks.
 * Title scale: text-xl / text-2xl — not the old admin text-sm.
 */
export function PageHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "motion-safe-fade flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
