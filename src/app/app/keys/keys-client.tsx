"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Package,
  Search,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { EmptyState, formatDate } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";
import type { UserKeyRow, UserKeysPage } from "@/lib/orders";
import { cn } from "@/lib/utils";

const PAGE = 100;
type Sort = "new" | "old" | "name";

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
    toast.success(msg);
    return true;
  } catch {
    toast.error("Copy failed");
    return false;
  }
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function KeysClient({ initial }: { initial: UserKeysPage }) {
  const [data, setData] = useState(initial);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [product, setProduct] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("new");
  const [copied, setCopied] = useState<string | null>(null);
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
    if (first.current) {
      first.current = false;
      // initial server page is small; fetch a bigger first page
      if (initial.hasMore) load(1, "");
      return;
    }
    const t = setTimeout(() => load(1, query), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const products = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of data.keys) m.set(k.productTitle, (m.get(k.productTitle) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
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

  return (
    <div className="space-y-4 pb-24">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={KeyRound} label="Total keys" value={String(data.total)} />
        <Stat icon={Package} label="Products" value={String(products.length)} />
        <Stat
          icon={Wallet}
          label="Spent"
          value={spent.length ? spent.map(([c, v]) => formatMoney(v, c as UserKeyRow["currency"])).join(" · ") : "—"}
        />
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-1 space-y-3 rounded-xl border bg-background/95 p-3 backdrop-blur">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product, duration or key…"
              className="pl-9 pr-9"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-9 rounded-lg border bg-card px-2 text-sm"
              aria-label="Sort"
            >
              <option value="new">Newest first</option>
              <option value="old">Oldest first</option>
              <option value="name">Product A–Z</option>
            </select>
            <Button variant="secondary" size="sm" onClick={() => setShown(new Set(visible.map((k) => k.id)))}>
              <Eye /> Reveal all
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShown(new Set())}>
              <EyeOff /> Hide all
            </Button>
          </div>
        </div>

        {products.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip active={!product} onClick={() => setProduct(null)}>
              All <b>{data.keys.length}</b>
            </Chip>
            {products.map(([name, n]) => (
              <Chip key={name} active={product === name} onClick={() => setProduct(product === name ? null : name)}>
                {name} <b>{n}</b>
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      {/* List */}
      {data.keys.length === 0 ? (
        loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <EmptyState
            icon={KeyRound}
            title={query ? "No keys match your search" : "No keys yet"}
            hint="Keys appear here as soon as an order is delivered."
          />
        )
      ) : (
        <div className={cn("space-y-4", loading && "opacity-60")}>
          {groups.map(([title, keys]) => {
            const open = !closed.has(title);
            const ids = keys.filter((k) => k.code).map((k) => k.id);
            const allPicked = ids.length > 0 && ids.every((id) => picked.has(id));
            return (
              <section key={title} className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allPicked}
                    onChange={() => toggleGroupPick(keys)}
                    disabled={!ids.length}
                    className="size-4 accent-primary"
                    aria-label={`Select all ${title}`}
                  />
                  <button
                    type="button"
                    onClick={() => setClosed((s) => flip(s, title))}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <ChevronDown className={cn("size-4 shrink-0 transition-transform", !open && "-rotate-90")} />
                    <span className="truncate font-display font-semibold">{title}</span>
                    <Badge variant="muted">{keys.length}</Badge>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!ids.length}
                    onClick={() => copyText(keys.filter((k) => k.code).map((k) => k.code).join("\n"), `${ids.length} keys copied`)}
                  >
                    <Copy /> <span className="hidden sm:inline">Copy all</span>
                  </Button>
                </div>

                {open ? (
                  <ul className="divide-y">
                    {keys.map((k) => {
                      const isShown = shown.has(k.id);
                      return (
                        <li
                          key={k.id}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40",
                            picked.has(k.id) && "bg-primary/5",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={picked.has(k.id)}
                            disabled={!k.code}
                            onChange={() => setPicked((p) => flip(p, k.id))}
                            className="size-4 shrink-0 accent-primary"
                            aria-label="Select key"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                              <Badge variant="highlight">{k.durationLabel}</Badge>
                              <span>{formatDate(k.createdAt)}</span>
                              <span>{formatMoney(k.unitPrice, k.currency)}</span>
                              {k.androidId ? (
                                <span className="inline-flex items-center gap-1">
                                  <Smartphone className="size-3" /> {k.androidId}
                                </span>
                              ) : null}
                            </div>
                            {k.code ? (
                              <button
                                type="button"
                                onClick={() => copyOne(k)}
                                title="Click to copy"
                                className="mt-1 block max-w-full truncate text-left font-mono text-sm hover:text-primary"
                              >
                                {isShown ? k.code : mask(k.code)}
                              </button>
                            ) : (
                              <p className="mt-1 text-sm text-muted-foreground">Key pending delivery</p>
                            )}
                          </div>
                          {k.code ? (
                            <div className="flex shrink-0 gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShown((s) => flip(s, k.id))}
                                aria-label={isShown ? "Hide key" : "Reveal key"}
                              >
                                {isShown ? <EyeOff /> : <Eye />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => copyOne(k)} aria-label="Copy key">
                                {copied === k.id ? <Check className="text-success" /> : <Copy />}
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            );
          })}

          <p className="text-center text-xs text-muted-foreground">
            Showing {data.keys.length} of {data.total}
          </p>
          {data.hasMore ? (
            <div className="text-center">
              <Button variant="secondary" disabled={loading} onClick={() => load(data.page + 1, query)}>
                {loading ? <Loader2 className="animate-spin" /> : null} Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Action bar */}
      {selected.length > 0 || withCode.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:left-auto md:right-6 md:bottom-6 md:rounded-xl md:border md:shadow-lg">
          <div className="mx-auto flex flex-wrap items-center justify-center gap-2">
            {selected.length > 0 ? (
              <>
                <span className="px-1 text-sm font-medium">{selected.length} selected</span>
                <Button size="sm" onClick={() => copyText(selected.map((k) => k.code).join("\n"), `${selected.length} keys copied`)}>
                  <Copy /> Copy
                </Button>
                <Button size="sm" variant="secondary" onClick={() => save("my-keys.txt", selected.map(line).join("\n\n"))}>
                  <Download /> .txt
                </Button>
                <Button size="sm" variant="secondary" onClick={() => exportCsv(selected)}>
                  <FileSpreadsheet /> .csv
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
                  <X /> Clear
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPicked(new Set(withCode.map((k) => k.id)))}
                >
                  <Check /> Select all {withCode.length}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => save("my-keys.txt", withCode.map(line).join("\n\n"))}>
                  <Download /> Export .txt
                </Button>
                <Button size="sm" variant="secondary" onClick={() => exportCsv(withCode)}>
                  <FileSpreadsheet /> Export .csv
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof KeyRound; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 text-primary" /> {label}
      </div>
      <p className="mt-1 truncate font-display text-lg font-bold sm:text-2xl">{value}</p>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors [&_b]:text-xs [&_b]:font-semibold [&_b]:opacity-70",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
