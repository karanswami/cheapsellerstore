"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch, errMsg } from "@/components/admin/kit";
import { cn } from "@/lib/utils";

/** Next value for a new item so it lands at the end of an ordered list (steps of 10). */
export function nextOrder(values: number[]) {
  return (values.length ? Math.max(...values) : 0) + 10;
}

/**
 * Moves one item up/down and renumbers the whole list in steps of 10 so equal/duplicate
 * order values can never make a move a no-op. Only changed rows are PATCHed.
 */
export function useReorder<T extends { id: string }>(opts: { endpoint: string; field: string; get: (t: T) => number; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  async function move(list: T[], index: number, dir: -1 | 1) {
    const to = index + dir;
    if (busy || to < 0 || to >= list.length) return;
    const next = [...list];
    [next[index], next[to]] = [next[to], next[index]];
    setBusy(true);
    try {
      await Promise.all(
        next.map((item, i) => {
          const value = (i + 1) * 10;
          return value === opts.get(item) ? null : adminFetch(`${opts.endpoint}/${item.id}`, { method: "PATCH", json: { [opts.field]: value } });
        }),
      );
      opts.reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return { move, busy };
}

export function MoveButtons({
  onUp,
  onDown,
  disableUp,
  disableDown,
  vertical = true,
  className,
}: {
  onUp: () => void;
  onDown: () => void;
  disableUp?: boolean;
  disableDown?: boolean;
  vertical?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-0.5", vertical ? "flex-col" : "flex-row", className)}>
      <Button variant="ghost" size="icon-sm" className="size-6" onClick={onUp} disabled={disableUp} aria-label={vertical ? "Move up" : "Move earlier"}>
        <ArrowUp className={cn("size-3.5", !vertical && "-rotate-90")} />
      </Button>
      <Button variant="ghost" size="icon-sm" className="size-6" onClick={onDown} disabled={disableDown} aria-label={vertical ? "Move down" : "Move later"}>
        <ArrowDown className={cn("size-3.5", !vertical && "-rotate-90")} />
      </Button>
    </div>
  );
}

/** Compact KPI strip shown at the top of each content page. */
export function MiniStats({ items }: { items: { label: string; value: React.ReactNode; tone?: "success" | "muted" | "warning" }[] }) {
  return (
    <div className={cn("grid gap-px overflow-hidden rounded-xl border bg-border", items.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
      {items.map((s) => (
        <div key={s.label} className="min-w-0 bg-card px-3 py-3 sm:px-4">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
          <p className={cn("mt-0.5 font-display text-xl font-bold tracking-tight sm:text-2xl", s.tone === "success" && "text-success", s.tone === "warning" && "text-warning", s.tone === "muted" && "text-muted-foreground")}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

export function StatusDot({ on, onLabel = "Live", offLabel = "Hidden" }: { on: boolean; onLabel?: string; offLabel?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", on ? "border-success/30 bg-success/10 text-success" : "text-muted-foreground")}>
      <span className={cn("size-1.5 rounded-full", on ? "bg-success" : "bg-muted-foreground/50")} />
      {on ? onLabel : offLabel}
    </span>
  );
}
