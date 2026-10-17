"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Download,
  History,
  Loader2,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingBag,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { IconTile, Surface, type Tone } from "@/components/app-kit";
import { BottomSheet, CountUp } from "@/components/app-kit-client";
import { formatDate } from "@/components/app-ui";
import { formatMoney } from "@/lib/currencies";
import { feedbackTap } from "@/lib/feedback";
import type { ActivitySummary } from "@/lib/history";
import { cn } from "@/lib/utils";
import type { ActivityFilter, ActivityItem } from "@/types/history";

type Page = { items: ActivityItem[]; page: number; limit: number; hasMore: boolean };

const PAGE_SIZE = 50;
const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "order", label: "Orders" },
  { id: "deposit", label: "Deposits" },
  { id: "wallet", label: "Wallet" },
];

// Validated (dataviz) against the dark card surfaces: in = emerald-600, out = violet-500.
const IN_COLOR = "#059669";
const OUT_COLOR = "#8b5cf6";

const STATUS_TONE: Record<string, string> = {
  COMPLETED: "bg-success/15 text-success",
  PAID: "bg-success/15 text-success",
  FULFILLED: "bg-success/15 text-success",
  PENDING: "bg-warning/15 text-warning",
  PROCESSING: "bg-warning/15 text-warning",
  FAILED: "bg-destructive/15 text-destructive",
  REJECTED: "bg-destructive/15 text-destructive",
  REFUNDED: "bg-highlight/15 text-highlight",
};

const tap = () => feedbackTap({ impact: "selection", silent: true });
const pretty = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
const utcDay = (iso: string) => iso.slice(0, 10);
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function dayLabel(iso: string) {
  const key = utcDay(new Date(iso).toISOString());
  if (key === utcDay(new Date().toISOString())) return "Today";
  if (key === utcDay(new Date(Date.now() - 86_400_000).toISOString())) return "Yesterday";
  return formatDate(iso);
}

function signed(amount: number) {
  return `${amount < 0 ? "−" : amount > 0 ? "+" : ""}${formatMoney(Math.abs(amount))}`;
}

function look(it: ActivityItem): { icon: LucideIcon; tone: Tone } {
  if (it.kind === "order") return { icon: ShoppingBag, tone: "primary" };
  if (it.kind === "deposit") return { icon: ArrowDownLeft, tone: "emerald" };
  if (it.status === "REFUND") return { icon: RotateCcw, tone: "sky" };
  if (it.amount != null && it.amount < 0) return { icon: ArrowUpRight, tone: "rose" };
  return { icon: Wallet, tone: "violet" };
}

/** Where a row leads beyond the sheet, if anywhere. */
function linkFor(it: ActivityItem) {
  if (it.kind === "order") return { href: `/app/order/${it.id.replace(/^order-/, "")}`, label: "View order" };
  if (it.kind === "deposit") return { href: `/app/deposit/${it.id.replace(/^deposit-/, "")}`, label: "View deposit" };
  return null;
}

