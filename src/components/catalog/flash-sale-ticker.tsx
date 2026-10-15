"use client";

import styles from "@/components/catalog/flash-sale-ticker.module.css";
import { formatFlashCountdown } from "@/lib/flash-sale-format";
import { cn } from "@/lib/utils";
import type { ProductFlashSale } from "@/types/product";
import { Clock3, Flame } from "lucide-react";
import { useSyncExternalStore } from "react";

type FlashSaleTickerProps = {
  sale: ProductFlashSale;
  className?: string;
  compact?: boolean;
};

function subscribeCountdown(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(id);
}

export function FlashSaleTicker({
  sale,
  className,
  compact = false,
}: FlashSaleTickerProps) {
  // Server snapshot stays null so SSR HTML matches the hydration pass; live
  // countdown only appears after mount (avoids Date.now() mismatch).
  const countdown = useSyncExternalStore(
    subscribeCountdown,
    () => formatFlashCountdown(sale.expiresAt),
    () => null,
  );

  if (countdown === "ended") return null;

  const rightLabel = countdown
    ? `Ends in ${countdown}`
    : !compact
      ? sale.title
      : "Flash";

  return (
    <div
      className={cn(
        styles.ticker,
        compact ? styles.compact : styles.full,
        className,
      )}
    >
      <span className={styles.left}>
        <Flame className={cn(styles.icon, compact ? "size-3" : "size-3.5")} />
        <span className={styles.label}>{sale.discountPercent}% OFF</span>
      </span>
      <span className={styles.right}>
        <Clock3 className={cn(styles.icon, compact ? "size-3" : "size-3.5")} />
        <span>{rightLabel}</span>
      </span>
    </div>
  );
}
