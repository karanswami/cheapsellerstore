"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { ProductReviewForm } from "@/components/product/product-review-form";
import { ProductReviewList } from "@/components/product/product-review-list";
import { StarRating } from "@/components/product/star-rating";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  ProductReviewPublic,
  ProductReviewsPayload,
  ReviewDistribution,
  ReviewSort,
} from "@/types/review";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest" },
  { value: "lowest", label: "Lowest" },
];

const EMPTY_DISTRIBUTION: ReviewDistribution = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

type ProductReviewsDrawerProps = {
  productId: string;
  productTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Seed rating from catalog card until first fetch. */
  initialRating?: number;
  initialCount?: number;
  onRatingChange?: (average: number, count: number) => void;
};

export function ProductReviewsDrawer({
  productId,
  productTitle,
  open,
  onOpenChange,
  initialRating = 0,
  initialCount = 0,
  onRatingChange,
}: ProductReviewsDrawerProps) {
  const { user, openAuth } = useAuth();
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<ProductReviewPublic[]>([]);
  const [meta, setMeta] = useState<{
    averageRating: number;
    reviewCount: number;
    distribution: ReviewDistribution;
    hasMore: boolean;
    canReview: boolean;
    alreadyReviewed: boolean;
    pendingReview: boolean;
    verifiedBuyer: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const onRatingChangeRef = useRef(onRatingChange);
  onRatingChangeRef.current = onRatingChange;

  const loadPage = useCallback(
    async (nextPage: number, nextSort: ReviewSort, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: "10",
          sort: nextSort,
        });
        const res = await fetch(
          `/api/products/${productId}/reviews?${params}`,
          { credentials: "include", cache: "no-store" },
        );
        const json = (await res.json()) as {
          data?: ProductReviewsPayload;
          error?: { message: string };
        };
        if (!res.ok || !json.data) {
          throw new Error(json.error?.message ?? "Failed to load reviews.");
        }
        const payload = json.data;
        setReviews((prev) =>
          append ? [...prev, ...payload.reviews] : payload.reviews,
        );
        setMeta({
          averageRating: payload.averageRating,
          reviewCount: payload.reviewCount,
          distribution: payload.distribution,
          hasMore: payload.hasMore,
          canReview: payload.canReview,
          alreadyReviewed: payload.alreadyReviewed,
          pendingReview: payload.pendingReview,
          verifiedBuyer: payload.verifiedBuyer,
        });
        onRatingChangeRef.current?.(
          payload.averageRating,
          payload.reviewCount,
        );
        setPage(nextPage);
      } catch {
        if (!append) {
          setReviews([]);
          setMeta(null);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [productId],
  );

  useEffect(() => {
    if (!open) return;
    setSort("newest");
    setPage(1);
    setRating(5);
    setBody("");
    void loadPage(1, "newest", false);
  }, [open, productId, user?.id, loadPage]);

  function changeSort(next: ReviewSort) {
    if (next === sort) return;
    setSort(next);
    void loadPage(1, next, false);
  }

  async function submit() {
    if (!user) {
      openAuth("login");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body }),
      });
      const json = (await res.json()) as {
        data?: {
          pending: boolean;
          averageRating: number;
          reviewCount: number;
        };
        error?: { message: string };
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? "Could not post review.");
      }
      toast.success("Review submitted for approval");
      setBody("");
      setMeta((prev) =>
        prev
          ? {
              ...prev,
              averageRating: json.data!.averageRating,
              reviewCount: json.data!.reviewCount,
              canReview: false,
              alreadyReviewed: true,
              pendingReview: true,
            }
          : prev,
      );
      onRatingChange?.(json.data.averageRating, json.data.reviewCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post review.");
    } finally {
      setSubmitting(false);
    }
  }

  const average = meta?.averageRating ?? initialRating;
  const count = meta?.reviewCount ?? initialCount;
  const distribution = meta?.distribution ?? EMPTY_DISTRIBUTION;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        overlayClassName="z-[60]"
        className="z-[60] flex max-h-[min(92dvh,720px)] flex-col data-[vaul-drawer-direction=bottom]:max-h-[min(92dvh,720px)]"
      >
        <DrawerHeader className="shrink-0 gap-3 border-b border-border/40 px-4 pt-2 pb-3 text-left sm:px-5">
          <div className="space-y-1">
            <DrawerTitle className="text-left text-lg">
              Ratings & reviews
            </DrawerTitle>
            <DrawerDescription className="text-left">
              {productTitle
                ? `What buyers say about ${productTitle}`
                : "Verified buyer feedback"}
            </DrawerDescription>
          </div>

          <div className="flex items-start gap-4">
            <div className="shrink-0 space-y-1 text-left">
              <p className="text-3xl font-bold tracking-tight tabular-nums">
                {count > 0 ? average.toFixed(1) : "—"}
              </p>
              <StarRating
                value={count > 0 ? Math.round(average) : 0}
                readOnly
                size="sm"
              />
              <p className="text-xs text-muted-foreground tabular-nums">
                {count} review{count === 1 ? "" : "s"}
              </p>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 pt-1">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const n = distribution[star];
                const pct = count > 0 ? Math.round((n / count) * 100) : 0;
                return (
                  <div
                    key={star}
                    className="flex items-center gap-2 text-[11px] text-muted-foreground"
                  >
                    <span className="w-3 tabular-nums">{star}</span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-400/90 transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-7 text-right tabular-nums">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <FilterChipRow aria-label="Sort reviews">
            {SORT_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                active={sort === opt.value}
                onClick={() => changeSort(opt.value)}
              >
                {opt.label}
              </FilterChip>
            ))}
          </FilterChipRow>

          {meta?.canReview ? (
            <ProductReviewForm
              rating={rating}
              body={body}
              submitting={submitting}
              onRatingChange={setRating}
              onBodyChange={setBody}
              onSubmit={() => void submit()}
            />
          ) : null}

          {!loading && meta && !user ? (
            <p className="text-xs text-muted-foreground">
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                onClick={() => openAuth("login")}
              >
                Sign in
              </button>{" "}
              as a verified buyer to leave a review.
            </p>
          ) : null}

          {!loading &&
          meta &&
          user &&
          !meta.verifiedBuyer &&
          !meta.alreadyReviewed ? (
            <p className="text-xs text-muted-foreground">
              Purchase this product to unlock a verified buyer review.
            </p>
          ) : null}

          {!loading && meta?.pendingReview ? (
            <p className="text-xs text-muted-foreground">
              Your review is awaiting admin approval.
            </p>
          ) : null}

          {!loading && meta?.alreadyReviewed && !meta.pendingReview ? (
            <p className="text-xs text-muted-foreground">
              Thanks — you already reviewed this product.
            </p>
          ) : null}

          {loading && reviews.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : null}

          <ProductReviewList reviews={reviews} />

          {!loading && meta && reviews.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No reviews yet. Be the first verified buyer to rate this product.
            </p>
          ) : null}

          {meta?.hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => void loadPage(page + 1, sort, true)}
              className={cn("w-full", loadingMore && "opacity-70")}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
