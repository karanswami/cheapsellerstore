"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Package,
  ReceiptText,
  Search,
  ShieldCheck,
  Smartphone,
  Square,
  Wallet,
  X,
} from "lucide-react";
import { IconTile, Surface } from "@/components/app-kit";
import { BottomSheet } from "@/components/app-kit-client";
import { formatDate } from "@/components/app-ui";
import { formatMoney } from "@/lib/currencies";
import { feedbackTap } from "@/lib/feedback";
import type { UserKeyRow, UserKeysPage } from "@/lib/orders";
import { cn } from "@/lib/utils";

const PAGE = 100;
type Sort = "new" | "old" | "name";
const SORTS: { id: Sort; label: string }[] = [
  { id: "new", label: "Newest" },
  { id: "old", label: "Oldest" },
  { id: "name", label: "A–Z" },
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

export function KeysClient({ initial }: { initial: UserKeysPage }) {
  const [data, setData] = useState(initial);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [product, setProduct] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("new");
  const [copied, setCopied] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserKeyRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const first = useRef(true);

  async function load(page: number, q: string) {
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
      setLoading(false);
    }
  }

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    // initial server page is small; fetch a bigger first page right away
    if (isFirst && !initial.hasMore) return;
    const t = setTimeout(() => load(1, query), isFirst ? 0 : 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const products = useMemo(() => {
    const m = new Map<string, { n: number; image: string | null }>();
    for (const k of data.keys) {
      const cur = m.get(k.productTitle);
      m.set(k.productTitle, { n: (cur?.n ?? 0) + 1, image: cur?.image ?? k.productImage });
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [data.keys]);

  const visible = useMemo(() => {
    const list = product ? data.keys.filter((k) => k.productTitle === product) : data.keys;
    const arr = [...list];
    if (sort === "old") arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else if (sort === "name") arr.sort((a, b) => a.productTitle.localeCompare(b.productTitle));
    return arr;
  }, [data.keys, product, sort]);

  const groups = useMemo(() => {
    const map = new Map<string, UserKeyRow[]>();
    for (const k of visible) map.set(k.productTitle, [...(map.get(k.productTitle) ?? []), k]);
    return [...map.entries()];
  }, [visible]);

  const spent = useMemo(() => {
    const t = new Map<string, number>();
    for (const k of data.keys) t.set(k.currency, (t.get(k.currency) ?? 0) + k.unitPrice);
    return [...t.entries()];
  }, [data.keys]);

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

  const toggleGroupPick = (keys: UserKeyRow[]) => {
    const ids = keys.filter((k) => k.code).map((k) => k.id);
    const all = ids.every((id) => picked.has(id));
    setPicked((p) => {
      const n = new Set(p);
      ids.forEach((id) => (all ? n.delete(id) : n.add(id)));
      return n;
    });
  };

  function stopSelecting() {
    setSelecting(false);
    setPicked(new Set());
  }

  // Export acts on the selection when there is one, otherwise on everything in view.
  const exportRows = selected.length ? selected : withCode;

  return (
    <div className={cn("space-y-5", selecting && "pb-28 lg:pb-20")}>
      <VaultCard total={data.total} products={products.length} spent={spent} />

      {/* Toolbar: sticks under the mobile app bar */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 space-y-3 bg-background/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search keys…"
              className="h-11 w-full rounded-2xl border border-white/[0.06] bg-card/80 pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 [&::-webkit-search-cancel-button]:hidden"
            />
            {loading ? (
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
          <ToolButton label="Export" onClick={() => setExportOpen(true)} disabled={!withCode.length}>
            <Download className="size-4" />
          </ToolButton>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {products.length > 1 ? (
            <>
              <Chip active={!product} onClick={() => setProduct(null)}>
                All <b>{data.keys.length}</b>
              </Chip>
              {products.map(([name, p]) => (
                <Chip key={name} active={product === name} onClick={() => setProduct(product === name ? null : name)} image={p.image}>
                  {name} <b>{p.n}</b>
                </Chip>
              ))}
              <span className="mx-1 w-px shrink-0 self-stretch bg-white/10" />
            </>
          ) : null}
          {SORTS.map((s) => (
            <Chip key={s.id} active={sort === s.id} subtle onClick={() => setSort(s.id)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* List */}
      {data.keys.length === 0 ? (
        loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-24 rounded-3xl" />
            ))}
          </div>
        ) : (
          <EmptyVault searching={Boolean(query)} />
        )
      ) : (
        <div className={cn("space-y-4 transition-opacity", loading && "opacity-60")}>
          {groups.map(([title, keys], gi) => {
            const open = !closed.has(title);
            const ids = keys.filter((k) => k.code).map((k) => k.id);
            const allPicked = ids.length > 0 && ids.every((id) => picked.has(id));
            const image = keys.find((k) => k.productImage)?.productImage ?? null;
            return (
              <Surface key={title} className="anim-fade-up" style={{ "--d": `${Math.min(gi, 6) * 50}ms` } as React.CSSProperties}>
                <div className="flex items-center gap-3 p-3 pr-2">
                  {selecting ? (
                    <PickBox checked={allPicked} disabled={!ids.length} onClick={() => toggleGroupPick(keys)} label={`Select all ${title}`} />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      tap();
                      setClosed((s) => flip(s, title));
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={open}
                  >
                    <ProductThumb image={image} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display font-bold">{title}</span>
                      <span className="text-xs text-muted-foreground">
                        {keys.length} {keys.length === 1 ? "key" : "keys"}
                      </span>
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", !open && "-rotate-90")} />
                  </button>
                  <button
                    type="button"
                    disabled={!ids.length}
                    onClick={() => copyText(keys.filter((k) => k.code).map((k) => k.code).join("\n"), `${ids.length} keys copied`)}
                    className="tap flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-muted/70 px-3 text-xs font-semibold disabled:opacity-40"
                  >
                    <Copy className="size-3.5" /> All
                  </button>
                </div>

                {open ? (
                  <ul className="space-y-2 px-3 pb-3">
                    {keys.map((k) => (
                      <KeyRow
                        key={k.id}
                        k={k}
                        shown={shown.has(k.id)}
                        copied={copied === k.id}
                        selecting={selecting}
                        picked={picked.has(k.id)}
                        onPick={() => setPicked((p) => flip(p, k.id))}
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
                ) : null}
              </Surface>
            );
          })}

          <p className="text-center text-xs text-muted-foreground">
            Showing {data.keys.length} of {data.total}
          </p>
          {data.hasMore ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => load(data.page + 1, query)}
              className="tap mx-auto flex h-11 items-center gap-2 rounded-2xl bg-muted/70 px-5 text-sm font-semibold"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null} Load more
            </button>
          ) : null}
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
    <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-amber-300/20 bg-[#120d05] p-5 text-white shadow-[0_24px_60px_-24px_rgb(251_191_36/0.45)] sm:p-6">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(110%_120%_at_100%_0%,rgb(251_191_36/0.28),transparent_55%),radial-gradient(90%_120%_at_0%_100%,color-mix(in_oklab,var(--primary)_35%,transparent),transparent_60%)]" />
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
            {spent.length ? spent.map(([c, v]) => formatMoney(v, c as UserKeyRow["currency"])).join(" · ") : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}

function KeyRow({
  k,
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
  shown: boolean;
  copied: boolean;
  selecting: boolean;
  picked: boolean;
  onPick: () => void;
  onToggle: () => void;
  onCopy: () => void;
  onOpen: () => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border p-2.5 pl-3 transition-colors",
        picked ? "border-primary/50 bg-primary/[0.08]" : "border-white/[0.05] bg-background/40",
      )}
      onClick={selecting && k.code ? onPick : undefined}
    >
      {selecting ? <PickBox checked={picked} disabled={!k.code} onClick={onPick} label="Select key" /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="rounded-md bg-highlight/15 px-1.5 py-0.5 font-semibold text-highlight">{k.durationLabel}</span>
          <span>{formatDate(k.createdAt)}</span>
          {k.androidId ? (
            <span className="inline-flex items-center gap-1">
              <Smartphone className="size-3" /> {k.androidId}
            </span>
          ) : null}
        </div>
        {k.code ? (
          <button
            type="button"
            onClick={(e) => {
              if (selecting) return;
              e.stopPropagation();
              onCopy();
            }}
            title="Tap to copy"
            className="mt-1.5 block max-w-full truncate text-left font-mono text-[13.5px] tracking-wide"
          >
            <span key={String(shown)} className={cn("inline-block", shown && "anim-pop-in text-foreground", !shown && "text-foreground/70")}>
              {shown ? k.code : mask(k.code)}
            </span>
          </button>
        ) : (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-warning">
            <Loader2 className="size-3.5 animate-spin" /> Pending delivery
          </p>
        )}
      </div>
      {!selecting && k.code ? (
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={shown ? "Hide key" : "Reveal key"} onClick={onToggle}>
            {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </IconButton>
          <IconButton label="Copy key" onClick={onCopy} active={copied}>
            {copied ? <Check className="anim-pop-in size-4" strokeWidth={3} /> : <Copy className="size-4" />}
          </IconButton>
          <IconButton label="Key details" onClick={onOpen}>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>
      ) : null}
    </li>
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

function ProductThumb({ image }: { image: string | null }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="size-11 shrink-0 rounded-2xl bg-muted object-cover ring-1 ring-white/10" />
  ) : (
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-400/5 text-amber-300 ring-1 ring-inset ring-amber-300/25">
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

function IconButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "tap grid size-9 place-items-center rounded-xl transition-colors",
        active ? "bg-success/15 text-success" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function PickBox({ checked, disabled, onClick, label }: { checked: boolean; disabled?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        tap();
        onClick();
      }}
      className={cn("anim-pop-in shrink-0 disabled:opacity-30", checked ? "text-primary" : "text-muted-foreground")}
    >
      {checked ? <CheckSquare className="size-5" /> : <Square className="size-5" />}
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
