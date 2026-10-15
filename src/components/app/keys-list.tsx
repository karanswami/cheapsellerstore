"use client";

import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import { HubEmptyPanel } from "@/components/app/hub/hub-list-row";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import {
  HubSearch,
  HubToolbar,
  HubToolbarRow,
} from "@/components/app/hub/hub-toolbar";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyToClipboard } from "@/lib/clipboard";
import { formatMoney, type Currency } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckSquare,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  MoreHorizontal,
  Search,
  ShoppingBag,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import styles from "./keys-list.module.css";

export type KeyRow = {
  id: string;
  productTitle: string;
  durationLabel: string;
  code: string | null;
  unitPrice: number;
  currency: Currency;
  createdAt: string;
  androidId?: string | null;
};

type KeysListProps = {
  initialKeys: KeyRow[];
  initialHasMore: boolean;
  initialTotal: number;
  pageSize?: number;
};

const HIDDEN_STORAGE_KEY = "drip-hidden-keys-v1";
const PAGE_CHUNK = 12;

function readHiddenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(HIDDEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeHiddenIds(ids: Set<string>) {
  localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify([...ids]));
}

async function copyText(text: string, success: string) {
  const ok = await copyToClipboard(text);
  if (ok) {
    toast.success(success);
    return true;
  }
  toast.error("Could not copy");
  return false;
}

function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function codesFromRows(rows: KeyRow[]) {
  return rows.map((r) => r.code).filter((c): c is string => Boolean(c));
}

function formatKeysTxt(
  rows: { productTitle: string; durationLabel: string; code: string | null }[],
) {
  return rows
    .filter((r): r is typeof r & { code: string } => Boolean(r.code))
    .map((r) => `${r.productTitle} — ${r.durationLabel}\n${r.code}`)
    .join("\n\n");
}

const KEY_DATE_OPTS = {
  dateStyle: "medium",
  timeStyle: "short",
} as const;

function formatKeyDate(iso: string, timeZone?: string) {
  return new Date(iso).toLocaleString("en-US", {
    ...KEY_DATE_OPTS,
    ...(timeZone ? { timeZone } : {}),
  });
}

const subscribeNoop = () => () => {};

