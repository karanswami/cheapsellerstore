"use client";

import { Crown } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./premium-badge.module.css";

export type PremiumBadgeProps = {
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  animated?: boolean;
  variant?: "chip" | "seal" | "icon-only";
  className?: string;
};

const sizeClass = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
} as const;

const iconClass = {
  xs: styles.iconXs,
  sm: styles.iconSm,
  md: styles.iconMd,
} as const;

export function PremiumBadge({
  size = "sm",
  showLabel = true,
  animated = true,
  variant = "chip",
  className,
}: PremiumBadgeProps) {
  const isSeal = variant === "seal";
  const isIconOnly = variant === "icon-only";
  const isChip = variant === "chip";

  return (
    <span
      className={cn(
        styles.root,
        isChip && styles.chip,
        isSeal && styles.seal,
        isIconOnly && styles.iconOnly,
        !isIconOnly && sizeClass[size],
        animated && !isIconOnly && styles.animated,
        className,
      )}
      title="Premium member"
      aria-label={showLabel && isChip ? undefined : "Premium member"}
    >
      {animated && !isIconOnly ? (
        <span className={styles.glow} aria-hidden />
      ) : null}

      <Crown className={cn(styles.icon, iconClass[size])} aria-hidden />
      {showLabel && isChip ? (
        <span className={styles.label}>Premium</span>
      ) : null}
    </span>
  );
}
