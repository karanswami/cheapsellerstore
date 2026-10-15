"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Unified filter / tab chip language for hub + admin lists.
 */
export function FilterChip({
  active,
  onClick,
  children,
  className,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-slot="filter-chip"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "pressable inline-flex h-8 shrink-0 items-center justify-center rounded-full px-3.5 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        active
          ? "bg-primary text-primary-foreground shadow-[var(--glow-soft)]"
          : "bg-muted/60 text-muted-foreground ring-1 ring-foreground/8 hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function FilterChipRow({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "no-scrollbar flex gap-2 overflow-x-auto pb-0.5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
