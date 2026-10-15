"use client";

import { StarRating } from "@/components/product/star-rating";
import { cn } from "@/lib/utils";
import { ChevronRight, Star } from "lucide-react";

type RatingSummaryProps = {
  rating: number;
  reviewCount: number;
  onClick?: () => void;
  size?: "sm" | "md";
  className?: string;
  /** When false, render as non-interactive text. */
  interactive?: boolean;
};

/**
 * Compact reviews entry — rating + explicit "Reviews" label so the drawer is discoverable.
 */
export function RatingSummary({
  rating,
  reviewCount,
  onClick,
  size = "sm",
  className,
  interactive = true,
}: RatingSummaryProps) {
  const hasReviews = reviewCount > 0;
  const label = hasReviews
    ? `Rated ${rating.toFixed(1)} from ${reviewCount} review${reviewCount === 1 ? "" : "s"}. Open reviews.`
    : "Open ratings and reviews.";

  const score = (
    <>
      {size === "md" ? (
        <StarRating value={hasReviews ? Math.round(rating) : 0} readOnly size="sm" />
      ) : (
        <Star
          className={cn(
            "size-3.5 shrink-0",
            hasReviews
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/70",
          )}
          aria-hidden
        />
      )}
      <span className="tabular-nums">
        {hasReviews ? rating.toFixed(1) : "—"}
      </span>
      {hasReviews ? (
        <span className="tabular-nums text-muted-foreground">
          ({reviewCount})
        </span>
      ) : null}
      <span
        className={cn(
          "font-medium",
          interactive && onClick ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Reviews
      </span>
    </>
  );

  if (!interactive || !onClick) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 text-xs text-muted-foreground",
          className,
        )}
        aria-label={label}
      >
        {score}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "pressable inline-flex items-center gap-1 rounded-full text-left outline-none transition-[background-color,box-shadow,color]",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        size === "sm" &&
          "gap-1 bg-muted/70 px-2 py-1 text-[11px] text-muted-foreground ring-1 ring-foreground/10 hover:bg-muted hover:text-foreground hover:ring-foreground/20",
        size === "md" &&
          "gap-1.5 bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground ring-1 ring-foreground/10 hover:bg-muted hover:text-foreground hover:ring-primary/40 hover:shadow-[var(--glow-soft)]",
        className,
      )}
      aria-label={label}
    >
      {score}
      <ChevronRight
        className={cn(
          "shrink-0 text-primary/80",
          size === "sm" ? "size-3.5" : "size-4",
        )}
        aria-hidden
      />
    </button>
  );
}
