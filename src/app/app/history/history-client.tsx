"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Copy, Download, ExternalLink, History, Loader2, Receipt, Search, Wallet, X } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ActivityFilter, ActivityItem, ActivityKind } from "@/types/history";

type Page = { items: ActivityItem[]; page: number; limit: number; hasMore: boolean };

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "order", label: "Orders" },
  { id: "deposit", label: "Deposits" },
  { id: "wallet", label: "Wallet" },
];

const KIND_ICON: Record<ActivityKind, typeof Receipt> = { order: Receipt, deposit: Wallet, wallet: History };
const KIND_TONE: Record<ActivityKind, string> = {
  order: "bg-primary/10 text-primary",
  deposit: "bg-success/15 text-success",
  wallet: "bg-muted text-muted-foreground",
};
const PAGE_SIZE = 50;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const key = (x: Date) => x.toISOString().slice(0, 10);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (key(d) === key(today)) return "Today";
  if (key(d) === key(yesterday)) return "Yesterday";
  return formatDate(iso);
}

export function HistoryClient({ initial }: { initial: Page }) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Page>(initial);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<ActivityItem | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const first = useRef(true);

  const load = useCallback(async (page: number, f: ActivityFilter, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), filter: f });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/history?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) return;
      const next: Page = json.data;
      setData((prev) => (page === 1 ? next : { ...next, items: [...prev.items, ...next.items] }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch from page 1 when filter or (debounced) search changes.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus(null);
    const t = setTimeout(() => load(1, filter, query), 300);
    return () => clearTimeout(t);
  }, [filter, query, load]);

  const statuses = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of data.items) m.set(it.status, (m.get(it.status) ?? 0) + 1);
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

  const totals = useMemo(() => {
    let inn = 0;
    let out = 0;
    for (const it of items) {
      if (it.amount == null) continue;
      if (it.amount >= 0) inn += it.amount;
      else out += -it.amount;
    }
    return { inn, out };
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
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowDownLeft className="size-3.5 text-success" /> Money in
          </p>
          <p className="mt-1 font-display text-xl font-bold text-success">{formatMoney(totals.inn)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpRight className="size-3.5" /> Money out
          </p>
          <p className="mt-1 font-display text-xl font-bold">{formatMoney(totals.out)}</p>
        </div>
      </div>

      <div className="sticky top-0 z-10 space-y-3 rounded-xl border bg-background/95 p-3 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                filter === f.id ? "border-transparent bg-brand-gradient text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search history…" className="pl-9 pr-9" />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <Button variant="secondary" size="icon" onClick={exportCsv} disabled={!items.length} aria-label="Export CSV" title="Export loaded rows as CSV">
            <Download />
          </Button>
        </div>
      </div>
      {statuses.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          <button
            onClick={() => setStatus(null)}
            className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", !status ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}
          >
            Any status
          </button>
          {statuses.map(([st, n]) => (
            <button
              key={st}
              onClick={() => setStatus(status === st ? null : st)}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", status === st ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}
            >
              {st.charAt(0) + st.slice(1).toLowerCase().replace(/_/g, " ")} <span className="opacity-70">{n}</span>
            </button>
          ))}
        </div>
      ) : null}
      </div>

      {items.length === 0 ? (
        loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <EmptyState icon={History} title={query || status ? "No matching activity" : "Nothing here yet"} hint="Orders, deposits and wallet changes will show up as they happen." />
        )
      ) : (
        <div className={cn("space-y-5", loading && "opacity-60")}>
          {groups.map(([label, dayItems]) => {
            const net = dayItems.reduce((a, it) => a + (it.amount ?? 0), 0);
            return (
            <section key={label}>
              <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{label} <span className="font-normal normal-case">· {dayItems.length}</span></span>
                {net !== 0 ? (
                  <span className={cn("font-medium normal-case", net > 0 && "text-success")}>
                    {net < 0 ? "−" : "+"}{formatMoney(Math.abs(net))}
                  </span>
                ) : null}
              </h2>
              <ul className="divide-y rounded-xl border bg-card">
                {dayItems.map((it) => {
                  const Icon = KIND_ICON[it.kind];
                  return (
                    <li key={`${it.kind}-${it.id}`}>
                      <button onClick={() => setOpen(it)} className="flex w-full items-center gap-3 p-3.5 text-left hover:bg-accent/40">
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", KIND_TONE[it.kind])}>
                          <Icon className="size-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{it.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{it.subtitle}</span>
                          <span className="block text-[11px] text-muted-foreground/70">{new Date(it.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          {it.amount != null ? (
                            <span className={cn("text-sm font-semibold", it.amount > 0 && "text-success")}>
                              {it.amount < 0 ? "−" : it.amount > 0 ? "+" : ""}
                              {formatMoney(Math.abs(it.amount))}
                            </span>
                          ) : null}
                          <StatusBadge status={it.status} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
            );
          })}
          <p className="text-center text-xs text-muted-foreground">{items.length} shown{status ? ` (of ${data.items.length} loaded)` : ""}</p>
          {data.hasMore ? (
            <div className="text-center">
              <Button variant="secondary" disabled={loading} onClick={() => load(data.page + 1, filter, query)}>
                {loading ? <Loader2 className="animate-spin" /> : null} Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          {open ? (
            <>
              <div>
                <DialogTitle>{open.title}</DialogTitle>
                <DialogDescription>{formatDate(open.createdAt, true)}</DialogDescription>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <StatusBadge status={open.status} />
                  </dd>
                </div>
                {open.amount != null ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Amount</dt>
                    <dd className="font-semibold">
                      {open.amount < 0 ? "−" : ""}
                      {formatMoney(Math.abs(open.amount))}
                    </dd>
                  </div>
                ) : null}
                {open.details.map((d, i) => (
                  <div key={i} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{d.label}</dt>
                    <dd className="flex items-start gap-1.5 break-all text-right font-medium">
                      {d.value}
                      {/id/i.test(d.label) ? (
                        <button
                          type="button"
                          aria-label={`Copy ${d.label}`}
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => navigator.clipboard.writeText(d.value).then(() => toast.success("Copied"), () => toast.error("Copy failed"))}
                        >
                          <Copy className="size-3.5" />
                        </button>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
              {open.kind === "order" ? (
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/order/${open.id.replace(/^order-/, "")}`}>
                    <ExternalLink /> View order
                  </Link>
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
