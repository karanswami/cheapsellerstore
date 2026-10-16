import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

/** Page title block used at the top of every customer page. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  icon: Icon,
  action,
  className,
  children,
}: {
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 sm:p-5", className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            {Icon ? <Icon className="size-4 text-primary" /> : null}
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  COMPLETED: "success",
  PAID: "success",
  DELIVERED: "success",
  RESOLVED: "success",
  APPROVED: "success",
  ACTIVE: "success",
  PENDING: "warning",
  PROCESSING: "warning",
  OPEN: "warning",
  IN_PROGRESS: "warning",
  CANCELLED: "muted",
  EXPIRED: "muted",
  CLOSED: "muted",
  FAILED: "destructive",
  REJECTED: "destructive",
  REFUNDED: "highlight",
};

export function statusVariant(status: string): BadgeVariant {
  return STATUS_VARIANT[status.toUpperCase()] ?? "muted";
}

export function StatusBadge({ status }: { status: string }) {
  const label = status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return <Badge variant={statusVariant(status)}>{label}</Badge>;
}

export function formatDate(iso: string | Date, withTime = false) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "UTC",
    ...(withTime ? { timeZoneName: "short" } : {}),
  });
}
