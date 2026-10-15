"use client";

import { useSiteConfig } from "@/components/theme/site-config-provider";
import { cn } from "@/lib/utils";
import { GalleryVerticalEnd, X } from "lucide-react";
import Link from "next/link";

/** Compact one-row brand: small logo, site name, role chip. */
export function SideBrand({
  href,
  tag,
  onClose,
  className,
}: {
  href: string;
  /** Role chip text, e.g. "Admin". */
  tag: string;
  onClose?: () => void;
  className?: string;
}) {
  const site = useSiteConfig();

  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2.5", className)}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-2.5">
        {site.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={site.logoUrl}
            alt=""
            className="size-8 shrink-0 rounded-lg bg-muted/50 object-contain"
          />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight">
          {site.siteName}
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-primary uppercase">
          {tag}
        </span>
      </Link>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
