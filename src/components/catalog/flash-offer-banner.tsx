"use client";

import styles from "@/components/catalog/flash-offer-banner.module.css";
import { formatFlashCountdownParts } from "@/lib/flash-sale-format";
import { cn } from "@/lib/utils";
import type { PublicOfferBanner } from "@/types/offer-banner";
import { Check, Copy, Tag, Zap } from "lucide-react";
import { useSyncExternalStore, useState } from "react";
import { toast } from "sonner";

type FlashOfferBannerProps = {
  offer: PublicOfferBanner;
  className?: string;
};

function subscribeCountdown(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(id);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Primitive snapshot — `useSyncExternalStore` requires referential stability. */
function countdownSnapshot(expiresAt: string | null): string | null {
  const parts = formatFlashCountdownParts(expiresAt);
  if (!parts) return null;
  if (parts.ended) return "ended";
  return `${parts.days}:${parts.hours}:${parts.mins}:${parts.secs}`;
}

function parseCountdownSnapshot(snapshot: string | null) {
  if (!snapshot || snapshot === "ended") return null;
  const [days, hours, mins, secs] = snapshot.split(":").map(Number);
  if ([days, hours, mins, secs].some((n) => !Number.isFinite(n))) return null;
  return { days, hours, mins, secs };
}

export function FlashOfferBanner({ offer, className }: FlashOfferBannerProps) {
  const [copied, setCopied] = useState(false);

  // String snapshot (not a new object) — avoids React #185 infinite re-renders.
  const snapshot = useSyncExternalStore(
    subscribeCountdown,
    () => countdownSnapshot(offer.expiresAt),
    () => null,
  );

  if (snapshot === "ended") return null;

  const parts = parseCountdownSnapshot(snapshot);

  async function copyCode() {
    if (!offer.promoCode) return;
    try {
      await navigator.clipboard.writeText(offer.promoCode);
      setCopied(true);
      toast.success("Promo code copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy code");
    }
  }

  const cells = [
    { label: "Days", value: parts ? pad2(parts.days) : "—" },
    { label: "Hrs", value: parts ? pad2(parts.hours) : "—" },
    { label: "Min", value: parts ? pad2(parts.mins) : "—" },
    { label: "Sec", value: parts ? pad2(parts.secs) : "—" },
  ];

  return (
    <div
      className={cn(styles.banner, className)}
      role="group"
      aria-label="Special offer"
    >
      <div className={styles.glow} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.topRow}>
          <div className={styles.iconBox} aria-hidden>
            <Zap className="size-5 fill-current" />
          </div>
          <div className="min-w-0 flex-1">
            <span className={styles.badge}>Special offer</span>
            <h2 className={styles.title}>{offer.title}</h2>
            {offer.description &&
            offer.description.trim().toLowerCase() !==
              offer.title.trim().toLowerCase() ? (
              <p className={styles.desc}>{offer.description}</p>
            ) : null}
          </div>
        </div>

        <div className={styles.chips}>
          <span className={styles.discountChip}>
            <Tag className="size-3.5" />
            {offer.discountLabel}
          </span>
          {offer.promoCode ? (
            <button
              type="button"
              className={styles.codeChip}
              onClick={() => void copyCode()}
              aria-label={`Copy promo code ${offer.promoCode}`}
            >
              {copied ? (
                <Check className="size-3.5 text-[var(--success)]" />
              ) : (
                <Copy className="size-3.5 opacity-80" />
              )}
              {offer.promoCode}
            </button>
          ) : null}
        </div>

        {offer.expiresAt ? (
          <div className={styles.timerRow} aria-label="Offer countdown">
            {cells.map((cell) => (
              <div key={cell.label} className={styles.timerCell}>
                <span className={styles.timerValue}>{cell.value}</span>
                <span className={styles.timerLabel}>{cell.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
