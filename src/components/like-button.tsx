"use client";

import { useCallback, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/** Optimistic like state: flips instantly, syncs with the server, rolls back on failure. */
export function useLike(productId: string, initialLiked: boolean, initialCount: number, loggedIn: boolean) {
  const [state, setState] = useState({ liked: initialLiked, count: initialCount });
  const [pop, setPop] = useState(0);
  const inflight = useRef(false);

  const toggle = useCallback(
    async (forceOn = false) => {
      if (!loggedIn) {
        toast.message("Sign in to like products", {
          action: { label: "Sign in", onClick: () => (window.location.href = `/login?next=${encodeURIComponent("/")}`) },
        });
        return;
      }
      if (forceOn && state.liked) return; // double-tap never un-likes, like Instagram
      if (inflight.current) return;
      inflight.current = true;
      const prev = state;
      const next = { liked: !prev.liked, count: Math.max(0, prev.count + (prev.liked ? -1 : 1)) };
      setState(next);
      if (next.liked) setPop((n) => n + 1);
      try {
        const res = await fetch(`/api/products/${productId}/like`, { method: "POST" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.data) throw new Error();
        setState({ liked: json.data.liked, count: json.data.count });
      } catch {
        setState(prev);
        toast.error("Couldn't update your like. Try again.");
      } finally {
        inflight.current = false;
      }
    },
    [loggedIn, productId, state],
  );

  return { ...state, pop, toggle };
}

export function LikeButton({
  liked,
  count,
  pop,
  onToggle,
  className,
}: {
  liked: boolean;
  count: number;
  pop: number;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={cn(
        "group/like inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-xs font-semibold tabular-nums transition-colors hover:bg-muted",
        liked ? "text-rose-500" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Heart
        key={pop}
        className={cn(
          "size-[18px] transition-colors",
          liked ? "anim-heart-pop fill-rose-500 text-rose-500" : "group-hover/like:text-rose-400",
        )}
      />
      {count > 0 ? formatCount(count) : null}
    </button>
  );
}
