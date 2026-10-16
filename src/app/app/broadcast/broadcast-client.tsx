"use client";

import { BellRing, ChevronDown, ExternalLink, Megaphone, Pin, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, formatDate } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BroadcastRow } from "@/lib/broadcasts";
import { cn } from "@/lib/utils";

const SEEN_KEY = "broadcast:lastSeen";
const LONG_MESSAGE = 220;

function timeAgo(iso: string, now: number) {
  const s = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function ActionLink({ url, className }: { url: string; className?: string }) {
  const external = /^https?:\/\//i.test(url);
  const inner = (
    <>
      {external ? "Open link" : "Take me there"} <ExternalLink className="size-3.5" />
    </>
  );
  const cls = cn("inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline", className);
  return external ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={url} className={cls}>
      {inner}
    </Link>
  );
}

function Message({ text, expanded, onToggle, clamp = true }: { text: string; expanded: boolean; onToggle: () => void; clamp?: boolean }) {
  const long = clamp && text.length > LONG_MESSAGE;
  const shown = long && !expanded ? `${text.slice(0, LONG_MESSAGE).trimEnd()}…` : text;
  return (
    <>
      <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">{shown}</p>
      {long ? (
        <button type="button" onClick={onToggle} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-foreground/80 hover:text-primary">
          {expanded ? "Show less" : "Read more"}
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
      ) : null}
    </>
  );
}

export function BroadcastClient({ items }: { items: BroadcastRow[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Remember what the user has already seen; this visit's "new" markers stay until next visit.
  useEffect(() => {
    const stored = Number(localStorage.getItem(SEEN_KEY) ?? 0);
    setLastSeen(Number.isFinite(stored) ? stored : 0);
    setNow(Date.now());
    if (items[0]) localStorage.setItem(SEEN_KEY, String(new Date(items[0].createdAt).getTime()));
  }, [items]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isNew = (b: BroadcastRow) => lastSeen !== null && lastSeen > 0 && new Date(b.createdAt).getTime() > lastSeen;
  const newCount = items.filter(isNew).length;

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? items.filter((b) => `${b.title} ${b.message}`.toLowerCase().includes(q)) : items),
    [items, q],
  );

  const featured = !q ? filtered[0] : undefined;
  const rest = featured ? filtered.slice(1) : filtered;

  const groups = useMemo(() => {
    const map = new Map<string, BroadcastRow[]>();
    for (const b of rest) {
      const k = monthLabel(b.createdAt);
      map.set(k, [...(map.get(k) ?? []), b]);
    }
    return [...map.entries()];
  }, [rest]);

  if (items.length === 0) {
    return <EmptyState icon={Megaphone} title="No announcements" hint="Important updates and offers will show up here." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search announcements"
            aria-label="Search announcements"
            className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {newCount > 0 ? (
            <Badge variant="highlight" className="gap-1">
              <Sparkles className="size-3" /> {newCount} new
            </Badge>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <BellRing className="size-4" /> You&apos;re all caught up
            </span>
          )}
          <span>· {items.length} total</span>
        </div>
      </div>

      {featured ? (
        <article className="relative overflow-hidden rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="highlight" className="gap-1">
                <Pin className="size-3" /> Latest
              </Badge>
              {isNew(featured) ? <Badge variant="success">New</Badge> : null}
              <time className="ml-auto text-xs text-muted-foreground" title={formatDate(featured.createdAt, true)}>
                {timeAgo(featured.createdAt, now)}
              </time>
            </div>
            <h2 className="mt-3 font-display text-xl font-bold tracking-tight sm:text-2xl">{featured.title}</h2>
            <Message text={featured.message} expanded onToggle={() => {}} clamp={false} />
            {featured.actionUrl ? <ActionLink url={featured.actionUrl} className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground no-underline hover:no-underline hover:opacity-90" /> : null}
          </div>
        </article>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" hint={`Nothing found for “${query.trim()}”.`}>
          <Button variant="outline" size="sm" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </EmptyState>
      ) : (
        groups.map(([month, list]) => (
          <section key={month}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{month}</h3>
            <ol className="relative space-y-3 border-l pl-6">
              {list.map((b) => (
                <li key={b.id} className="relative">
                  <span className={cn("absolute -left-[30px] top-5 size-2.5 rounded-full ring-4 ring-background", isNew(b) ? "bg-primary" : "bg-border")} />
                  <article className={cn("rounded-xl border bg-card p-4 sm:p-5", isNew(b) && "border-primary/40")}>
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <h2 className="flex items-center gap-2 font-display text-base font-semibold sm:text-lg">
                        {b.title}
                        {isNew(b) ? <Badge variant="success">New</Badge> : null}
                      </h2>
                      <time className="text-xs text-muted-foreground" title={formatDate(b.createdAt, true)}>
                        {timeAgo(b.createdAt, now)}
                      </time>
                    </div>
                    <Message text={b.message} expanded={open.has(b.id)} onToggle={() => toggle(b.id)} />
                    {b.actionUrl ? <ActionLink url={b.actionUrl} className="mt-3" /> : null}
                  </article>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
