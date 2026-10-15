"use client";

import { LiveWaveBackground } from "@/components/layout/live-wave-background";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/components/theme/site-config-provider";
import { brandInitial } from "@/types/site-config";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./system-status-screen.module.css";

export type SystemStatusVariant =
  | "maintenance"
  | "banned"
  | "session"
  | "offline"
  | "notFound"
  | "error";

export type SystemStatusAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

type SystemStatusScreenProps = {
  variant: SystemStatusVariant;
  title: string;
  description: string;
  code?: string;
  /** Override brand (useful when config not yet loaded) */
  brandName?: string;
  logoUrl?: string | null;
  brandInitialChar?: string;
  primaryAction?: SystemStatusAction;
  secondaryAction?: SystemStatusAction;
  supportHref?: string | null;
  supportLabel?: string;
  children?: ReactNode;
  className?: string;
  hideWave?: boolean;
};

const VARIANT_CLASS: Record<SystemStatusVariant, string> = {
  maintenance: "",
  banned: styles.variantBanned,
  session: "",
  offline: styles.variantOffline,
  notFound: "",
  error: styles.variantError,
};

function ActionButton({ action }: { action: SystemStatusAction }) {
  const variant = action.variant ?? "default";
  const href = action.href;
  const external =
    href &&
    (/^https?:\/\//i.test(href) ||
      /^mailto:/i.test(href) ||
      /^tel:/i.test(href));

  if (href && external) {
    return (
      <Button asChild variant={variant} size="lg" className="w-full">
        <a href={href} target="_blank" rel="noopener noreferrer">
          {action.label}
        </a>
      </Button>
    );
  }
  if (href) {
    return (
      <Button asChild variant={variant} size="lg" className="w-full">
        <Link href={href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant={variant}
      size="lg"
      className="w-full"
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  );
}

function BrandMark({
  logoUrl,
  initial,
}: {
  logoUrl?: string | null;
  initial: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- status screens may run outside Image optimizer
      <img src={logoUrl} alt="" className={styles.logoMark} />
    );
  }
  return <span className={styles.logoFallback}>{initial}</span>;
}

/**
 * Full-viewport premium status composition (maintenance, ban, 404, errors, …).
 * Must render under SiteConfigProvider (root layout).
 */
export function SystemStatusScreen({
  variant,
  title,
  description,
  code,
  brandName,
  logoUrl: logoUrlProp,
  brandInitialChar,
  primaryAction,
  secondaryAction,
  supportHref,
  supportLabel = "Contact support",
  children,
  className,
  hideWave = false,
}: SystemStatusScreenProps) {
  const site = useSiteConfig();
  const siteName = brandName ?? site.siteName;
  const logoUrl = logoUrlProp !== undefined ? logoUrlProp : site.logoUrl || null;
  const initial = brandInitialChar ?? site.initial ?? brandInitial(siteName);

  return (
    <main
      className={cn(styles.root, VARIANT_CLASS[variant], className)}
      role="status"
      aria-live="polite"
    >
      {!hideWave ? <LiveWaveBackground /> : null}
      <div className={styles.glow} aria-hidden />
      <div className={styles.grid} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.logoFrame}>
          <span className={styles.logoRing} aria-hidden />
          <BrandMark logoUrl={logoUrl} initial={initial} />
        </div>
        <p className={styles.brand}>{siteName}</p>
        {code ? <p className={styles.code}>{code}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        {primaryAction || secondaryAction ? (
          <div className={styles.actions}>
            <div className={styles.actionsRow}>
              {primaryAction ? <ActionButton action={primaryAction} /> : null}
              {secondaryAction ? (
                <ActionButton
                  action={{
                    ...secondaryAction,
                    variant: secondaryAction.variant ?? "outline",
                  }}
                />
              ) : null}
            </div>
          </div>
        ) : null}
        {children}
        {supportHref ? (
          <p className={styles.hint}>
            Need help?{" "}
            <a href={supportHref} target="_blank" rel="noopener noreferrer">
              {supportLabel}
            </a>
          </p>
        ) : null}
      </div>
    </main>
  );
}
