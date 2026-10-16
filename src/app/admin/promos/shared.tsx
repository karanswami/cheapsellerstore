"use client";

import { useCallback } from "react";
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
