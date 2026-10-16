"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { formatFlashCountdown } from "@/lib/flash-sale-format";
import { cn } from "@/lib/utils";

/** Flash-sale bar for product cards / product page: title, % off and a live countdown. */
export function FlashStrip({
  title,
  percent,
  endsAt,
  className,
}: {
  title: string;
  percent: number;
  endsAt: string | null;
  className?: string;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const left = formatFlashCountdown(endsAt);
  if (left === "ended") return null;

  return (
    <div className={cn("flex items-center gap-2 bg-warning px-3 py-1.5 text-xs font-bold text-black", className)}>
      <Zap className="size-3.5 shrink-0 fill-current" />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <span className="shrink-0 tabular-nums">{left ? `Ends ${left}` : `-${Math.round(percent)}%`}</span>
    </div>
  );
}
