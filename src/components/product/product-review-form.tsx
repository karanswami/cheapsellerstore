"use client";

import { StarRating } from "@/components/product/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeCheck } from "lucide-react";

type ProductReviewFormProps = {
  rating: number;
  body: string;
  submitting: boolean;
  onRatingChange: (value: number) => void;
  onBodyChange: (value: string) => void;
  onSubmit: () => void;
};

export function ProductReviewForm({
  rating,
  body,
  submitting,
  onRatingChange,
  onBodyChange,
  onSubmit,
}: ProductReviewFormProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/25 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Leave a review</p>
        <Badge variant="secondary" className="gap-1">
          <BadgeCheck className="size-3" data-icon="inline-start" />
          Verified buyer
        </Badge>
      </div>
      <StarRating
        value={rating}
        onChange={onRatingChange}
        aria-label="Your rating"
      />
      <textarea
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="How was this product?"
        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button
        type="button"
        size="sm"
        disabled={submitting || body.trim().length < 8}
        onClick={onSubmit}
        className="w-full"
      >
        {submitting ? "Submitting…" : "Submit for approval"}
      </Button>
    </div>
  );
}
