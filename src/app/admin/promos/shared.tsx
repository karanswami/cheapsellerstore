"use client";

import { useCallback } from "react";
import { Field } from "@/components/admin/kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCatalog, type Audience, type Scope } from "@/components/admin/pickers";

/** Human label for "applies to": Everything / product name / product · duration. */
export function useScopeLabel() {
  const catalog = useCatalog();
  return useCallback(
    (scope: Scope, productId: string | null, durationId: string | null) => {
      if (scope === "GLOBAL") return "Everything";
      if (scope === "PRODUCT") return catalog.find((p) => p.id === productId)?.title ?? "One product";
      const product = catalog.find((p) => p.durations.some((d) => d.id === durationId));
      const duration = product?.durations.find((d) => d.id === durationId);
      return product && duration ? `${product.title} · ${duration.label}` : "One duration";
    },
    [catalog],
  );
}

export function audienceText(a: Audience) {
  return a === "USER" ? "Users only" : a === "SELLER" ? "Sellers only" : "Everyone";
}

/** Pill-style single choice control (used for % / $ and quick durations). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-lg border bg-muted/40 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 rounded-md px-3 text-sm font-medium transition-colors",
            o.value === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Section card header used above both lists. */
export function SectionHead({ title, hint, action }: { title: string; hint: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {action}
    </div>
  );
}

export type Lifecycle = "live" | "scheduled" | "ended" | "off";

export const LIFECYCLE_BADGE: Record<Lifecycle, { label: string; variant: "success" | "warning" | "muted" }> = {
  live: { label: "Live", variant: "success" },
  scheduled: { label: "Scheduled", variant: "warning" },
  ended: { label: "Ended", variant: "muted" },
  off: { label: "Off", variant: "muted" },
};

/** Where an item sits in its schedule right now. */
export function lifecycle(s: { active: boolean; startsAt: string | null; expiresAt: string | null }): Lifecycle {
  const now = Date.now();
  if (s.expiresAt && new Date(s.expiresAt).getTime() < now) return "ended";
  if (!s.active) return "off";
  if (s.startsAt && new Date(s.startsAt).getTime() > now) return "scheduled";
  return "live";
}

/** Returns an error message when the schedule is contradictory, else null. */
export function scheduleError(startsAt: string, endsAt: string): string | null {
  const s = startsAt ? new Date(startsAt).getTime() : null;
  const e = endsAt ? new Date(endsAt).getTime() : null;
  if (s !== null && e !== null && s >= e) return "Start must be before the end.";
  if (e !== null && e <= Date.now()) return "End time is already in the past.";
  return null;
}

/** Start / end datetime inputs with quick-end shortcuts. */
export function ScheduleFields({
  startsAt,
  endsAt,
  onStarts,
  onEnds,
  quickEnds,
  endHint = "Empty = runs until you turn it off.",
}: {
  startsAt: string;
  endsAt: string;
  onStarts: (v: string) => void;
  onEnds: (v: string) => void;
  quickEnds: { label: string; hours: number }[];
  endHint?: string;
}) {
  const err = scheduleError(startsAt, endsAt);
  function endIn(hours: number) {
    const base = startsAt ? new Date(startsAt) : new Date();
    base.setHours(base.getHours() + hours);
    const pad = (n: number) => String(n).padStart(2, "0");
    onEnds(`${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`);
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts" hint="Empty = starts right away.">
          <Input type="datetime-local" value={startsAt} onChange={(e) => onStarts(e.target.value)} />
        </Field>
        <Field label="Ends" hint={endHint}>
          <Input type="datetime-local" value={endsAt} onChange={(e) => onEnds(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {quickEnds.map((q) => (
          <Button key={q.hours} type="button" variant="outline" size="sm" onClick={() => endIn(q.hours)}>
            +{q.label}
          </Button>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={() => onEnds("")}>
          No end
        </Button>
      </div>
      {err ? <p className="text-xs font-medium text-destructive">{err}</p> : null}
    </div>
  );
}
