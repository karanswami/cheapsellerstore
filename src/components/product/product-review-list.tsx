"use client";

import { StarRating } from "@/components/product/star-rating";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductReviewPublic } from "@/types/review";
import { BadgeCheck } from "lucide-react";

function formatReviewDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

type ProductReviewListProps = {
  reviews: ProductReviewPublic[];
  className?: string;
};

export function ProductReviewList({
  reviews,
  className,
}: ProductReviewListProps) {
  if (reviews.length === 0) return null;

  return (
    <ul className={cn("space-y-3", className)}>
      {reviews.map((review) => (
        <li
          key={review.id}
          className="rounded-xl border border-border/70 bg-background/80 px-3.5 py-3"
        >
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <AuthorAvatar
              name={review.author.name}
              username={review.author.username}
              avatarUrl={review.author.avatarUrl}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">
                  @{review.author.username}
                </span>
                {review.verifiedBuyer ? (
                  <Badge variant="secondary" className="gap-1 px-1.5 py-0">
                    <BadgeCheck className="size-3" data-icon="inline-start" />
                    Verified
                  </Badge>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {formatReviewDate(review.createdAt)}
              </p>
            </div>
            <StarRating
              value={review.rating}
              readOnly
              size="sm"
              className="shrink-0"
            />
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {review.body}
          </p>
        </li>
      ))}
    </ul>
  );
}

function AuthorAvatar({
  name,
  username,
  avatarUrl,
}: {
  name: string;
  username: string;
  avatarUrl: string | null;
}) {
  const initial =
    (name.trim() || username.trim()).charAt(0).toUpperCase() || "?";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="size-8 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
      />
    );
  }

  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/20">
      {initial}
    </span>
  );
}
