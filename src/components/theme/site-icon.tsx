"use client";

import { useSiteIcon } from "@/components/theme/site-icons-provider";
import { cn } from "@/lib/utils";
import type { SiteIconKey } from "@/types/site-icons";

export function SiteIcon({
  name,
  alt = "",
  className,
  imgClassName,
}: {
  name: SiteIconKey;
  alt?: string;
  className?: string;
  imgClassName?: string;
}) {
  const src = useSiteIcon(name);

  return (
    <span
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn("size-full object-contain", imgClassName)}
        draggable={false}
      />
    </span>
  );
}
