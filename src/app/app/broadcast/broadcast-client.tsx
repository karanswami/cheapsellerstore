"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BellRing, ChevronRight, Copy, ExternalLink, Megaphone, Pin, Search, Sparkles, Store, X } from "lucide-react";
import { toast } from "sonner";
import { IconTile, Surface } from "@/components/app-kit";
import { BottomSheet } from "@/components/app-kit-client";
import { Button } from "@/components/ui/button";
import type { BroadcastRow } from "@/lib/broadcasts";
import { cn } from "@/lib/utils";

const SEEN_KEY = "broadcast:lastSeen";
type Filter = "all" | "new";

function timeAgo(iso: string, now: number) {
  const s = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Today / Yesterday / This week / Month YYYY buckets. */
function bucket(iso: string, now: number) {
  const d = new Date(iso);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((start.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This week";
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

const fullDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const isExternal = (url: string) => /^https?:\/\//i.test(url);

function ActionButton({ url, className, size = "default" }: { url: string; className?: string; size?: "default" | "lg" }) {
  const label = isExternal(url) ? "Open link" : "Take me there";
  const Icon = isExternal(url) ? ExternalLink : ArrowRight;
  return (
    <Button asChild size={size} className={className}>
      {isExternal(url) ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {label} <Icon />
        </a>
      ) : (
        <Link href={url}>
          {label} <Icon />
        </Link>
      )}
    </Button>
  );
}

function AudienceChip({ audience }: { audience: BroadcastRow["audience"] }) {
  if (audience !== "SELLER") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
      <Store className="size-3" /> Sellers
    </span>
  );
}

export function BroadcastClient({ items }: { items: BroadcastRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  // Remember what the user has already seen; this visit's "new" markers stay until next visit.
  useEffect(() => {
    const stored = Number(localStorage.getItem(SEEN_KEY) ?? 0);
    /* eslint-disable react-hooks/set-state-in-effect */
    setLastSeen(Number.isFinite(stored) ? stored : 0);
    setNow(Date.now());
    /* eslint-enable react-hooks/set-state-in-effect */
    if (items[0]) localStorage.setItem(SEEN_KEY, String(new Date(items[0].createdAt).getTime()));
  }, [items]);

  const isNew = (b: BroadcastRow) => lastSeen !== null && lastSeen > 0 && new Date(b.createdAt).getTime() > lastSeen;
  const newCount = items.filter(isNew).length;

  const q = query.trim().toLowerCase();
  const filtered = items.filter((b) => (filter === "all" || isNew(b)) && (!q || `${b.title} ${b.message}`.toLowerCase().includes(q)));
  const featured = !q && filter === "all" ? filtered[0] : undefined;
  const rest = featured ? filtered.slice(1) : filtered;

  const groupMap = new Map<string, BroadcastRow[]>();
  for (const b of rest) {
    const k = now ? bucket(b.createdAt, now) : "";
    groupMap.set(k, [...(groupMap.get(k) ?? []), b]);
  }
  const groups = [...groupMap.entries()];

  const open = items.find((b) => b.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="hero-card p-5 [--hero-a:#8b5cf6] [--hero-b:#0ea5e9] sm:p-6">
        <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />
        <Megaphone aria-hidden className="anim-float absolute -right-5 -top-5 -z-10 size-36 -rotate-12 text-white/[0.07]" strokeWidth={1.25} />
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          <Megaphone className="size-3.5" /> Broadcast
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {newCount > 0 ? `${newCount} new ${newCount === 1 ? "update" : "updates"}` : "You're all caught up"}
        </h1>
        <p className="mt-1.5 max-w-sm text-sm text-white/65">Announcements, offers and updates from the team.</p>
        <div className="mt-5 flex gap-6">
          <div>
            <p className="font-display text-xl font-bold leading-none tabular-nums">{items.length}</p>
            <p className="mt-1 text-[10.5px] uppercase tracking-wider text-white/55">Posts</p>
          </div>
          {items[0] && now ? (
            <div>
              <p className="font-display text-xl font-bold leading-none">{timeAgo(items[0].createdAt, now)}</p>
              <p className="mt-1 text-[10.5px] uppercase tracking-wider text-white/55">Last update</p>
            </div>
          ) : null}
        </div>
      </section>

      {items.length === 0 ? (
        <Surface className="px-6 py-14 text-center">
          <IconTile icon={BellRing} tone="violet" className="anim-float mx-auto size-16 rounded-3xl [&_svg]:size-7" />
          <p className="mt-4 font-display text-lg font-bold">No announcements yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Important updates and offers will show up here.</p>
        </Surface>
      ) : (
        <>
          <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 flex gap-2 bg-background/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/[0.06] bg-card/80 px-3.5">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search updates" aria-label="Search updates" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70" />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="tap text-muted-foreground">
                  <X className="size-4" />
                </button>
              ) : null}
            </label>
            {newCount > 0 ? (
              <div role="tablist" aria-label="Filter" className="relative grid w-36 shrink-0 grid-cols-2 rounded-2xl border border-white/[0.06] bg-card/80 p-1">
                <span
                  aria-hidden
                  className="bg-brand-gradient absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-xl shadow-lg shadow-primary/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ transform: `translateX(${filter === "new" ? 100 : 0}%)` }}
                />
                {(["all", "new"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={cn("relative rounded-xl text-[13px] font-semibold capitalize transition-colors", filter === f ? "text-primary-foreground" : "text-muted-foreground")}
                  >
                    {f}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {featured ? (
            <button type="button" onClick={() => setOpenId(featured.id)} className="tap block w-full text-left">
              <Surface className="border-primary/25 p-5 sm:p-6">
                <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-primary/15 blur-3xl" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-highlight/15 px-1.5 py-0.5 text-[10px] font-bold text-highlight">
                      <Pin className="size-3" /> Latest
                    </span>
                    {isNew(featured) ? <NewDot /> : null}
                    <AudienceChip audience={featured.audience} />
                    {now ? <time className="ml-auto text-xs text-muted-foreground">{timeAgo(featured.createdAt, now)}</time> : null}
                  </div>
                  <h2 className="mt-3 font-display text-xl font-bold tracking-tight sm:text-2xl">{featured.title}</h2>
                  <p className="mt-2 line-clamp-4 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">{featured.message}</p>
                  <span className="mt-3 inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
                    Read full post <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </Surface>
            </button>
          ) : null}

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">{q ? `Nothing found for “${query.trim()}”.` : "No new updates."}</p>
            </div>
          ) : (
            groups.map(([label, list]) => (
              <section key={label}>
                {label ? <h3 className="mb-2.5 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</h3> : null}
                <Surface className="divide-y divide-white/[0.05] p-1.5">
                  {list.map((b) => (
                    <button key={b.id} type="button" onClick={() => setOpenId(b.id)} className="tap flex w-full items-start gap-3 rounded-2xl px-2.5 py-3 text-left transition-colors hover:bg-white/[0.03]">
                      <span className="relative mt-0.5">
                        <IconTile icon={b.audience === "SELLER" ? Store : Megaphone} tone={b.audience === "SELLER" ? "sky" : "violet"} className="size-10 rounded-xl [&_svg]:size-4" />
                        {isNew(b) ? <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={cn("truncate text-sm", isNew(b) ? "font-bold" : "font-semibold")}>{b.title}</span>
                          <AudienceChip audience={b.audience} />
                        </span>
                        <span className="mt-0.5 line-clamp-2 block whitespace-pre-line break-words text-xs leading-relaxed text-muted-foreground">{b.message}</span>
                      </span>
                      {now ? <time className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(b.createdAt, now)}</time> : null}
                    </button>
                  ))}
                </Surface>
              </section>
            ))
          )}
        </>
      )}

      <PostSheet b={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

function NewDot() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
      <Sparkles className="size-3" /> New
    </span>
  );
}

function PostSheet({ b, onClose }: { b: BroadcastRow | null; onClose: () => void }) {
  // keep content while the sheet animates out
  const [shown, setShown] = useState<BroadcastRow | null>(b);
  if (b && b !== shown) setShown(b);
  const x = b ?? shown;

  return (
    <BottomSheet
      open={Boolean(b)}
      onClose={onClose}
      label="Announcement"
      title={x?.title}
      subtitle={x ? fullDate(x.createdAt) : undefined}
      icon={x ? <IconTile icon={x.audience === "SELLER" ? Store : Megaphone} tone={x.audience === "SELLER" ? "sky" : "violet"} /> : null}
    >
      {x ? (
        <div className="space-y-5">
          <AudienceChip audience={x.audience} />
          <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-foreground/90">{x.message}</p>
          <div className="space-y-2">
            {x.actionUrl ? <ActionButton url={x.actionUrl} size="lg" className="w-full" /> : null}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${x.title}\n\n${x.message}${x.actionUrl ? `\n\n${x.actionUrl}` : ""}`);
                  toast.success("Copied");
                } catch {
                  toast.error("Couldn't copy.");
                }
              }}
            >
              <Copy /> Copy text
            </Button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}
