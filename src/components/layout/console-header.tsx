"use client";

import styles from "@/components/layout/console-header.module.css";
import { useSidebar } from "@/components/ui/sidebar";
import { resolveConsolePageMeta } from "@/lib/console-page-meta";
import { cn } from "@/lib/utils";
import { Home, Menu, PanelLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type ConsoleHeaderProps = {
  title: string;
  subtitle: string;
  brandBadge?: string;
  storeHref?: string;
  storeLabel?: string;
  trailing?: React.ReactNode;
  className?: string;
};

/** Top console bar — shared by customer `/app` and admin `/admin`. */
export function ConsoleHeader({
  title: fallbackTitle,
  subtitle: fallbackSubtitle,
  brandBadge = "Console",
  storeHref = "/",
  storeLabel = "Home",
  trailing,
  className,
}: ConsoleHeaderProps) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const page = resolveConsolePageMeta(pathname);
  const title = page?.title ?? fallbackTitle;
  const subtitle = page?.subtitle ?? fallbackSubtitle;
  const PageIcon = page?.icon;

  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.wash} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.leading}>
          <button
            type="button"
            className={cn(styles.menuBtn, styles.menuBtnMobile)}
            onClick={toggleSidebar}
            aria-label="Open sidebar"
          >
            <Menu />
          </button>
          <button
            type="button"
            className={cn(styles.menuBtn, styles.menuBtnDesktop)}
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <PanelLeft />
          </button>

          <span className={styles.divider} aria-hidden />

          <div className={styles.titleBlock}>
            <div className={styles.titleRow}>
              {PageIcon ? (
                <span className={styles.pageIcon} aria-hidden>
                  <PageIcon />
                </span>
              ) : null}
              <h1 className={styles.pageTitle}>{title}</h1>
            </div>
            <p className={styles.pageDesc}>{subtitle}</p>
          </div>
        </div>

        <div className={styles.trailing}>
          <span className={styles.roleBadge}>{brandBadge}</span>

          <Link href={storeHref} className={styles.homeBtn}>
            <span className={styles.homeBtnIcon} aria-hidden>
              <Home />
            </span>
            <span className={styles.homeBtnLabel}>{storeLabel}</span>
          </Link>

          {trailing ? (
            <>
              <span className={styles.trailingDivider} aria-hidden />
              {trailing}
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