export function HistoryClient({ initial, summary }: { initial: Page; summary: ActivitySummary | null }) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Page>(initial);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [detail, setDetail] = useState<ActivityItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const first = useRef(true);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (page: number, f: ActivityFilter, q: string) => {
    busy.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), filter: f });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/history?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      const next: Page = json.data;
      setData((prev) => (page === 1 ? next : { ...next, items: [...prev.items, ...next.items] }));
    } catch {
      toast.error("Could not load history.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  // Refetch from page 1 when the filter or (debounced) search changes.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus(null);
    const t = setTimeout(() => load(1, filter, query), 300);
    return () => clearTimeout(t);
  }, [filter, query, load]);

  // Live update: the server re-rendered with newer data; re-pull what's on screen.
  const seen = useRef(initial);
  useEffect(() => {
    if (seen.current === initial) return;
    seen.current = initial;
    if (!busy.current) void load(1, filter, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // Infinite scroll: pull the next page as the end of the list nears.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !data.hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !busy.current) load(data.page + 1, filter, query);
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [data.hasMore, data.page, filter, query, load]);

  const statuses = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of data.items) if (it.kind !== "wallet") m.set(it.status, (m.get(it.status) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.items]);

  const items = useMemo(
    () => (status ? data.items.filter((it) => it.status === status) : data.items),
    [data.items, status],
  );

  const groups = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    for (const it of items) {
      const label = dayLabel(it.createdAt);
      map.set(label, [...(map.get(label) ?? []), it]);
    }
    return [...map.entries()];
  }, [items]);

  function exportCsv() {
    const rows = [["Date", "Type", "Title", "Details", "Status", "Amount (USD)"]];
    for (const it of items) {
      rows.push([
        it.createdAt,
        it.kind,
        it.title,
        it.subtitle,
        it.status,
        it.amount == null ? "" : (it.amount / 100_000_000).toFixed(2),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "history.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Exported ${items.length} rows`);
  }

  const searching = Boolean(query || status);
  const filterIndex = FILTERS.findIndex((f) => f.id === filter);

  return (
    <div className="space-y-5">
      {summary ? <StatementCard s={summary} /> : null}

      {/* Toolbar: sticks under the mobile app bar */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 space-y-2.5 bg-background/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div role="tablist" aria-label="Activity type" className="relative grid grid-cols-4 rounded-2xl border border-white/[0.06] bg-card/80 p-1">
          <span
            aria-hidden
            className="bg-brand-gradient absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-xl shadow-lg shadow-primary/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${filterIndex * 100}%)` }}
          />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => {
                tap();
                setFilter(f.id);
              }}
              className={cn(
                "relative h-9 rounded-xl text-[13px] font-semibold transition-colors",
                filter === f.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders, deposits, IDs…"
              className="h-11 w-full rounded-2xl border border-white/[0.06] bg-card/80 pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 [&::-webkit-search-cancel-button]:hidden"
            />
            {loading && data.page === 1 ? (
              <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="tap absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!items.length}
            aria-label="Export CSV"
            title="Export loaded rows as CSV"
            className="tap grid size-11 shrink-0 place-items-center rounded-2xl border border-white/[0.06] bg-card/80 text-foreground/85 transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Download className="size-4" />
          </button>
        </div>

        {statuses.length > 1 ? (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <Chip active={!status} onClick={() => setStatus(null)}>
              Any status
            </Chip>
            {statuses.map(([st, n]) => (
              <Chip key={st} active={status === st} onClick={() => setStatus(status === st ? null : st)}>
                {pretty(st)} <b>{n}</b>
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-40 rounded-3xl" />
            ))}
          </div>
        ) : (
          <EmptyHistory searching={searching} />
        )
      ) : (
        <div className={cn("space-y-4 transition-opacity", loading && data.page === 1 && "opacity-60")}>
          {groups.map(([label, dayItems], gi) => {
            const net = dayItems.reduce((a, it) => a + (it.amount ?? 0), 0);
            return (
              <section key={label} className="anim-fade-up" style={{ "--d": `${Math.min(gi, 6) * 50}ms` } as React.CSSProperties}>
                <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground">
                  <span className="uppercase tracking-wider">
                    {label} <span className="font-normal normal-case tracking-normal opacity-70">· {dayItems.length}</span>
                  </span>
                  {net !== 0 ? (
                    <span className={cn("font-display tabular-nums", net > 0 ? "text-success" : "text-foreground/80")}>{signed(net)}</span>
                  ) : null}
                </h2>
                <Surface className="p-1.5">
                  <ul>
                    {dayItems.map((it) => (
                      <li key={`${it.kind}-${it.id}`}>
                        <Row
                          it={it}
                          onOpen={() => {
                            tap();
                            setDetail(it);
                            setDetailOpen(true);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </Surface>
              </section>
            );
          })}

          <div ref={sentinel} />
          {data.hasMore ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => load(data.page + 1, filter, query)}
              className="tap mx-auto flex h-11 items-center gap-2 rounded-2xl bg-muted/70 px-5 text-sm font-semibold"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null} {loading ? "Loading…" : "Load more"}
            </button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              {status ? `${items.length} of ${data.items.length} loaded` : `That's everything · ${items.length} ${items.length === 1 ? "entry" : "entries"}`}
            </p>
          )}
        </div>
      )}

      {/* `detail` stays set after closing so the sheet keeps its content while sliding out. */}
      <BottomSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail?.title ?? "Activity"}
        subtitle={detail ? formatDate(detail.createdAt, true) : undefined}
        icon={detail ? <IconTile icon={look(detail).icon} tone={look(detail).tone} /> : null}
      >
        {detail ? <Receipt it={detail} /> : null}
      </BottomSheet>
    </div>
  );
}

/** Dark statement hero: all-time in/out and a 14-day paired bar chart. */
function StatementCard({ s }: { s: ActivitySummary }) {
  const [pick, setPick] = useState<number | null>(null);
  const max = Math.max(1, ...s.days.map((d) => Math.max(d.in, d.out)));
  const quiet = s.days.every((d) => !d.in && !d.out);
  const day = pick != null ? s.days[pick] : null;
  const short = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <section className="hero-card p-5 [--hero-a:#10b981] [--hero-b:#8b5cf6] sm:p-6">
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          <ReceiptText className="size-3.5" /> Statement
        </p>
        <p className="text-[11px] text-white/55">
          {s.orders} {s.orders === 1 ? "order" : "orders"} · {s.deposits} {s.deposits === 1 ? "deposit" : "deposits"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-white/60">
            <span className="size-2 rounded-full" style={{ background: IN_COLOR }} /> Money in
          </p>
          <p className="mt-1 truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <CountUp value={s.deposited} storageKey="history-in" money />
          </p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-white/60">
            <span className="size-2 rounded-full" style={{ background: OUT_COLOR }} /> Money out
          </p>
          <p className="mt-1 truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <CountUp value={s.spent} storageKey="history-out" money />
          </p>
        </div>
      </div>

      {/* 14-day chart: one hit column per day, tap/hover to read it */}
      <div className="mt-5">
        <div className="relative h-20" onPointerLeave={(e) => e.pointerType === "mouse" && setPick(null)}>
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-white/15" />
          {quiet ? (
            <p className="absolute inset-0 grid place-items-center text-xs text-white/50">No money moved in the last 14 days</p>
          ) : (
            <div className="absolute inset-0 grid grid-cols-[repeat(14,minmax(0,1fr))]">
              {s.days.map((d, i) => (
                <button
                  key={d.date}
                  type="button"
                  aria-label={`${short(d.date)}: in ${formatMoney(d.in)}, out ${formatMoney(d.out)}`}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setPick(i)}
                  onClick={() => {
                    tap();
                    setPick(pick === i ? null : i);
                  }}
                  className={cn("flex h-full items-end justify-center gap-[2px] rounded-md px-[3px] transition-colors", pick === i && "bg-white/[0.07]")}
                >
                  <Bar value={d.in} max={max} color={IN_COLOR} dim={pick != null && pick !== i} />
                  <Bar value={d.out} max={max} color={OUT_COLOR} dim={pick != null && pick !== i} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 flex h-4 items-center justify-between text-[10.5px] text-white/55">
          {day ? (
            <p className="anim-pop-in flex w-full items-center justify-between gap-2">
              <span className="font-semibold text-white/80">{short(day.date)}</span>
              <span className="tabular-nums">
                In <b className="text-white">{formatMoney(day.in)}</b> · Out <b className="text-white">{formatMoney(day.out)}</b>
              </span>
            </p>
          ) : (
            <>
              <span>{short(s.days[0].date)}</span>
              <span>Last 14 days · tap a day</span>
              <span>Today</span>
            </>
          )}
        </div>
      </div>

      <table className="sr-only">
        <caption>Money in and out over the last 14 days</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>In</th>
            <th>Out</th>
          </tr>
        </thead>
        <tbody>
          {s.days.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{formatMoney(d.in)}</td>
              <td>{formatMoney(d.out)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Bar({ value, max, color, dim }: { value: number; max: number; color: string; dim: boolean }) {
  // Non-zero days get at least a visible nub.
  const h = value > 0 ? Math.max(6, (value / max) * 100) : 0;
  return (
    <span
      className="w-full max-w-2 rounded-t-[4px] transition-[height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ height: `${h}%`, background: color, opacity: dim ? 0.35 : 1 }}
    />
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", STATUS_TONE[status] ?? "bg-muted text-muted-foreground")}>
      {pretty(status)}
    </span>
  );
}

function Row({ it, onOpen }: { it: ActivityItem; onOpen: () => void }) {
  const { icon, tone } = look(it);
  const muted = it.status === "FAILED" || it.status === "REJECTED" || it.status === "EXPIRED" || it.status === "CANCELLED";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="tap flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
    >
      <IconTile icon={icon} tone={tone} className="size-10 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{it.title}</span>
          {it.kind !== "wallet" && !["COMPLETED", "PAID", "FULFILLED"].includes(it.status) ? <StatusPill status={it.status} /> : null}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {it.subtitle} · {timeOf(it.createdAt)}
        </span>
      </span>
      {it.amount != null ? (
        <span
          className={cn(
            "shrink-0 font-display text-sm font-bold tabular-nums",
            muted ? "text-muted-foreground line-through decoration-1" : it.amount > 0 ? "text-success" : "text-foreground",
          )}
        >
          {signed(it.amount)}
        </span>
      ) : null}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
    </button>
  );
}

function Receipt({ it }: { it: ActivityItem }) {
  const [copied, setCopied] = useState<string | null>(null);
  const link = linkFor(it);
  // Status already shows as the pill up top.
  const rows = it.details.filter((d) => d.label !== "Status");

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      feedbackTap({ impact: "success", silent: true });
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1200);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-muted/40">
        <div className="px-5 pb-5 pt-6 text-center">
          {it.amount != null ? (
            <p className={cn("font-display text-4xl font-bold tracking-tight tabular-nums", it.amount > 0 && "text-success")}>
              {signed(it.amount)}
            </p>
          ) : null}
          <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <StatusPill status={it.status} />
            <span className="truncate">{it.subtitle}</span>
          </p>
        </div>
        {/* perforation */}
        <div aria-hidden className="relative h-4">
          <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-card" />
          <span className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-card" />
          <span className="absolute inset-x-4 top-1/2 border-t border-dashed border-white/15" />
        </div>
        <dl className="divide-y divide-white/[0.05] px-4 pb-1 text-sm">
          {rows.map((d, i) => {
            const isId = /\bid\b|reference/i.test(d.label);
            return (
              <div key={i} className="flex items-start justify-between gap-3 py-3">
                <dt className="shrink-0 text-muted-foreground">{d.label}</dt>
                <dd className="flex min-w-0 items-start gap-1.5 text-right font-medium">
                  <span className={cn("break-all", isId && "font-mono text-[12.5px]")}>{d.value}</span>
                  {isId ? (
                    <button
                      type="button"
                      aria-label={`Copy ${d.label}`}
                      onClick={() => copy(d.label, d.value)}
                      className={cn("tap mt-0.5 shrink-0", copied === d.label ? "text-success" : "text-muted-foreground hover:text-foreground")}
                    >
                      {copied === d.label ? <Check className="anim-pop-in size-3.5" strokeWidth={3} /> : <Copy className="size-3.5" />}
                    </button>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
      {link ? (
        <Link href={link.href} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-muted/70 text-sm font-semibold">
          <ReceiptText className="size-4" /> {link.label}
        </Link>
      ) : null}
    </div>
  );
}

function EmptyHistory({ searching }: { searching: boolean }) {
  return (
    <Surface className="flex flex-col items-center px-6 py-14 text-center">
      <span className="anim-float grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-inset ring-primary/25">
        <History className="size-7" />
      </span>
      <p className="mt-4 font-display text-lg font-bold">{searching ? "No matching activity" : "Nothing here yet"}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {searching ? "Try another word, ID or status." : "Orders, deposits and wallet changes show up here as they happen."}
      </p>
      {!searching ? (
        <Link href="/app/deposit" className="tap bg-brand-gradient mt-5 rounded-2xl px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
          Add money
        </Link>
      ) : null}
    </Surface>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => {
        tap();
        onClick();
      }}
      className={cn(
        "tap flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors [&_b]:text-[11px] [&_b]:font-bold [&_b]:opacity-70",
        active ? "border-primary bg-primary text-primary-foreground" : "border-white/[0.06] bg-card/80 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