function KeyDate({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const label = useSyncExternalStore(
    subscribeNoop,
    () => formatKeyDate(iso),
    () => formatKeyDate(iso, "UTC"),
  );
  return <span className={className}>{label}</span>;
}

export function KeysList({
  initialKeys,
  initialHasMore,
  initialTotal,
  pageSize = 25,
}: KeysListProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [serverPage, setServerPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_CHUNK);

  useEffect(() => {
    setKeys(initialKeys);
    setServerPage(1);
    setHasMore(initialHasMore);
    setTotal(initialTotal);
    setVisibleCount(PAGE_CHUNK);
  }, [initialKeys, initialHasMore, initialTotal]);

  useEffect(() => {
    setHiddenIds(readHiddenIds());
  }, []);

  const refreshKeys = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: String(pageSize),
      });
      const res = await fetch(`/api/keys?${params}`, { cache: "no-store" });
      const body = (await res.json()) as {
        data?: {
          keys: KeyRow[];
          page: number;
          hasMore: boolean;
          total: number;
        };
        error?: { message?: string };
      };
      if (!res.ok || !body.data) return;

      setKeys(body.data.keys);
      setServerPage(1);
      setHasMore(body.data.hasMore);
      setTotal(body.data.total);
      setVisibleCount((n) => Math.max(n, Math.min(PAGE_CHUNK, body.data!.keys.length)));
    } catch {
      /* keep current list */
    }
  }, [pageSize]);

  // Live sync after purchases — poll + tab focus (same pattern as wallet).
  useEffect(() => {
    void refreshKeys();
    const tick = () => {
      if (document.hidden) return;
      void refreshKeys();
    };
    const onVisible = () => {
      if (!document.hidden) void refreshKeys();
    };
    const id = window.setInterval(tick, 5000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshKeys]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = serverPage + 1;
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(pageSize),
      });
      const res = await fetch(`/api/keys?${params}`, { cache: "no-store" });
      const body = (await res.json()) as {
        data?: {
          keys: KeyRow[];
          page: number;
          hasMore: boolean;
          total: number;
        };
        error?: { message?: string };
      };
      if (!res.ok || !body.data) {
        throw new Error(body.error?.message ?? "Could not load keys");
      }
      setKeys((prev) => {
        const seen = new Set(prev.map((k) => k.id));
        const appended = body.data!.keys.filter((k) => !seen.has(k.id));
        return [...prev, ...appended];
      });
      setServerPage(body.data.page);
      setHasMore(body.data.hasMore);
      setTotal(body.data.total);
      setVisibleCount((n) => n + PAGE_CHUNK);
    } catch {
      toast.error("Could not load more keys");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, pageSize, serverPage]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = showHidden
      ? keys
      : keys.filter((k) => !hiddenIds.has(k.id));

    if (q) {
      list = list.filter(
        (k) =>
          k.productTitle.toLowerCase().includes(q) ||
          k.durationLabel.toLowerCase().includes(q) ||
          (k.code?.toLowerCase().includes(q) ?? false),
      );
    }

    list = [...list].sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortNewest ? db - da : da - db;
    });

    return list;
  }, [keys, hiddenIds, showHidden, query, sortNewest]);

  const pageItems = filtered.slice(0, visibleCount);
  const canShowMoreLocal = visibleCount < filtered.length;
  const hiddenCount = keys.filter((k) => hiddenIds.has(k.id)).length;
  const shownCount = keys.length - hiddenCount;

  const selectedRows = useMemo(
    () => pageItems.filter((k) => selected.has(k.id)),
    [pageItems, selected],
  );
  const selectedCount = selected.size;

  function persistHidden(next: Set<string>) {
    setHiddenIds(next);
    writeHiddenIds(next);
  }

  function hideIds(ids: string[]) {
    const next = new Set(hiddenIds);
    for (const id of ids) next.add(id);
    persistHidden(next);
    setSelected(new Set());
    toast.success(ids.length === 1 ? "Key hidden" : `${ids.length} keys hidden`);
  }

  function unhideIds(ids: string[]) {
    const next = new Set(hiddenIds);
    for (const id of ids) next.delete(id);
    persistHidden(next);
    setSelected(new Set());
    toast.success(ids.length === 1 ? "Key unhidden" : `${ids.length} keys unhidden`);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const ids = pageItems.map((k) => k.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    if (allOn) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyRow(row: KeyRow) {
    if (!row.code) return;
    const ok = await copyText(row.code, "Key copied");
    if (ok) {
      setRevealed((prev) => new Set(prev).add(row.id));
      setCopiedId(row.id);
      window.setTimeout(() => setCopiedId((id) => (id === row.id ? null : id)), 1600);
    }
  }

  function downloadRow(item: KeyRow) {
    if (!item.code) return;
    downloadTxt(
      `drip-key-${item.productTitle.replace(/\s+/g, "-").toLowerCase()}.txt`,
      formatKeysTxt([item]),
    );
    toast.success("Downloaded");
  }

  async function copySelected() {
    const codes = codesFromRows(selectedRows);
    if (codes.length === 0) {
      toast.error("No keys to copy");
      return;
    }
    await copyText(codes.join("\n"), `Copied ${codes.length} key(s)`);
  }

  function downloadSelected() {
    const content = formatKeysTxt(selectedRows);
    if (!content) {
      toast.error("No keys to download");
      return;
    }
    const count = codesFromRows(selectedRows).length;
    downloadTxt("drip-keys.txt", content);
    toast.success(`Downloaded ${count} key(s)`);
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  if (keys.length === 0) {
    return (
      <HubPageShell>
        <VaultHero total={0} visible={0} hidden={0} />
        <HubEmptyPanel>
          <EmptyState
            className="border-0 bg-transparent ring-0"
            icon={<KeyRound className="size-6" />}
            title="Your vault is empty"
            description="Shop from Home and checkout — fulfilled keys appear here instantly."
            action={
              <Button asChild>
                <Link href="/app">
                  <ShoppingBag data-icon="inline-start" />
                  Browse store
                </Link>
              </Button>
            }
          />
        </HubEmptyPanel>
      </HubPageShell>
    );
  }

  const allVisibleSelected =
    pageItems.length > 0 && pageItems.every((k) => selected.has(k.id));

  return (
    <HubPageShell>
      <VaultHero
        total={total}
        visible={Math.max(0, shownCount)}
        hidden={hiddenCount}
      />

      <HubToolbar>
        <HubToolbarRow>
          <HubSearch
            value={query}
            onChange={(value) => {
              setQuery(value);
              setVisibleCount(PAGE_CHUNK);
            }}
            placeholder="Search product or key…"
          />
          <Button
              type="button"
              size="sm"
              variant={selectMode ? "secondary" : "outline"}
              onClick={() => {
                if (selectMode) exitSelectMode();
                else setSelectMode(true);
              }}
            >
              {selectMode ? (
                <CheckSquare data-icon="inline-start" />
              ) : (
                <Square data-icon="inline-start" />
              )}
              {selectMode ? "Done" : "Select"}
            </Button>
        </HubToolbarRow>

        <FilterChipRow>
            <FilterChip
              active={sortNewest}
              onClick={() => {
                setSortNewest(true);
                setVisibleCount(PAGE_CHUNK);
              }}
            >
              Newest
            </FilterChip>
            <FilterChip
              active={!sortNewest}
              onClick={() => {
                setSortNewest(false);
                setVisibleCount(PAGE_CHUNK);
              }}
            >
              Oldest
            </FilterChip>
            {hiddenCount > 0 ? (
              <FilterChip
                active={showHidden}
                onClick={() => {
                  setShowHidden((v) => !v);
                  setSelected(new Set());
                  setVisibleCount(PAGE_CHUNK);
                }}
              >
                {showHidden ? "Hide hidden" : `Hidden (${hiddenCount})`}
              </FilterChip>
            ) : null}
            {selectMode ? (
              <FilterChip active={allVisibleSelected} onClick={toggleSelectAllVisible}>
                {allVisibleSelected ? "Deselect page" : "Select page"}
              </FilterChip>
            ) : null}
        </FilterChipRow>
      </HubToolbar>

      {filtered.length === 0 ? (
        <HubEmptyPanel>
            <EmptyState
              className="border-0 bg-transparent ring-0"
              icon={
                showHidden || hiddenCount === 0 ? (
                  <Search className="size-6" />
                ) : (
                  <EyeOff className="size-6" />
                )
              }
              title={
                keys.every((k) => hiddenIds.has(k.id)) && !showHidden
                  ? "All keys hidden"
                  : "No keys match"
              }
              description={
                keys.every((k) => hiddenIds.has(k.id)) && !showHidden
                  ? `${hiddenCount} key${hiddenCount === 1 ? "" : "s"} hidden on this device.`
                  : "Try a different search or sort."
              }
              action={
                keys.every((k) => hiddenIds.has(k.id)) && !showHidden ? (
                  <Button type="button" onClick={() => setShowHidden(true)}>
                    <Eye data-icon="inline-start" />
                    Show hidden
                  </Button>
                ) : undefined
              }
            />
        </HubEmptyPanel>
      ) : (
          <>
            <div className={styles.stack}>
              {pageItems.map((item) => {
                const isHidden = hiddenIds.has(item.id);
                const isSelected = selected.has(item.id);
                const isCopied = copiedId === item.id;
                const isRevealed = revealed.has(item.id);
                const hasCode = Boolean(item.code);

                return (
                  <article
                    key={item.id}
                    className={cn(
                      styles.ticket,
                      isSelected && styles.ticketSelected,
                      isHidden && styles.ticketHidden,
                    )}
                  >
                    <div className={styles.ticketStripe} aria-hidden />
                    <div className={styles.ticketInner}>
                      <div className={styles.ticketTop}>
                        {selectMode ? (
                          <div className={styles.selectSlot}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(item.id)}
                              aria-label={`Select ${item.productTitle}`}
                            />
                          </div>
                        ) : null}

                        <div className={styles.ticketIdentity}>
                          <p className={styles.ticketTitle}>{item.productTitle}</p>
                          <div className={styles.ticketMeta}>
                            <Badge variant="outline">{item.durationLabel}</Badge>
                            {isHidden ? (
                              <Badge variant="secondary">Hidden</Badge>
                            ) : null}
                          </div>
                          {item.androidId && (
                            <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                              <span className="font-semibold text-foreground/70">Android ID:</span> {item.androidId}
                            </p>
                          )}
                        </div>

                        <div className={styles.ticketMenu}>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label="More actions"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              sideOffset={6}
                              collisionPadding={12}
                              className="min-w-44 rounded-lg"
                            >
                              <DropdownMenuItem
                                disabled={!hasCode}
                                onSelect={() => void copyRow(item)}
                              >
                                <Copy />
                                Copy key
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!hasCode}
                                onSelect={() => downloadRow(item)}
                              >
                                <Download />
                                Download .txt
                              </DropdownMenuItem>
                              {hasCode ? (
                                <DropdownMenuItem
                                  onSelect={() => toggleReveal(item.id)}
                                >
                                  {isRevealed ? <EyeOff /> : <Eye />}
                                  {isRevealed ? "Mask key" : "Reveal key"}
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              {isHidden ? (
                                <DropdownMenuItem
                                  onSelect={() => unhideIds([item.id])}
                                >
                                  <Eye />
                                  Unhide
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={() => hideIds([item.id])}
                                >
                                  <EyeOff />
                                  Hide
                                </DropdownMenuItem>
                              )}
                              {!selectMode ? (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setSelectMode(true);
                                    setSelected(new Set([item.id]));
                                  }}
                                >
                                  <CheckSquare />
                                  Select
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className={styles.codePanel}>
                        <div className={styles.codeBody}>
                          <p className={styles.codeLabel}>License key</p>
                          <button
                            type="button"
                            className="block w-full text-left"
                            disabled={!hasCode}
                            onClick={() => {
                              if (!hasCode) return;
                              if (!isRevealed) toggleReveal(item.id);
                              else void copyRow(item);
                            }}
                            title={
                              !hasCode
                                ? undefined
                                : isRevealed
                                  ? "Tap to copy"
                                  : "Tap to reveal"
                            }
                          >
                            <p
                              className={cn(
                                styles.codeValue,
                                !hasCode && styles.codeEmpty,
                                hasCode && !isRevealed && styles.codeMasked,
                              )}
                            >
                              {item.code ?? "Unavailable"}
                            </p>
                          </button>
                        </div>

                        <div className={styles.codeActions}>
                          {hasCode && !isRevealed ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => toggleReveal(item.id)}
                            >
                              <Eye data-icon="inline-start" />
                              Reveal
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            className={styles.copyBtn}
                            disabled={!hasCode}
                            onClick={() => void copyRow(item)}
                          >
                            {isCopied ? (
                              <Check data-icon="inline-start" />
                            ) : (
                              <Copy data-icon="inline-start" />
                            )}
                            {isCopied ? "Copied" : "Copy"}
                          </Button>
                        </div>
                      </div>

                      <div className={styles.ticketFoot}>
                        <div className={styles.ticketFacts}>
                          <span className={styles.price}>
                            {formatMoney(item.unitPrice, item.currency)}
                          </span>
                          <span className={styles.dot} aria-hidden />
                          <KeyDate iso={item.createdAt} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className={styles.footer}>
              <p className={styles.footerMeta}>
                Showing {pageItems.length}
                {filtered.length > pageItems.length
                  ? ` of ${filtered.length} filtered`
                  : ""}
                {total > keys.length ? ` · ${total} in vault` : ""}
              </p>

              {canShowMoreLocal ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((n) => n + PAGE_CHUNK)}
                >
                  Show more
                </Button>
              ) : hasMore ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      data-icon="inline-start"
                    />
                  ) : null}
                  Load more from vault
                </Button>
              ) : null}
            </div>
          </>
        )}

        {selectMode && selectedCount > 0 ? (
          <div className={styles.bulkBar}>
            <p className={styles.bulkCount}>{selectedCount} selected</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copySelected()}
            >
              <Copy data-icon="inline-start" />
              Copy
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={downloadSelected}>
              <Download data-icon="inline-start" />
              .txt
            </Button>
            {showHidden ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => unhideIds([...selected])}
              >
                <Eye data-icon="inline-start" />
                Unhide
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => hideIds([...selected])}
              >
                <EyeOff data-icon="inline-start" />
                Hide
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={exitSelectMode}>
              Clear
            </Button>
          </div>
        ) : null}
    </HubPageShell>
  );
}

function VaultHero({
  total,
  visible,
  hidden,
}: {
  total: number;
  visible: number;
  hidden: number;
}) {
  const stats = [
    { label: "Total", value: String(total) },
    { label: "Visible", value: String(visible), tone: "success" as const },
    ...(hidden > 0
      ? [{ label: "Hidden", value: String(hidden) }]
      : []),
  ];

  return (
    <HubHeaderBar
      icon={<KeyRound />}
      title="Key vault"
      description="Reveal, copy, or download"
      stats={stats}
      statsLabel="Vault summary"
    />
  );
}
