"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { AdminCreateReviewDialog } from "@/components/admin/reviews/admin-create-review-dialog";
import { AdminReviewDetailDialog } from "@/components/admin/reviews/admin-review-detail-dialog";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { StarRating } from "@/components/product/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdminReviewRow, ReviewStatusValue } from "@/types/review";
import { ChevronRight, MessageSquareText, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StatusFilter = "all" | ReviewStatusValue;

type AdminProduct = {
  id: string;
  title: string;
};

const STATUS_CHIPS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "DISABLED", label: "Disabled" },
];

const STATUS_RANK: Record<ReviewStatusValue, number> = {
  PENDING: 0,
  APPROVED: 1,
  DISABLED: 2,
};

function statusBadge(status: ReviewStatusValue) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
          Pending
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          Approved
        </Badge>
      );
    case "DISABLED":
      return <Badge variant="outline">Disabled</Badge>;
  }
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminReviewsWorkspace() {
  const { data, loading, reload } = useAdminFetch<{ reviews: AdminReviewRow[] }>(
    "/api/admin/reviews",
  );
  const { data: productsData } = useAdminFetch<AdminProduct[]>(
    "/api/admin/products",
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [openReview, setOpenReview] = useState<AdminReviewRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const products = useMemo(
    () =>
      (productsData ?? []).map((p) => ({
        id: p.id,
        title: p.title,
      })),
    [productsData],
  );

  const reviews = data?.reviews ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews
      .filter((r) => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (!q) return true;
        return (
          r.body.toLowerCase().includes(q) ||
          r.product.title.toLowerCase().includes(q) ||
          (r.customAuthorName?.toLowerCase().includes(q) ?? false) ||
          (r.user?.username.toLowerCase().includes(q) ?? false) ||
          (r.user?.name.toLowerCase().includes(q) ?? false) ||
          (r.user?.email.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (rank !== 0) return rank;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [reviews, query, statusFilter]);

  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;

  async function saveReview(payload: {
    rating: number;
    body: string;
    status: ReviewStatusValue;
  }) {
    if (!openReview) return false;
    setPending(true);
    const result = await adminMutate(`/api/admin/reviews/${openReview.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    toast.success("Review updated");
    void reload();
    return true;
  }

  async function deleteReview() {
    if (!openReview) return false;
    setPending(true);
    const result = await adminMutate(`/api/admin/reviews/${openReview.id}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    toast.success("Review deleted");
    void reload();
    return true;
  }

  async function createReview(payload: {
    productId: string;
    userId?: string | null;
    customAuthorName?: string | null;
    customAvatarUrl?: string | null;
    verifiedBuyer?: boolean;
    rating: number;
    body: string;
  }) {
    setPending(true);
    const result = await adminMutate("/api/admin/reviews", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    toast.success("Review posted");
    void reload();
    return true;
  }

  return (
    <main className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          title="Reviews"
          description={
            pendingCount > 0
              ? `${pendingCount} awaiting approval`
              : "Approve, edit, disable, or post as a buyer"
          }
        />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus data-icon="inline-start" />
          Add review
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product, user, or text…"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setStatusFilter(chip.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === chip.id
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <AdminListSkeleton />
      ) : !filtered.length ? (
        <AdminEmptyState
          message={
            reviews.length
              ? "No reviews match your filters."
              : "No reviews yet. Customers submit for approval, or add one as a buyer."
          }
        />
      ) : (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {filtered.map((review) => (
            <li key={review.id}>
              <button
                type="button"
                onClick={() => setOpenReview(review)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquareText className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {review.product.title}
                    </span>
                    {statusBadge(review.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{review.user ? `@${review.user.username}` : (review.customAuthorName || "Guest Author")}</span>
                    <StarRating value={review.rating} readOnly size="sm" />
                    <span>{shortDate(review.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {review.body}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AdminReviewDetailDialog
        open={Boolean(openReview)}
        onOpenChange={(next) => {
          if (!next) setOpenReview(null);
        }}
        review={openReview}
        pending={pending}
        onSave={saveReview}
        onDelete={deleteReview}
      />

      <AdminCreateReviewDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        products={products}
        pending={pending}
        onCreate={createReview}
      />
    </main>
  );
}
