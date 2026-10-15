"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlashSaleTicker } from "@/components/catalog/flash-sale-ticker";
import { DurationPicker } from "@/components/product/duration-picker";
import { ProductReviewsDrawer } from "@/components/product/product-reviews-drawer";
import { RatingSummary } from "@/components/product/rating-summary";
import { VersionPicker } from "@/components/product/version-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/hooks/use-cart";
import { formatMoney } from "@/lib/currencies";
import {
  formatDurationLabel,
  listProductVersions,
  type DurationOption,
  type ProductCardData,
} from "@/types/product";
import { Package, ShoppingBag, ChevronRight, Smartphone, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function pickFirstDurationId(
  pool: DurationOption[],
  preferId: string | null,
): string | null {
  if (preferId && pool.some((d) => d.id === preferId && d.stock > 0)) {
    return preferId;
  }
  return pool.find((d) => d.stock > 0)?.id ?? pool[0]?.id ?? null;
}

type ProductSheetProps = {
  product: ProductCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductSheet({
  product,
  open,
  onOpenChange,
}: ProductSheetProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [androidIdInput, setAndroidIdInput] = useState("");
  const [liveRating, setLiveRating] = useState<number | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [liveDurations, setLiveDurations] = useState<DurationOption[] | null>(
    null,
  );

  useEffect(() => {
    if (!open || !product) {
      setSelectedId(null);
      setSelectedVersion(null);
      setAndroidIdInput("");
      setLiveRating(null);
      setLiveCount(null);
      setReviewsOpen(false);
      setLiveDurations(null);
      return;
    }
    setLiveRating(product.rating);
    setLiveCount(product.reviewCount);
    setLiveDurations(product.durations);
    const versions = listProductVersions(product.durations);
    const useVersions = versions.length >= 2;
    const initialVersion = useVersions ? versions[0]! : null;
    setSelectedVersion(initialVersion);
    const pool = useVersions
      ? product.durations.filter((d) => d.version.trim() === initialVersion)
      : product.durations;
    setSelectedId(pickFirstDurationId(pool, null));

    let cancelled = false;
    async function refreshStock() {
      try {
        const res = await fetch("/api/stock/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            durationIds: product!.durations.map((d) => d.id),
          }),
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          data?: { lines: Array<{ durationId: string; available: number }> };
        };
        const lines = json.data?.lines;
        if (!lines || cancelled) return;
        const byId = new Map(lines.map((l) => [l.durationId, l.available]));
        const next = product!.durations.map((d) => ({
          ...d,
          stock: byId.get(d.id) ?? 0,
        }));
        setLiveDurations(next);
        const nextVersions = listProductVersions(next);
        const nextUseVersions = nextVersions.length >= 2;
        setSelectedVersion((cur) => {
          if (!nextUseVersions) return null;
          if (cur && nextVersions.includes(cur)) return cur;
          return nextVersions[0] ?? null;
        });
        setSelectedId((cur) => {
          const verList = listProductVersions(next);
          const multi = verList.length >= 2;
          const curVer = cur
            ? next.find((d) => d.id === cur)?.version.trim() || null
            : null;
          const ver = multi
            ? curVer && verList.includes(curVer)
              ? curVer
              : verList[0]!
            : null;
          const poolNext = multi
            ? next.filter((d) => d.version.trim() === ver)
            : next;
          return pickFirstDurationId(poolNext, cur);
        });
      } catch {
        /* keep SSR stock */
      }
    }
    void refreshStock();
    return () => {
      cancelled = true;
    };
  }, [open, product]);

  const onRatingChange = useCallback((average: number, count: number) => {
    setLiveRating(average);
    setLiveCount(count);
  }, []);

  const durations = liveDurations ?? product?.durations ?? [];
  const versions = useMemo(() => listProductVersions(durations), [durations]);
  const useVersions = versions.length >= 2;
  const visibleDurations = useMemo(() => {
    if (!useVersions || !selectedVersion) return durations;
    return durations.filter((d) => d.version.trim() === selectedVersion);
  }, [durations, useVersions, selectedVersion]);

  const selected = visibleDurations.find((d) => d.id === selectedId);
  const canPurchase = Boolean(
    selected && selected.stock > 0 && selected.price != null && !product?.isMaintenance,
  );

  function onVersionChange(version: string) {
    setSelectedVersion(version);
    const pool = durations.filter((d) => d.version.trim() === version);
    setSelectedId(pickFirstDurationId(pool, null));
  }

  function buyNow() {
    if (!product || product.isMaintenance || !selected || selected.stock <= 0 || selected.price == null)
      return;

    const requiresAndroid = Boolean(selected.requiresAndroidId);
    const trimmedAndroidId = androidIdInput.trim();
    const idLabel = (selected.deviceIdName || "").trim() || "Android ID";

    if (requiresAndroid && !trimmedAndroidId) {
      toast.error(`${idLabel} required`, {
        description: `Please enter your ${idLabel} before proceeding.`,
      });
      return;
    }

    addItem(
      {
        productId: product.id,
        durationId: selected.id,
        title: product.title,
        durationLabel: formatDurationLabel(selected),
        unitPrice: selected.price,
        listPrice: selected.listPrice,
        flashTitle: selected.flashSale?.title ?? null,
        flashPercent: selected.flashSale?.discountPercent ?? null,
        flashEndsAt: selected.flashSale?.expiresAt ?? null,
        currency: selected.currency,
        imageUrl: product.imageUrl,
        requiresAndroidId: selected.requiresAndroidId,
        deviceIdName: selected.deviceIdName,
        androidId: requiresAndroid ? trimmedAndroidId : undefined,
      },
      1,
    );
    onOpenChange(false);
    router.push("/checkout");
  }

  const displayRating = liveRating ?? product?.rating ?? 0;
  const displayCount = liveCount ?? product?.reviewCount ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="lg"
          className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          {product ? (
            <>
              <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
                <DialogHeader className="gap-3 pr-8 text-left">
                  <div className="flex items-start gap-3.5">
                    <ProductThumb product={product} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {product.category?.name ? (
                        <p className="text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">
                          {product.category.name}
                        </p>
                      ) : null}
                      <DialogTitle className="text-lg leading-snug sm:text-xl">
                        {product.title}
                      </DialogTitle>
                      <DialogDescription className="line-clamp-2 text-left">
                        {product.description}
                      </DialogDescription>
                      <RatingSummary
                        rating={displayRating}
                        reviewCount={displayCount}
                        size="md"
                        onClick={() => setReviewsOpen(true)}
                        className="mt-0.5"
                      />
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {product.flashSale ? (
                <FlashSaleTicker sale={product.flashSale} />
              ) : null}

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
                {product.isMaintenance ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 ring-1 ring-amber-500/20 text-amber-300 backdrop-blur-md">
                    <Wrench className="size-5 shrink-0 text-amber-400 animate-pulse" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Under Maintenance</p>
                      <p className="text-[11px] leading-snug text-amber-200/80">This product is currently under maintenance. Purchases are temporarily disabled.</p>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setReviewsOpen(true)}
                  className="pressable flex w-full items-center justify-between gap-3 rounded-xl bg-muted/40 px-3.5 py-3 text-left ring-1 ring-foreground/8 transition-[background-color,box-shadow,ring-color] hover:bg-muted/70 hover:ring-primary/30 hover:shadow-[var(--glow-soft)]"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold tracking-tight">
                      Ratings & reviews
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {displayCount > 0
                        ? `${displayRating.toFixed(1)} average · ${displayCount} review${displayCount === 1 ? "" : "s"}`
                        : "Be the first to leave a verified review"}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                    Open
                    <ChevronRight className="size-4" aria-hidden />
                  </span>
                </button>

                {product.features.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {product.features.map((feature) => (
                      <li
                        key={feature}
                        className="rounded-lg bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-foreground/6"
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {useVersions ? (
                  <div className="space-y-2.5">
                    <p className="text-sm font-semibold tracking-tight">
                      Choose your version
                    </p>
                    <VersionPicker
                      versions={versions}
                      value={selectedVersion}
                      onChange={onVersionChange}
                    />
                  </div>
                ) : null}

                <div className="space-y-2.5">
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-sm font-semibold tracking-tight">
                      {useVersions && selectedVersion
                        ? `${selectedVersion} — choose duration`
                        : "Choose duration"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Instant key delivery
                    </p>
                  </div>
                  <DurationPicker
                    durations={visibleDurations}
                    value={selectedId}
                    onChange={setSelectedId}
                  />
                  {selected?.requiresAndroidId ? (
                    <div className="mt-3 space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 ring-1 ring-amber-500/20">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="product-sheet-android-id"
                          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400"
                        >
                          <Smartphone className="size-3.5" />
                          {(selected.deviceIdName || "").trim() || "Android ID"} (Required)
                        </Label>
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Device Bound
                        </span>
                      </div>
                      <Input
                        id="product-sheet-android-id"
                        placeholder={`Enter ${(selected.deviceIdName || "").trim() || "Android ID"} (e.g. 8a7b6c5d4e3f2a1b)`}
                        value={androidIdInput}
                        onChange={(e) => setAndroidIdInput(e.target.value)}
                        className="h-10 border-amber-500/30 bg-background/90 font-mono text-sm placeholder:font-sans placeholder:text-muted-foreground focus-visible:ring-amber-500"
                      />
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        This product generates a key locked to your {(selected.deviceIdName || "").trim() || "Android ID"}. You will proceed directly to checkout.
                      </p>
                    </div>
                  ) : null}
                  {!canPurchase &&
                  visibleDurations.every((d) => d.stock <= 0) ? (
                    <p className="text-xs text-muted-foreground">
                      {useVersions
                        ? "This version is currently out of stock."
                        : "All durations are currently out of stock."}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 space-y-3 border-t border-border/40 bg-muted/20 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">
                      {selected
                        ? formatDurationLabel(selected)
                        : useVersions
                          ? "Select a version & duration"
                          : "Select a duration"}
                    </p>
                    <p className="text-lg font-bold tabular-nums text-success">
                      {selected?.price != null
                        ? formatMoney(selected.price, selected.currency)
                        : "—"}
                    </p>
                  </div>
                  {selected?.listPrice != null &&
                  selected.price != null &&
                  selected.listPrice > selected.price ? (
                    <p className="shrink-0 text-xs font-medium tabular-nums text-success/90">
                      Save{" "}
                      {formatMoney(
                        selected.listPrice - selected.price,
                        selected.currency,
                      )}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="lg"
                  disabled={!canPurchase}
                  onClick={buyNow}
                  className={
                    selected?.requiresAndroidId
                      ? "w-full bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold shadow-[var(--glow-soft)]"
                      : "w-full"
                  }
                >
                  <ShoppingBag data-icon="inline-start" />
                  Buy now
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {product ? (
        <ProductReviewsDrawer
          productId={product.id}
          productTitle={product.title}
          open={reviewsOpen}
          onOpenChange={setReviewsOpen}
          initialRating={displayRating}
          initialCount={displayCount}
          onRatingChange={onRatingChange}
        />
      ) : null}
    </>
  );
}

function ProductThumb({ product }: { product: ProductCardData }) {
  if (product.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.imageUrl}
        alt=""
        className="size-20 shrink-0 rounded-2xl object-cover ring-1 ring-foreground/10 sm:size-24"
      />
    );
  }

  return (
    <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20 sm:size-24">
      <Package className="size-8" />
    </span>
  );
}
