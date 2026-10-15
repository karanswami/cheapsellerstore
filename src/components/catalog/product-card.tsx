"use client";

import { useEffect, useState } from "react";
import { FlashSaleTicker } from "@/components/catalog/flash-sale-ticker";
import styles from "@/components/catalog/product-card.module.css";
import { ProductDemoDialog } from "@/components/product/product-demo-dialog";
import { ProductReviewsDrawer } from "@/components/product/product-reviews-drawer";
import { ProductSheet } from "@/components/product/product-sheet";
import { RatingSummary } from "@/components/product/rating-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/types/product";
import { BadgeCheck, ShoppingBag, SquarePlay, Wrench } from "lucide-react";

type StatusBadge = {
  label: string;
  kind: "hot" | "new" | "bestseller" | "popular" | "pinned" | "maintenance";
};

function statusBadge(product: ProductCardData): StatusBadge | null {
  if (product.isMaintenance) return { label: "MAINTENANCE", kind: "maintenance" };
  if (product.flashSale) return { label: "🔥 HOT", kind: "hot" };
  if (product.isPinned) return { label: "PINNED", kind: "pinned" };
  if (product.isBestSeller) return { label: "BESTSELLER", kind: "bestseller" };
  if (product.isNew) return { label: "NEW", kind: "new" };
  if (product.rating >= 4.8) return { label: "POPULAR", kind: "popular" };
  return null;
}

function statusClass(kind: StatusBadge["kind"]) {
  if (kind === "maintenance") return "bg-amber-500 text-slate-950 border-amber-400";
  if (kind === "hot") return styles.statusHot;
  if (kind === "new") return styles.statusNew;
  if (kind === "bestseller") return styles.statusBestseller;
  if (kind === "pinned") return styles.statusPinned;
  return styles.statusPopular;
}

function ProductBanner({ product }: { product: ProductCardData }) {
  if (product.imageUrl) {
    return (
      <div className={styles.mediaFrame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt=""
          className={styles.mediaImage}
          decoding="async"
        />
      </div>
    );
  }

  const initial = product.title.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={styles.bannerFallback}>
      <span className={styles.bannerInitial}>{initial}</span>
    </div>
  );
}

type ProductCardProps = {
  product: ProductCardData;
};

export function ProductCard({ product }: ProductCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [liveRating, setLiveRating] = useState(product.rating);
  const [liveCount, setLiveCount] = useState(product.reviewCount);

  useEffect(() => {
    setLiveRating(product.rating);
    setLiveCount(product.reviewCount);
  }, [product.id, product.rating, product.reviewCount]);

  const status = statusBadge(product);
  const inStock = product.durations.some((d) => d.stock > 0);
  const onSale = Boolean(product.flashSale);
  const saveAmount =
    product.startingListPrice != null &&
    product.startingPrice != null &&
    product.startingListPrice > product.startingPrice
      ? product.startingListPrice - product.startingPrice
      : 0;
  const showVerified = liveCount > 0;
  const demoHref = product.demoUrl?.trim() || "";

  const openSheet = () => {
    setSheetOpen(true);
  };

  return (
    <>
      <Card
        size="sm"
        data-interactive=""
        onClick={openSheet}
        className={cn(
          styles.card,
          styles.cardInteractive,
          "pressable relative h-full ring-0 overflow-hidden",
          (!inStock || product.isMaintenance) && "opacity-90",
        )}
      >
        <div className={styles.mediaHit}>
          <ProductBanner product={product} />

          {product.isMaintenance ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/30 backdrop-blur-[2px] p-2 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 text-slate-950 px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase shadow-md">
                <Wrench className="size-3.5 shrink-0" />
                Under Maintenance
              </span>
            </div>
          ) : null}

          {onSale && !product.isMaintenance ? (
            <Badge
              className={cn(
                "absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px]",
                styles.discountBadge,
              )}
            >
              −{product.flashSale!.discountPercent}%
            </Badge>
          ) : null}

          {status ? (
            <Badge
              className={cn(
                "absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-bold tracking-wide z-10",
                statusClass(status.kind),
              )}
            >
              {status.label}
            </Badge>
          ) : null}
        </div>

        {product.flashSale && !product.isMaintenance ? (
          <FlashSaleTicker sale={product.flashSale} compact />
        ) : null}

        <div className={styles.body}>
          <div className={styles.identity}>
            <div className={styles.titleBlock}>
              <div className={styles.metaRow}>
                <p className={styles.category}>
                  {product.category?.name ?? "Uncategorized"}
                </p>
                {showVerified ? (
                  <span
                    className={styles.verifiedSeal}
                    title="Premium Verified"
                  >
                    <BadgeCheck className="size-3 shrink-0" aria-hidden />
                    <span className={styles.verifiedLabel}>Verified</span>
                  </span>
                ) : null}
              </div>
              <h3 className={styles.title} title={product.title}>
                {product.title}
              </h3>
            </div>
          </div>

          <div className={styles.meta}>
            <RatingSummary
              rating={liveRating}
              reviewCount={liveCount}
              size="sm"
              className={styles.rating}
              onClick={() => setReviewsOpen(true)}
            />
          </div>

          {product.features && product.features.length > 0 ? (
            <div className={styles.featureTags}>
              {product.features.map((feat, idx) => (
                <span key={idx} className={styles.featureTag} title={feat}>
                  {feat}
                </span>
              ))}
            </div>
          ) : null}

          {product.description.trim() ? (
            <p className={styles.blurb} title={product.description}>
              {product.description.trim()}
            </p>
          ) : null}

          <p className={styles.fromPrice}>
            {product.startingListPrice != null ? (
              <span className={styles.listPriceInline}>
                {formatMoney(product.startingListPrice, product.currency)}
              </span>
            ) : null}
            <span>
              From{" "}
              {product.startingPrice != null
                ? formatMoney(product.startingPrice, product.currency)
                : "—"}
            </span>
            {saveAmount > 0 ? (
              <span className={styles.saveInline}>
                Save {formatMoney(saveAmount, product.currency)}
              </span>
            ) : null}
          </p>
        </div>

        <CardFooter className={cn(styles.footer, "px-3 sm:px-3.5")}>
          <Button
            size="sm"
            variant="outline"
            className={styles.demoBtn}
            disabled={product.isMaintenance || !demoHref}
            aria-label={`Watch demo for ${product.title}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!product.isMaintenance && demoHref) setDemoOpen(true);
            }}
          >
            <SquarePlay data-icon="inline-start" className="size-3.5" />
            Demo
          </Button>
          <Button
            size="sm"
            disabled={product.isMaintenance || !inStock}
            onClick={(e) => {
              e.stopPropagation();
              openSheet();
            }}
            className={styles.buyNow}
          >
            <ShoppingBag
              data-icon="inline-start"
              className="size-3.5"
            />
            {product.isMaintenance ? "Maintenance" : "Buy"}
          </Button>
        </CardFooter>
      </Card>

      <ProductSheet
        product={product}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <ProductDemoDialog
        open={demoOpen}
        onOpenChange={setDemoOpen}
        title={product.title}
        demoUrl={demoHref}
      />

      <ProductReviewsDrawer
        productId={product.id}
        productTitle={product.title}
        open={reviewsOpen}
        onOpenChange={setReviewsOpen}
        initialRating={liveRating}
        initialCount={liveCount}
        onRatingChange={(average, count) => {
          setLiveRating(average);
          setLiveCount(count);
        }}
      />
    </>
  );
}
