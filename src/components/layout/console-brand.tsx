"use client";

import sidebarSurface from "@/components/layout/console-sidebar.module.css";
import { useSiteConfig } from "@/components/theme/site-config-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GalleryVerticalEnd, X } from "lucide-react";
import Link from "next/link";

type ConsoleBrandProps = {
  href: string;
  title?: string;
  subtitle: string;
  onClose?: () => void;
  className?: string;
};

/** Sidebar brand block — logo + title + optional mobile close. */
export function ConsoleBrand({
  href,
  title,
  subtitle,
  onClose,
  className,
}: ConsoleBrandProps) {
  const site = useSiteConfig();
  const brandTitle = title ?? site.siteName;

  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-3", className)}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-2.5">
        {site.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={site.logoUrl}
            alt=""
            className="size-9 shrink-0 rounded-full object-contain"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_12px_-2px_color-mix(in_oklab,var(--primary)_55%,transparent)]">
            <GalleryVerticalEnd className="size-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              sidebarSurface.brandTitle,
              "truncate text-sm font-bold tracking-wide uppercase",
            )}
          >
            {brandTitle}
          </p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </Link>
      {onClose ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-8 shrink-0 rounded-full"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
