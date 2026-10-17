"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  LayoutGrid,
  Loader2,
  Package,
  ReceiptText,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { IconTile, Surface } from "@/components/app-kit";
import { BottomSheet } from "@/components/app-kit-client";
import { formatDate } from "@/components/app-ui";
import { formatMoney } from "@/lib/currencies";
import { feedbackTap } from "@/lib/feedback";
import type { UserKeyRow, UserKeysPage } from "@/lib/orders";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const PAGE = 100;
type View = "recent" | "products";
const VIEWS: { id: View; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "products", label: "By product" },
];

function mask(code: string) {
  return code.length <= 8
    ? "•".repeat(code.length)
    : `${code.slice(0, 4)}${"•".repeat(Math.min(14, code.length - 8))}${code.slice(-4)}`;
}

function save(name: string, text: string, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function copyText(text: string, msg: string) {
  try {
    await navigator.clipboard.writeText(text);
    feedbackTap({ impact: "success", silent: true });
    toast.success(msg);
    return true;
  } catch {
    toast.error("Copy failed");
    return false;
  }
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
const tap = () => feedbackTap({ impact: "selection", silent: true });
const utcDay = (iso: string) => iso.slice(0, 10);
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
// "New" badge window: keys bought in the last 2 hours.
const isFresh = (iso: string) => Date.now() - new Date(iso).getTime() < 2 * 3_600_000;

function dayLabel(iso: string) {
  const key = utcDay(new Date(iso).toISOString());
  if (key === utcDay(new Date().toISOString())) return "Today";
  if (key === utcDay(new Date(Date.now() - 86_400_000).toISOString())) return "Yesterday";
  return formatDate(iso);
}

function byDay(keys: UserKeyRow[]) {
  const map = new Map<string, UserKeyRow[]>();
  for (const k of keys) {
    const label = dayLabel(k.createdAt);
    map.set(label, [...(map.get(label) ?? []), k]);
  }
  return [...map.entries()];
}

function totals(keys: UserKeyRow[]) {
  const t = new Map<string, number>();
  for (const k of keys) t.set(k.currency, (t.get(k.currency) ?? 0) + k.unitPrice);
  return [...t.entries()];
}

const money = (spent: [string, number][]) =>
  spent.length ? spent.map(([c, v]) => formatMoney(v, c as UserKeyRow["currency"])).join(" · ") : "—";

type ProductSummary = { name: string; n: number; image: string | null; last: string };

export function KeysClient({ initial }: { initial: UserKeysPage }) {
  const [data, setData] = useState(initial);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("recent");
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [product, setProduct] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserKeyRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const first = useRef(true);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (page: number, q: string) => {
    busy.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE) });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/keys?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      const next: UserKeysPage = json.data;
      setData((prev) => (page === 1 ? next : { ...next, keys: [...prev.keys, ...next.keys] }));
      if (page === 1) setProduct(null);
    } catch {
      toast.error("Could not load keys.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    // initial server page is small; fetch a bigger first page right away
    if (isFirst && !initial.hasMore) return;
    const t = setTimeout(() => load(1, query), isFirst ? 0 : 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Live update: the server re-rendered with newer data; re-pull what's on screen.
  const seen = useRef(initial);
  useEffect(() => {
    if (seen.current === initial) return;
    seen.current = initial;
    if (!busy.current) void load(1, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // Infinite scroll: pull the next page as the end of the list nears.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !data.hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !busy.current) load(data.page + 1, query);
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [data.hasMore, data.page, query, load, view, product]);

  const products = useMemo<ProductSummary[]>(() => {
    const m = new Map<string, ProductSummary>();
    for (const k of data.keys) {
      const cur = m.get(k.productTitle);
      m.set(k.productTitle, {
        name: k.productTitle,
        n: (cur?.n ?? 0) + 1,
        image: cur?.image ?? k.productImage,
        last: cur && cur.last > k.createdAt ? cur.last : k.createdAt,
      });
    }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [data.keys]);

  const visible = useMemo(
    () => (product ? data.keys.filter((k) => k.productTitle === product) : data.keys),
    [data.keys, product],
  );
  const days = useMemo(() => byDay(visible), [visible]);
  const spent = useMemo(() => totals(data.keys), [data.keys]);
  const current = product ? products.find((p) => p.name === product) : undefined;

  const flip = (set: Set<string>, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  };

  const withCode = visible.filter((k) => k.code);
  const selected = data.keys.filter((k) => picked.has(k.id) && k.code);
  const line = (k: UserKeyRow) => `${k.productTitle} — ${k.durationLabel}\n${k.code}`;
  const allShown = withCode.length > 0 && withCode.every((k) => shown.has(k.id));
  // The product grid replaces the list until a product is opened.
  const grid = view === "products" && !product;

  function copyOne(k: UserKeyRow) {
    if (!k.code) return;
    copyText(k.code, "Key copied");
    setCopied(k.id);
    setTimeout(() => setCopied((c) => (c === k.id ? null : c)), 1200);
  }

  function exportCsv(rows: UserKeyRow[]) {
    const head = "Product,Duration,Key,Price,Currency,Date,Android ID";
    const body = rows.map((k) =>
      [k.productTitle, k.durationLabel, k.code ?? "", String(k.unitPrice), k.currency, k.createdAt, k.androidId ?? ""]
        .map(csvCell)
        .join(","),
    );
    save("my-keys.csv", [head, ...body].join("\n"), "text/csv");
  }

  function stopSelecting() {
    setSelecting(false);
    setPicked(new Set());
  }

  function openProduct(name: string | null) {
    tap();
    setProduct(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Export acts on the selection when there is one, otherwise on everything in view.
  const exportRows = selected.length ? selected : withCode;
  const viewIndex = VIEWS.findIndex((v) => v.id === view);

  return (
    <div className={cn("space-y-5", selecting && "pb-28 lg:pb-20")}>
      <VaultCard total={data.total} products={products.length} spent={spent} />

      {/* Toolbar: sticks under the mobile app bar */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 space-y-2.5 bg-background/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div role="tablist" aria-label="Key view" className="relative grid grid-cols-2 rounded-2xl border border-white/[0.06] bg-card/80 p-1">
          <span
            aria-hidden
            className="bg-brand-gradient absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-xl shadow-lg shadow-primary/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${viewIndex * 100}%)` }}
          />
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => {
                tap();
                setView(v.id);
                setProduct(null);
              }}
              className={cn(
                "relative flex h-9 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition-colors",
                view === v.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.id === "recent" ? <KeyRound className="size-3.5" /> : <LayoutGrid className="size-3.5" />}
              {v.label}
              <span className="text-[11px] font-bold opacity-70">{v.id === "recent" ? data.keys.length : products.length}</span>
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
              placeholder="Search product, duration or key…"
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
          {!grid ? (
            <>
              <ToolButton
                label={allShown ? "Hide all" : "Reveal all"}
                onClick={() => setShown(allShown ? new Set() : new Set(withCode.map((k) => k.id)))}
                disabled={!withCode.length}
              >
                {allShown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </ToolButton>
              <ToolButton
                label={selecting ? "Done selecting" : "Select"}
                active={selecting}
                onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
                disabled={!withCode.length}
              >
                <CheckSquare className="size-4" />
              </ToolButton>
            </>
          ) : null}
          <ToolButton label="Export" onClick={() => setExportOpen(true)} disabled={!withCode.length}>
            <Download className="size-4" />
          </ToolButton>
        </div>

        {view === "recent" && products.length > 1 ? (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <Chip active={!product} onClick={() => setProduct(null)}>
              All <b>{data.keys.length}</b>
            </Chip>
            {products.map((p) => (
              <Chip key={p.name} active={product === p.name} onClick={() => setProduct(product === p.name ? null : p.name)} image={p.image}>
                {p.name} <b>{p.n}</b>
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      {/* List */}
      {data.keys.length === 0 ? (
        loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-36 rounded-3xl" />
            ))}
          </div>
        ) : (
          <EmptyVault searching={Boolean(query)} />
        )
      ) : (
        <div className={cn("space-y-5 transition-opacity", loading && data.page === 1 && "opacity-60")}>
          {grid ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {products.map((p, i) => (
                <li key={p.name} className="anim-fade-up" style={{ "--d": `${Math.min(i, 8) * 40}ms` } as React.CSSProperties}>
                  <ProductTile p={p} onOpen={() => openProduct(p.name)} />
                </li>
              ))}
            </ul>
          ) : (
            <>
              {view === "products" && current ? (
                <ProductBanner
                  p={current}
                  spent={money(totals(visible))}
                  onBack={() => openProduct(null)}
                  onCopyAll={() => copyText(withCode.map((k) => k.code).join("\n"), `${withCode.length} keys copied`)}
                  canCopy={withCode.length > 0}
                />
              ) : null}

              {days.map(([label, keys], gi) => {
                const ids = keys.filter((k) => k.code).map((k) => k.id);
                const allPicked = ids.length > 0 && ids.every((id) => picked.has(id));
                return (
                  <section key={label} className="anim-fade-up" style={{ "--d": `${Math.min(gi, 6) * 50}ms` } as React.CSSProperties}>
                    <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground">
                      <span className="uppercase tracking-wider">
                        {label} <span className="font-normal normal-case tracking-normal opacity-70">· {keys.length}</span>
                      </span>
                      {selecting && ids.length ? (
                        <button
                          type="button"
                          onClick={() => {
                            tap();
                            setPicked((p) => {
                              const n = new Set(p);
                              ids.forEach((id) => (allPicked ? n.delete(id) : n.add(id)));
                              return n;
                            });
                          }}
                          className="tap font-semibold text-primary"
                        >
                          {allPicked ? "Unselect day" : "Select day"}
                        </button>
                      ) : null}
                    </h2>
                    <ul className="space-y-3">
                      {keys.map((k) => (
                        <KeyTicket
                          key={k.id}
                          k={k}
                          compact={Boolean(product)}
                          shown={shown.has(k.id)}
                          copied={copied === k.id}
                          selecting={selecting}
                          picked={picked.has(k.id)}
                          onPick={() => {
                            tap();
                            setPicked((p) => flip(p, k.id));
                          }}
                          onToggle={() => {
                            tap();
                            setShown((s) => flip(s, k.id));
                          }}
                          onCopy={() => copyOne(k)}
                          onOpen={() => {
                            tap();
                            setDetail(k);
                            setDetailOpen(true);
                          }}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </>
          )}

          <div ref={sentinel} />
          {data.hasMore ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => load(data.page + 1, query)}
              className="tap mx-auto flex h-11 items-center gap-2 rounded-2xl bg-muted/70 px-5 text-sm font-semibold"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null} {loading ? "Loading…" : "Load more"}
            </button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              {data.total === 1 ? "That's your only key" : `That's everything · ${data.total} keys`}
            </p>
          )}
        </div>
      )}

      {/* Selection bar */}
      {selecting ? (
        <div className="anim-sheet-up fixed inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-[51] flex items-center gap-2 rounded-3xl border border-white/10 bg-card/95 p-2 pl-4 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.7)] backdrop-blur-xl lg:bottom-6 lg:left-auto lg:right-6 lg:w-[30rem]">
          <span className="min-w-0 flex-1 text-sm font-semibold">
            {selected.length ? `${selected.length} selected` : "Tap keys to select"}
          </span>
          <button
            type="button"
            onClick={() => setPicked(selected.length === withCode.length ? new Set() : new Set(withCode.map((k) => k.id)))}
            className="tap h-10 rounded-2xl px-3 text-xs font-semibold text-primary"
          >
            {selected.length === withCode.length ? "None" : "All"}
          </button>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => copyText(selected.map((k) => k.code).join("\n"), `${selected.length} keys copied`)}
            className="tap bg-brand-gradient flex h-10 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            <Copy className="size-4" /> Copy
          </button>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => setExportOpen(true)}
            aria-label="Export selected"
            className="tap grid size-10 place-items-center rounded-2xl bg-muted disabled:opacity-40"
          >
            <Download className="size-4" />
          </button>
          <button
            type="button"
            onClick={stopSelecting}
            aria-label="Stop selecting"
            className="tap grid size-10 place-items-center rounded-2xl text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <BottomSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={`Export ${exportRows.length} ${exportRows.length === 1 ? "key" : "keys"}`}
        subtitle={selected.length ? "Your selected keys" : product ? `All ${product} keys` : "Every key in view"}
        icon={<IconTile icon={Download} tone="primary" className="size-11" />}
      >
        <div className="space-y-2 pb-1">
          <SheetAction
            icon={Copy}
            title="Copy to clipboard"
            hint="One key per line"
            onClick={() => {
              copyText(exportRows.map((k) => k.code).join("\n"), `${exportRows.length} keys copied`);
              setExportOpen(false);
            }}
          />
          <SheetAction
            icon={Download}
            title="Download .txt"
            hint="Product, duration and key"
            onClick={() => {
              save("my-keys.txt", exportRows.map(line).join("\n\n"));
              setExportOpen(false);
            }}
          />
          <SheetAction
            icon={FileSpreadsheet}
            title="Download .csv"
            hint="Opens in Excel / Sheets"
            onClick={() => {
              exportCsv(exportRows);
              setExportOpen(false);
            }}
          />
        </div>
      </BottomSheet>

      {/* `detail` stays set after closing so the sheet keeps its content while sliding out. */}
      <BottomSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail?.productTitle ?? "Key"}
        subtitle={detail ? `${detail.durationLabel} · ${formatDate(detail.createdAt)}` : undefined}
        icon={<ProductThumb image={detail?.productImage ?? null} />}
      >
        {detail ? <KeyDetail k={detail} copied={copied === detail.id} onCopy={() => copyOne(detail)} /> : null}
      </BottomSheet>
    </div>
  );
}

/** Dark vault hero, same family as the wallet card. */
function VaultCard({ total, products, spent }: { total: number; products: number; spent: [string, number][] }) {
  return (
    <section className="hero-card p-5 [--hero-a:#f59e0b] sm:p-6">
      <div aria-hidden className="absolute -right-10 -top-10 -z-10 size-48 rounded-full border-[18px] border-amber-200/[0.06]" />
      <div aria-hidden className="absolute -right-2 top-6 -z-10 size-32 rounded-full border-[10px] border-dashed border-amber-200/[0.08]" />
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />

      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
        <ShieldCheck className="size-3.5" /> Key vault
      </div>
      <p className="mt-2 font-display text-5xl font-bold tabular-nums tracking-tight">
        {total.toLocaleString("en-US")}
        <span className="ml-2 text-base font-semibold text-white/60">{total === 1 ? "key" : "keys"}</span>
      </p>
      <div className="mt-5 flex gap-6">
        <div>
          <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-white/55">
            <Package className="size-3" /> Products
          </p>
          <p className="mt-0.5 font-display text-lg font-bold">{products}</p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-white/55">
            <Wallet className="size-3" /> Spent
          </p>
          <p className="mt-0.5 truncate font-display text-lg font-bold">
            {money(spent)}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * One key as a tear-off ticket (same family as the order page): product stub on
 * top, perforation, then the gold license strip. Tap the strip to copy.
 */
function KeyTicket({
  k,
  compact,
  shown,
  copied,
  selecting,
  picked,
  onPick,
  onToggle,
  onCopy,
  onOpen,
}: {
  k: UserKeyRow;
  compact: boolean;
  shown: boolean;
  copied: boolean;
  selecting: boolean;
  picked: boolean;
  onPick: () => void;
  onToggle: () => void;
  onCopy: () => void;
  onOpen: () => void;
}) {
  const fresh = isFresh(k.createdAt);
  const pickable = selecting && Boolean(k.code);
  const meta = (
    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
      <span className="rounded-full bg-amber-300/15 px-2 py-0.5 font-semibold text-amber-200">{k.durationLabel}</span>
      <span className="tabular-nums">{compact ? formatDate(k.createdAt) : timeOf(k.createdAt)}</span>
      {k.androidId ? (
        <span className="inline-flex min-w-0 items-center gap-1">
          <Smartphone className="size-3 shrink-0" /> <span className="max-w-[7rem] truncate font-mono">{k.androidId}</span>
        </span>
      ) : null}
    </span>
  );

  return (
    <li
      role={pickable ? "checkbox" : undefined}
      aria-checked={pickable ? picked : undefined}
      tabIndex={pickable ? 0 : undefined}
      onClick={pickable ? onPick : undefined}
      onKeyDown={pickable ? (e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), onPick()) : undefined}
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-card/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-[border-color,background-color,opacity]",
        picked ? "border-primary/60 bg-primary/[0.07]" : "border-white/[0.06]",
        selecting && !k.code && "opacity-50",
        pickable && "tap cursor-pointer",
      )}
    >
      {/* stub */}
      {selecting ? (
        <div className="flex items-center gap-3 p-3.5 pb-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl border-2 transition-colors",
              picked ? "border-primary bg-primary text-primary-foreground" : "border-white/15 text-transparent",
            )}
          >
            <Check className={cn("size-5", picked && "anim-pop-in")} strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold leading-tight">{k.productTitle}</span>
            {meta}
          </span>
        </div>
      ) : (
        <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 p-3.5 pb-3 text-left" aria-label={`${k.productTitle} key details`}>
          {compact ? null : <ProductThumb image={k.productImage} className="size-10 rounded-xl" />}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold leading-tight">{compact ? k.durationLabel : k.productTitle}</span>
              {fresh ? (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                  <Sparkles className="size-2.5" /> New
                </span>
              ) : null}
            </span>
            {meta}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="font-display text-sm font-bold tabular-nums">{formatMoney(k.unitPrice, k.currency)}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </span>
        </button>
      )}

      {/* perforation */}
      <div aria-hidden className="relative mx-3.5 border-t border-dashed border-white/10">
        <span className="absolute -left-[1.5rem] -top-2.5 size-5 rounded-full bg-background" />
        <span className="absolute -right-[1.5rem] -top-2.5 size-5 rounded-full bg-background" />
      </div>

      {/* license strip */}
      <div className={cn("p-3", selecting && "pointer-events-none")}>
        {k.code ? (
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={onCopy}
              tabIndex={selecting ? -1 : undefined}
              aria-label={`Copy key for ${k.productTitle}`}
              className={cn(
                "tap flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors",
                copied
                  ? "border-success/40 bg-success/10"
                  : "border-amber-300/25 bg-gradient-to-br from-amber-300/15 via-amber-300/5 to-transparent",
              )}
            >
              <KeyRound className="size-4 shrink-0 text-amber-300" />
              <span
                key={String(shown)}
                className={cn(
                  "min-w-0 flex-1 truncate font-mono text-[14px] font-semibold",
                  shown ? "anim-pop-in text-foreground" : "tracking-wider text-foreground/70",
                )}
              >
                {shown ? k.code : mask(k.code)}
              </span>
              <span className={cn("flex shrink-0 items-center gap-1 text-[11px] font-semibold", copied ? "text-success" : "text-primary")}>
                {copied ? <Check className="anim-pop-in size-3.5" strokeWidth={3} /> : <Copy className="size-3.5" />}
                <span className="hidden min-[380px]:inline">{copied ? "Copied" : "Copy"}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={onToggle}
              tabIndex={selecting ? -1 : undefined}
              aria-label={shown ? "Hide key" : "Reveal key"}
              aria-pressed={shown}
              className="tap grid w-11 shrink-0 place-items-center rounded-2xl bg-muted/70 text-foreground/80"
            >
              {shown ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl bg-warning/10 px-3.5 py-3 text-sm font-medium text-warning">
            <Loader2 className="size-4 animate-spin" /> Key is being prepared…
          </p>
        )}
      </div>
    </li>
  );
}

/** Product "folder" in the By-product grid. */
function ProductTile({ p, onOpen }: { p: ProductSummary; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="tap group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/[0.06] bg-card/80 p-2 text-left shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-colors hover:border-amber-300/25"
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className="grid size-full place-items-center bg-gradient-to-br from-amber-400/30 to-amber-400/5 text-amber-300">
            <KeyRound className="size-8" />
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
          <KeyRound className="size-3 text-amber-300" /> {p.n}
        </span>
      </span>
      <span className="block px-1.5 pb-1 pt-2.5">
        <span className="block truncate text-sm font-semibold">{p.name}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">Last · {dayLabel(p.last)}</span>
      </span>
    </button>
  );
}

/** Header for an opened product: back, identity, copy all. */
function ProductBanner({
  p,
  spent,
  canCopy,
  onBack,
  onCopyAll,
}: {
  p: ProductSummary;
  spent: string;
  canCopy: boolean;
  onBack: () => void;
  onCopyAll: () => void;
}) {
  return (
    <Surface className="anim-fade-up flex items-center gap-3 p-3">
      <button type="button" onClick={onBack} aria-label="All products" className="tap grid size-9 shrink-0 place-items-center rounded-xl bg-muted/70">
        <ArrowLeft className="size-4" />
      </button>
      <ProductThumb image={p.image} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display font-bold">{p.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {p.n} {p.n === 1 ? "key" : "keys"} · {spent}
        </span>
      </span>
      <button
        type="button"
        disabled={!canCopy}
        onClick={onCopyAll}
        className="tap flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-muted/70 px-3 text-xs font-semibold disabled:opacity-40"
      >
        <Copy className="size-3.5" /> All
      </button>
    </Surface>
  );
}

function KeyDetail({ k, copied, onCopy }: { k: UserKeyRow; copied: boolean; onCopy: () => void }) {
  return (
    <div className="space-y-4 pb-2">
      {k.code ? (
        <button
          type="button"
          onClick={onCopy}
          className="tap relative block w-full overflow-hidden rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-300/15 via-amber-300/5 to-transparent p-5 text-left"
        >
          <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/80">
            License key
            <span className={cn("flex items-center gap-1 normal-case tracking-normal", copied ? "text-success" : "text-primary")}>
              {copied ? <Check className="size-3.5" strokeWidth={3} /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Tap to copy"}
            </span>
          </span>
          <span className="anim-pop-in mt-3 block break-all font-mono text-lg font-semibold leading-relaxed">{k.code}</span>
        </button>
      ) : (
        <p className="rounded-2xl bg-warning/10 p-4 text-sm text-warning">This key is still being delivered.</p>
      )}
      <dl className="divide-y divide-white/[0.05] rounded-2xl bg-muted/40 px-4 text-sm">
        <DetailRow k="Price" v={formatMoney(k.unitPrice, k.currency)} />
        <DetailRow k="Purchased" v={formatDate(k.createdAt, true)} />
        {k.androidId ? <DetailRow k="Device ID" v={<span className="font-mono">{k.androidId}</span>} /> : null}
      </dl>
      <Link
        href={`/app/order/${k.orderId}`}
        className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-muted/70 text-sm font-semibold"
      >
        <ReceiptText className="size-4" /> View order
      </Link>
    </div>
  );
}

function DetailRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate text-right font-medium">{v}</dd>
    </div>
  );
}

function ProductThumb({ image, className }: { image: string | null; className?: string }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className={cn("size-11 shrink-0 rounded-2xl bg-muted object-cover ring-1 ring-white/10", className)} />
  ) : (
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-400/5 text-amber-300 ring-1 ring-inset ring-amber-300/25", className)}>
      <KeyRound className="size-5" />
    </span>
  );
}

function EmptyVault({ searching }: { searching: boolean }) {
  return (
    <Surface className="flex flex-col items-center px-6 py-14 text-center">
      <span className="anim-float grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-amber-400/30 to-amber-400/5 text-amber-300 ring-1 ring-inset ring-amber-300/25">
        <KeyRound className="size-7" />
      </span>
      <p className="mt-4 font-display text-lg font-bold">{searching ? "No keys match your search" : "Your vault is empty"}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {searching ? "Try a product name, duration or part of the key." : "Keys land here the moment an order is delivered."}
      </p>
      {!searching ? (
        <Link href="/app" className="tap bg-brand-gradient mt-5 rounded-2xl px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
          Browse products
        </Link>
      ) : null}
    </Surface>
  );
}

function ToolButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        tap();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "tap grid size-11 shrink-0 place-items-center rounded-2xl border transition-colors disabled:opacity-40",
        active ? "border-primary bg-primary text-primary-foreground" : "border-white/[0.06] bg-card/80 text-foreground/85 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SheetAction({ icon: Icon, title, hint, onClick }: { icon: typeof Copy; title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex w-full items-center gap-3 rounded-2xl border border-white/[0.05] bg-muted/40 p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/70"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  );
}

function Chip({
  active,
  subtle,
  image,
  onClick,
  children,
}: {
  active: boolean;
  subtle?: boolean;
  image?: string | null;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        tap();
        onClick();
      }}
      className={cn(
        "tap flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors [&_b]:text-[11px] [&_b]:font-bold [&_b]:opacity-70",
        image && "pl-1",
        active
          ? subtle
            ? "border-white/20 bg-white/10 text-foreground"
            : "border-primary bg-primary text-primary-foreground"
          : "border-white/[0.06] bg-card/80 text-muted-foreground hover:text-foreground",
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-6 rounded-full object-cover" />
      ) : null}
      {children}
    </button>
  );
}
