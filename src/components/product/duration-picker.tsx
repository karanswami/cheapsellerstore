"use client";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currencies";
import type { DurationOption } from "@/types/product";
import { Check, Clock3 } from "lucide-react";

type DurationPickerProps = {
  durations: DurationOption[];
  value: string | null;
  onChange: (durationId: string) => void;
};

export function DurationPicker({
  durations,
  value,
  onChange,
}: DurationPickerProps) {
  const multi = durations.length >= 2;

  return (
    <div
      className={cn("grid gap-2.5", multi && "sm:grid-cols-2")}
      role="radiogroup"
      aria-label="Select duration"
    >
      {durations.map((duration) => {
        const soldOut = duration.stock <= 0 || duration.price == null;
        const selected = value === duration.id;
        const onSale =
          duration.flashSale != null &&
          duration.listPrice != null &&
          duration.price != null;

        return (
          <button
            key={duration.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={soldOut}
            onClick={() => onChange(duration.id)}
            className={cn(
              "group relative flex min-h-[4.75rem] w-full flex-col gap-2 rounded-2xl px-3.5 py-3 text-left ring-1 transition-[background-color,box-shadow,ring-color,transform]",
              "pressable",
              selected
                ? "bg-primary/12 ring-primary shadow-[var(--glow-soft)]"
                : "bg-card/80 ring-foreground/10 hover:bg-muted/50 hover:ring-foreground/20",
              soldOut &&
                "cursor-not-allowed opacity-45 hover:bg-card/80 hover:ring-foreground/10",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-3 right-3 flex size-5 items-center justify-center rounded-full ring-2 transition-colors",
                selected
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-transparent ring-muted-foreground/35 group-hover:ring-muted-foreground/55",
                soldOut && "ring-muted-foreground/20",
              )}
            >
              {selected ? <Check className="size-3 stroke-[3]" /> : null}
            </span>

            <div className="min-w-0 space-y-1.5 pr-7">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold tracking-tight">
                  {duration.label}
                </p>
                {duration.days != null && duration.days > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    <Clock3 className="size-2.5" />
                    {duration.days}d
                  </span>
                ) : null}
                {onSale ? (
                  <span className="rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-orange-400">
                    −{duration.flashSale!.discountPercent}%
                  </span>
                ) : null}
                {soldOut ? (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Unavailable
                  </span>
                ) : null}
              </div>

              {onSale ? (
                <p className="text-[11px] font-medium text-orange-400/90">
                  Flash · {duration.flashSale!.title}
                </p>
              ) : duration.price == null ? (
                <p className="text-[11px] text-muted-foreground">
                  Unavailable in your currency
                </p>
              ) : null}
            </div>

            <div className="mt-auto flex items-end justify-between gap-2">
              <div className="min-w-0">
                {onSale ? (
                  <p className="text-[11px] tabular-nums text-muted-foreground line-through">
                    {formatMoney(duration.listPrice!, duration.currency)}
                  </p>
                ) : null}
                <p
                  className={cn(
                    "text-base font-bold tabular-nums",
                    soldOut ? "text-muted-foreground" : "text-success",
                  )}
                >
                  {duration.price != null
                    ? formatMoney(duration.price, duration.currency)
                    : "—"}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
