"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
  readOnly?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly = false,
  className,
  "aria-label": ariaLabel = "Rating",
}: StarRatingProps) {
  const iconClass = size === "sm" ? "size-3.5" : "size-5";

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={ariaLabel}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        if (readOnly) {
          return (
            <Star
              key={star}
              className={cn(
                iconClass,
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40",
              )}
              aria-hidden
            />
          );
        }

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onChange?.(star)}
            className="rounded-sm p-0.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                iconClass,
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/50",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
