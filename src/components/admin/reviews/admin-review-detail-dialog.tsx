"use client";

import { StarRating } from "@/components/product/star-rating";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminReviewRow, ReviewStatusValue } from "@/types/review";
import { MessageSquareText, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminReviewDetailDialog({
  open,
  onOpenChange,
  review,
  pending,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: AdminReviewRow | null;
  pending: boolean;
  onSave: (payload: {
    rating: number;
    body: string;
    status: ReviewStatusValue;
  }) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<ReviewStatusValue>("PENDING");

  useEffect(() => {
    if (!review || !open) return;
    setRating(review.rating);
    setBody(review.body);
    setStatus(review.status);
  }, [review, open]);

  if (!review) return null;

  async function handleSave() {
    const ok = await onSave({ rating, body, status });
    if (ok) onOpenChange(false);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this review permanently?")) return;
    const ok = await onDelete();
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <MessageSquareText className="size-5" />
            </div>
            <DialogTitle className="text-lg">Review</DialogTitle>
            <DialogDescription>
              {review.product.title} · {review.user ? `@${review.user.username}` : (review.customAuthorName || "Guest Author")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              {review.user ? review.user.name : (review.customAuthorName || "Guest Author")}
            </p>
            <p className="truncate">
              {review.user ? review.user.email : "Direct Admin / Guest Review"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Rating
            </Label>
            <StarRating value={rating} onChange={setRating} aria-label="Rating" />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="admin-review-body"
              className="text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Review
            </Label>
            <Textarea
              id="admin-review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={1000}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ReviewStatusValue)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:justify-between sm:px-5">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => void handleDelete()}
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {status === "PENDING" ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending || body.trim().length < 8}
                onClick={() => {
                  void (async () => {
                    const ok = await onSave({
                      rating,
                      body,
                      status: "APPROVED",
                    });
                    if (ok) onOpenChange(false);
                  })();
                }}
              >
                Approve
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={pending || body.trim().length < 8}
              onClick={() => void handleSave()}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
