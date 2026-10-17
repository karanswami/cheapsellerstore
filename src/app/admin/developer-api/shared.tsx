import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const nf = new Intl.NumberFormat("en-US");

/** 1234 → 1.2k, for compact stat cards. */
export function compact(n: number) {
  return n >= 10_000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : nf.format(n);
}

export function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function HttpStatus({ code }: { code: number }) {
  const variant = code < 400 ? "success" : code === 429 ? "warning" : "destructive";
  return (
    <Badge variant={variant} className="font-mono tabular-nums">
      {code}
    </Badge>
  );
}

export function MethodBadge({ method }: { method: string }) {
  return (
    <Badge variant={method === "GET" ? "muted" : "highlight"} className="w-14 justify-center font-mono">
      {method}
    </Badge>
  );
}

export function Latency({ ms }: { ms: number | null }) {
  if (ms == null || ms === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("tabular-nums", ms >= 1000 ? "font-medium text-destructive" : ms >= 400 ? "text-warning" : "text-muted-foreground")}>{ms} ms</span>
  );
}

/** Thin proportional bar used in the leaderboards. */
export function Meter({ value, max, tone = "primary" }: { value: number; max: number; tone?: "primary" | "destructive" }) {
  const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", tone === "primary" ? "bg-brand-gradient" : "bg-destructive")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;
}
