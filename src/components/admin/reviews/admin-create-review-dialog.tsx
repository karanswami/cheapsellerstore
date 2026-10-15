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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AdminReviewBuyerOption } from "@/types/review";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ProductOption = { id: string; title: string };

export function AdminCreateReviewDialog({
  open,
  onOpenChange,
  products,
  pending,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductOption[];
  pending: boolean;
  onCreate: (payload: {
    productId: string;
    userId?: string | null;
    customAuthorName?: string | null;
    customAvatarUrl?: string | null;
    verifiedBuyer?: boolean;
    rating: number;
    body: string;
  }) => Promise<boolean>;
}) {
  const [authorMode, setAuthorMode] = useState<"custom" | "user">("custom");
  const [productId, setProductId] = useState("");
  const [userId, setUserId] = useState("");
  const [customAuthorName, setCustomAuthorName] = useState("Verified Customer");
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [verifiedBuyer, setVerifiedBuyer] = useState(true);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [buyers, setBuyers] = useState<AdminReviewBuyerOption[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAuthorMode("custom");
    setProductId("");
    setUserId("");
    setCustomAuthorName("Verified Customer");
    setCustomAvatarUrl("");
    setVerifiedBuyer(true);
    setRating(5);
    setBody("");
    setBuyers([]);
  }, [open]);

  useEffect(() => {
    if (!open || !productId || authorMode !== "user") {
      setBuyers([]);
      setUserId("");
      return;
    }

    let cancelled = false;
    setLoadingBuyers(true);
    setUserId("");

    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/reviews?productId=${encodeURIComponent(productId)}`,
          { credentials: "include" },
        );
        const json = (await res.json()) as {
          data?: { buyers: AdminReviewBuyerOption[] };
          error?: { message: string };
        };
        if (cancelled) return;
        if (!res.ok || !json.data) {
          toast.error(json.error?.message ?? "Failed to load buyers");
          setBuyers([]);
          return;
        }
        setBuyers(json.data.buyers);
      } catch {
        if (!cancelled) {
          toast.error("Network error");
          setBuyers([]);
        }
      } finally {
        if (!cancelled) setLoadingBuyers(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, productId, authorMode]);

  const availableBuyers = buyers.filter((b) => !b.alreadyReviewed);

  async function handleCreate() {
    if (!productId) {
      toast.error("Select a product.");
      return;
    }
    if (authorMode === "user" && !userId) {
      toast.error("Select a buyer.");
      return;
    }
    if (authorMode === "custom" && !customAuthorName.trim()) {
      toast.error("Enter an author name.");
      return;
    }
    if (body.trim().length < 8) {
      toast.error("Write at least 8 characters.");
      return;
    }

    const payload =
      authorMode === "user"
        ? { productId, userId, rating, body }
        : {
            productId,
            customAuthorName: customAuthorName.trim(),
            customAvatarUrl: customAvatarUrl.trim() || null,
            verifiedBuyer,
            rating,
            body,
          };

    const ok = await onCreate(payload);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Plus className="size-5" />
            </div>
            <DialogTitle className="text-lg">Add review</DialogTitle>
            <DialogDescription>
              Post an approved review directly or as a registered buyer.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Author Mode
            </Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAuthorMode("custom")}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-xs font-medium transition-colors",
                  authorMode === "custom"
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                Custom Author
              </button>
              <button
                type="button"
                onClick={() => setAuthorMode("user")}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-xs font-medium transition-colors",
                  authorMode === "user"
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                Registered Buyer
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Product
            </Label>
            <Select value={productId || undefined} onValueChange={setProductId}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {authorMode === "user" ? (
            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Buyer
              </Label>
              <Select
                value={userId || undefined}
                onValueChange={setUserId}
                disabled={!productId || loadingBuyers}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue
                    placeholder={
                      !productId
                        ? "Select a product first"
                        : loadingBuyers
                          ? "Loading buyers…"
                          : availableBuyers.length
                            ? "Select buyer"
                            : "No eligible buyers"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableBuyers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      @{b.username} · {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {productId && !loadingBuyers && buyers.length > 0 && availableBuyers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  All buyers already have a review for this product.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Display Name
                </Label>
                <Input
                  value={customAuthorName}
                  onChange={(e) => setCustomAuthorName(e.target.value)}
                  placeholder="e.g. Alex M., Verified Buyer"
                  maxLength={80}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Avatar Image URL (Optional)
                </Label>
                <Input
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-10"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Verified Buyer Badge</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Show green "Verified Buyer" badge on storefront
                  </p>
                </div>
                <Switch
                  checked={verifiedBuyer}
                  onCheckedChange={setVerifiedBuyer}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Rating
            </Label>
            <StarRating value={rating} onChange={setRating} aria-label="Rating" />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="admin-create-review-body"
              className="text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Review
            </Label>
            <Textarea
              id="admin-create-review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Write the review text…"
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:justify-end sm:px-5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              pending ||
              !productId ||
              (authorMode === "user" && !userId) ||
              (authorMode === "custom" && !customAuthorName.trim()) ||
              body.trim().length < 8
            }
            onClick={() => void handleCreate()}
          >
            {pending ? "Posting…" : "Post approved"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
