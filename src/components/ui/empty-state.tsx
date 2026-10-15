import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared empty state — large icon, title, short description, optional CTA.
 * No fake illustrations.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/50 bg-card/40 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-foreground/8 [&_svg]:size-6">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <p className="text-base font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
