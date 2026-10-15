import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  hint,
  className,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  tone?: "default" | "success" | "muted";
}) {
  return (
    <Card
      variant="stat"
      size="sm"
      className={cn("gap-0", className)}
    >
      <CardContent className="px-3">
        <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        <p
          className={cn(
            "mt-1.5 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl",
            tone === "success" && "text-success",
            tone === "muted" && "text-foreground",
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function StatSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
