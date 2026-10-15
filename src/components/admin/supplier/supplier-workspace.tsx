"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  SupplierBalanceDto,
  SupplierCatalogDto,
  SupplierCatalogItemDto,
  SupplierCatalogMappingDto,
  SupplierLogRow,
  SupplierLogsPage,
  SupplierSettingsDto,
} from "@/types/admin-supplier";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  LoaderCircle,
  Package,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type OkFilter = "all" | "ok" | "failed" | "fallback";
type CatalogFilter = "all" | "in" | "out" | "mapped" | "unmapped";

const PAGE_SIZE = 20;

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function prettyJson(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function groupCatalog(items: SupplierCatalogItemDto[]) {
  const map = new Map<string, SupplierCatalogItemDto[]>();
  for (const item of items) {
    const key = item.group_name?.trim() || "Ungrouped";
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

async function copyText(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

export function SupplierWorkspace() {
  const {
    data: settings,
    loading: settingsLoading,
    reload: reloadSettings,
  } = useAdminFetch<SupplierSettingsDto>("/api/admin/supplier/settings");

  const {
    data: catalog,
    loading: catalogLoading,
    reload: reloadCatalog,
  } = useAdminFetch<SupplierCatalogDto>("/api/admin/supplier/catalog");

  const [balance, setBalance] = useState<SupplierBalanceDto | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enabledDraft, setEnabledDraft] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [baseUrlDraft, setBaseUrlDraft] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [settingsPending, setSettingsPending] = useState(false);

  const [catalogPending, setCatalogPending] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [catalogDetail, setCatalogDetail] =
    useState<SupplierCatalogItemDto | null>(null);

  const [okFilter, setOkFilter] = useState<OkFilter>("all");
  const [logs, setLogs] = useState<SupplierLogRow[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsHasMore, setLogsHasMore] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsLoadingMore, setLogsLoadingMore] = useState(false);
  const [detail, setDetail] = useState<SupplierLogRow | null>(null);

  const mappedById = useMemo(() => {
    const map = new Map<number, SupplierCatalogMappingDto[]>();
    for (const row of catalog?.mappings ?? []) {
      const list = map.get(row.supplierProductId);
      if (list) list.push(row);
      else map.set(row.supplierProductId, [row]);
    }
    return map;
  }, [catalog?.mappings]);

  const mappedCount = catalog?.mappings.length ?? 0;
  const summary = catalog?.summary;

  const filteredCatalog = useMemo(() => {
    const items = catalog?.items ?? [];
    const q = catalogQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (catalogFilter === "in" && item.in_stock === false) return false;
      if (catalogFilter === "out" && item.in_stock !== false) return false;
      const isMapped = mappedById.has(item.id);
      if (catalogFilter === "mapped" && !isMapped) return false;
      if (catalogFilter === "unmapped" && isMapped) return false;
      if (!q) return true;
      const hay =
        `${item.id} ${item.name} ${item.group_name ?? ""} ${item.price}`.toLowerCase();
      return hay.includes(q);
    });
  }, [catalog?.items, catalogFilter, catalogQuery, mappedById]);

  const catalogGroups = useMemo(
    () => groupCatalog(filteredCatalog),
    [filteredCatalog],
  );

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/admin/supplier/balance", {
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: SupplierBalanceDto;
        error?: { message: string };
      };
      if (!res.ok) {
        setBalance(null);
        if (res.status !== 400) {
          toast.error(json.error?.message ?? "Balance fetch failed");
        }
        return;
      }
      setBalance(json.data ?? null);
    } catch {
      toast.error("Network error");
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const loadLogs = useCallback(
    async (page: number, append: boolean) => {
      if (append) setLogsLoadingMore(true);
      else setLogsLoading(true);
      try {
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (okFilter === "ok") qs.set("ok", "true");
        if (okFilter === "failed") qs.set("ok", "false");
        if (okFilter === "fallback") qs.set("fallback", "true");
        const res = await fetch(`/api/admin/supplier/logs?${qs}`, {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: SupplierLogsPage;
          error?: { message: string };
        };
        if (!res.ok) {
          toast.error(json.error?.message ?? "Failed to load logs");
          return;
        }
        const data = json.data;
        if (!data) return;
        setLogs((prev) => (append ? [...prev, ...data.rows] : data.rows));
        setLogsPage(data.page);
        setLogsHasMore(data.hasMore);
        setLogsTotal(data.total);
      } catch {
        toast.error("Network error");
      } finally {
        setLogsLoading(false);
        setLogsLoadingMore(false);
      }
    },
    [okFilter],
  );

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    void loadLogs(1, false);
  }, [loadLogs]);

  useEffect(() => {
    if (!settingsOpen || !settings) return;
    setEnabledDraft(settings.enabled);
    setApiKeyDraft("");
    setBaseUrlDraft(settings.baseUrl);
    setClearKey(false);
  }, [settingsOpen, settings]);

  async function saveSettings() {
    setSettingsPending(true);
    try {
      const body: Record<string, unknown> = {
        enabled: enabledDraft,
        baseUrl: baseUrlDraft.trim(),
      };
      if (clearKey) body.clearApiKey = true;
      else if (apiKeyDraft.trim()) body.apiKey = apiKeyDraft.trim();

      const result = await adminMutate("/api/admin/supplier/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Supplier settings saved");
      setSettingsOpen(false);
      void reloadSettings();
      void loadBalance();
    } finally {
      setSettingsPending(false);
    }
  }

  async function refreshCatalog() {
    setCatalogPending(true);
    try {
      const result = await adminMutate("/api/admin/supplier/catalog", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Catalog refreshed from supplier");
      void reloadCatalog();
      void loadLogs(1, false);
    } finally {
      setCatalogPending(false);
    }
  }

  function toggleGroup(name: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const liveReady =
    Boolean(settings?.enabled) &&
    Boolean(settings?.configured) &&
    (catalog?.items.length ?? 0) > 0;

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Supplier"
        description="Full upstream visibility — credentials, balance, catalog map, every API call"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              asChild
            >
              <Link href="/admin/products">
                <Link2 data-icon="inline-start" />
                Map on Products
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 data-icon="inline-start" />
              Settings
            </Button>
          </div>
        }
      />

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Fulfill pipeline
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Checkout & Platform API try{" "}
              <span className="font-medium text-foreground">
                supplier generate
              </span>{" "}
              first when enabled + duration mapped. On fail/empty →{" "}
              <span className="font-medium text-foreground">
                local key claim
              </span>
              . Every HTTP call is logged with full request/response.
            </p>
          </div>
          <Badge variant={liveReady ? "default" : "secondary"}>
            {liveReady ? "Live hybrid" : "Local-first"}
          </Badge>
        </div>
        <ol className="mt-3 grid gap-2 sm:grid-cols-4">
          {[
            {
              ok: Boolean(settings?.configured),
              label: "API key",
              hint: settings?.apiKeyMasked || "Not set",
            },
            {
              ok: Boolean(settings?.enabled),
              label: "Master switch",
              hint: settings?.enabled ? "On" : "Off",
            },
            {
              ok: (catalog?.items.length ?? 0) > 0,
              label: "Catalog cache",
              hint: `${catalog?.items.length ?? 0} products`,
            },
            {
              ok: mappedCount > 0,
              label: "Duration maps",
              hint: `${mappedCount} linked`,
            },
          ].map((step) => (
            <li
              key={step.label}
              className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2.5"
            >
              {step.ok ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
              ) : (
                <XCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium">{step.label}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {step.hint}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldAlert className="size-3.5" />
            <p className="text-[11px] tracking-wide uppercase">Status</p>
          </div>
          {settingsLoading ? (
            <LoaderCircle className="mt-2 size-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={settings?.enabled ? "default" : "secondary"}>
                {settings?.enabled ? "Enabled" : "Disabled"}
              </Badge>
              <Badge
                variant={settings?.configured ? "outline" : "destructive"}
              >
                {settings?.configured ? "Key set" : "No API key"}
              </Badge>
            </div>
          )}
          {settings?.baseUrl ? (
            <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
              {settings.baseUrl}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="size-3.5" />
              <p className="text-[11px] tracking-wide uppercase">Balance</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={balanceLoading}
              onClick={() => void loadBalance()}
            >
              <RefreshCw
                className={cn("size-3.5", balanceLoading && "animate-spin")}
              />
            </Button>
          </div>
          {balanceLoading && !balance ? (
            <LoaderCircle className="mt-2 size-4 animate-spin text-muted-foreground" />
          ) : balance ? (
            <>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {balance.balance}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {balance.currency}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Lifetime keys: {balance.lifetime_keys}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Set API key, then refresh.
            </p>
          )}
        </div>

        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="size-3.5" />
            <p className="text-[11px] tracking-wide uppercase">Catalog</p>
          </div>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {summary?.totalProducts ?? catalog?.items.length ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary
              ? `${summary.totalGroups} groups · ${summary.inStock} in · ${summary.outOfStock} out`
              : "Not synced"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {catalog?.fetchedAt
              ? `Synced ${formatWhen(catalog.fetchedAt)}`
              : "Tap Refresh after key setup"}
          </p>
        </div>

        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link2 className="size-3.5" />
            <p className="text-[11px] tracking-wide uppercase">Mapped</p>
          </div>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {mappedCount}
          </p>
          <p className="text-xs text-muted-foreground">
            Local durations → supplier IDs
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Supplier catalog</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={catalogPending || !settings?.configured}
            onClick={() => void refreshCatalog()}
          >
            {catalogPending ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            Refresh from API
          </Button>
        </div>

        {(catalog?.items.length ?? 0) > 0 ? (
          <>
            <Input
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Search id, name, group…"
              className="h-9"
            />
            <FilterChipRow aria-label="Catalog filters">
              {(
                [
                  ["all", "All"],
                  ["in", "In stock"],
                  ["out", "Out"],
                  ["mapped", "Mapped"],
                  ["unmapped", "Unmapped"],
                ] as const
              ).map(([value, label]) => (
                <FilterChip
                  key={value}
                  active={catalogFilter === value}
                  onClick={() => setCatalogFilter(value)}
                >
                  {label}
                </FilterChip>
              ))}
            </FilterChipRow>
          </>
        ) : null}

        {catalogLoading ? (
          <AdminListSkeleton rows={4} />
        ) : !catalog?.items.length ? (
          <AdminEmptyState message="No catalog cached. Set API key → Settings, then Refresh from API." />
        ) : catalogGroups.length === 0 ? (
          <AdminEmptyState message="No products match this filter." />
        ) : (
          <div className="space-y-2">
            {catalogGroups.map(([groupName, rows]) => {
              const open = !collapsedGroups.has(groupName);
              const groupIn = rows.filter((r) => r.in_stock !== false).length;
              return (
                <div
                  key={groupName}
                  className="overflow-hidden rounded-xl ring-1 ring-foreground/10"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupName)}
                    className="flex w-full items-center gap-2 bg-muted/40 px-3.5 py-2.5 text-left"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        !open && "-rotate-90",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {groupName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {rows.length} SKUs · {groupIn} in stock
                      </p>
                    </div>
                  </button>
                  {open ? (
                    <ul className="divide-y divide-border/40 bg-card">
                      {rows.map((item) => {
                        const maps = mappedById.get(item.id) ?? [];
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => setCatalogDetail(item)}
                              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40"
                            >
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Truck className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {item.name}
                                </p>
                                <p className="truncate font-mono text-[11px] text-muted-foreground">
                                  #{item.id}
                                  {item.validity_days != null
                                    ? ` · ${item.validity_days}d`
                                    : ""}
                                  {` · $${item.price}`}
                                  {item.list_price &&
                                  item.list_price !== item.price
                                    ? ` (list $${item.list_price})`
                                    : ""}
                                  {item.stock_count != null
                                    ? ` · stock ${item.stock_count}`
                                    : ""}
                                  {maps.length
                                    ? ` · → ${maps[0].productTitle}`
                                    : ""}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <Badge
                                  variant={
                                    item.in_stock ? "default" : "secondary"
                                  }
                                >
                                  {item.in_stock ? "In" : "Out"}
                                </Badge>
                                {maps.length ? (
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[10px]"
                                  >
                                    mapped
                                  </Badge>
                                ) : null}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">
            API call history
            {logsTotal > 0 ? (
              <span className="ml-2 font-normal text-muted-foreground">
                ({logsTotal})
              </span>
            ) : null}
          </h2>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void loadLogs(1, false)}
          >
            <RefreshCw data-icon="inline-start" />
            Reload
          </Button>
        </div>

        <FilterChipRow aria-label="Log filters">
          {(
            [
              ["all", "All"],
              ["ok", "OK"],
              ["failed", "Failed"],
              ["fallback", "Fallback"],
            ] as const
          ).map(([value, label]) => (
            <FilterChip
              key={value}
              active={okFilter === value}
              onClick={() => setOkFilter(value)}
            >
              {label}
            </FilterChip>
          ))}
        </FilterChipRow>

        {logsLoading ? (
          <AdminListSkeleton rows={5} />
        ) : logs.length === 0 ? (
          <AdminEmptyState message="No supplier API calls logged yet." />
        ) : (
          <ul className="space-y-1.5">
            {logs.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setDetail(row)}
                  className="flex w-full items-center gap-3 rounded-xl bg-card px-3.5 py-2.5 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
                >
                  {row.ok ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.method} {row.endpoint}
                      {row.productId != null ? ` · #${row.productId}` : ""}
                      {row.quantity != null ? ` ×${row.quantity}` : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatWhen(row.createdAt)}
                      {row.httpStatus ? ` · HTTP ${row.httpStatus}` : ""}
                      {row.usedFallback ? " · local fallback" : ""}
                      {row.orderId ? ` · order ${row.orderId.slice(0, 8)}…` : ""}
                      {row.errorCode ? ` · ${row.errorCode}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 font-mono text-[10px]"
                  >
                    {row.ok ? "ok" : "fail"}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}

        {logsHasMore ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={logsLoadingMore}
            onClick={() => void loadLogs(logsPage + 1, true)}
          >
            {logsLoadingMore ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </section>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 border-b border-border/40 bg-muted/30 px-4 py-4 sm:px-5">
            <DialogTitle>Supplier API settings</DialogTitle>
            <DialogDescription>
              Credentials stay server-side (masked on read). Master off =
              local inventory only, even if durations are mapped.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-3">
              <div>
                <p className="text-sm font-medium">Enable supplier fulfill</p>
                <p className="text-xs text-muted-foreground">
                  Off = skip upstream, use local keys only
                </p>
              </div>
              <Switch
                checked={enabledDraft}
                onCheckedChange={setEnabledDraft}
              />
            </div>
            <div className="space-y-1.5">
              <Label>API key</Label>
              <Input
                type="password"
                autoComplete="off"
                value={apiKeyDraft}
                onChange={(e) => {
                  setApiKeyDraft(e.target.value);
                  setClearKey(false);
                }}
                placeholder={
                  settings?.hasApiKey
                    ? "Leave blank to keep current key"
                    : "Bearer token from supplier"
                }
                className="font-mono text-xs"
              />
              {settings?.hasApiKey ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">Clear stored key</p>
                    <p className="text-[11px] text-muted-foreground">
                      Current: {settings.apiKeyMasked}
                    </p>
                  </div>
                  <Switch
                    checked={clearKey}
                    onCheckedChange={(v) => {
                      setClearKey(v);
                      if (v) setApiKeyDraft("");
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Base URL</Label>
              <Input
                value={baseUrlDraft}
                onChange={(e) => setBaseUrlDraft(e.target.value)}
                placeholder="https://licencedashboard.shop/api/v1"
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/40 bg-muted/20 px-4 py-4 sm:px-5">
            <Button
              type="button"
              variant="outline"
              disabled={settingsPending}
              onClick={() => setSettingsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={settingsPending}
              onClick={() => void saveSettings()}
            >
              {settingsPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(catalogDetail)}
        onOpenChange={(open) => {
          if (!open) setCatalogDetail(null);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border/40 bg-muted/30 px-4 py-4 sm:px-5">
            <DialogTitle className="pr-8">
              {catalogDetail?.name ?? "Supplier product"}
            </DialogTitle>
            <DialogDescription>
              Upstream catalog row — map this ID on a product duration to
              fulfill from supplier.
            </DialogDescription>
          </DialogHeader>
          {catalogDetail ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm sm:px-5">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={catalogDetail.in_stock ? "default" : "secondary"}
                >
                  {catalogDetail.in_stock ? "In stock" : "Out of stock"}
                </Badge>
                {(mappedById.get(catalogDetail.id) ?? []).length ? (
                  <Badge variant="outline">Mapped locally</Badge>
                ) : (
                  <Badge variant="secondary">Not mapped</Badge>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {(
                  [
                    ["Supplier ID", String(catalogDetail.id)],
                    ["Price", `$${catalogDetail.price}`],
                    [
                      "List price",
                      catalogDetail.list_price
                        ? `$${catalogDetail.list_price}`
                        : "—",
                    ],
                    [
                      "Validity",
                      catalogDetail.validity_days != null
                        ? `${catalogDetail.validity_days} days`
                        : "—",
                    ],
                    [
                      "Stock count",
                      catalogDetail.stock_count != null
                        ? String(catalogDetail.stock_count)
                        : "—",
                    ],
                    ["Group", catalogDetail.group_name || "—"],
                  ] as const
                ).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
                      {k}
                    </dt>
                    <dd className="mt-0.5 font-mono break-all">{v}</dd>
                  </div>
                ))}
              </dl>
              {(mappedById.get(catalogDetail.id) ?? []).length ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Linked durations
                  </p>
                  <ul className="space-y-1">
                    {(mappedById.get(catalogDetail.id) ?? []).map((m) => (
                      <li
                        key={m.durationId}
                        className="rounded-lg bg-muted/30 px-3 py-2 text-xs"
                      >
                        <p className="font-medium">
                          {m.productTitle} · {m.durationLabel}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          duration {m.durationId}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="shrink-0 flex-wrap gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:justify-between sm:px-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                catalogDetail &&
                void copyText("Supplier ID", String(catalogDetail.id))
              }
            >
              <Copy data-icon="inline-start" />
              Copy ID
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/products">
                  <ExternalLink data-icon="inline-start" />
                  Open Products
                </Link>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCatalogDetail(null)}
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border/40 bg-muted/30 px-4 py-4 sm:px-5">
            <DialogTitle>
              {detail?.method} {detail?.endpoint}
            </DialogTitle>
            <DialogDescription>
              Full transparent payload for you and the API owner — nothing
              stripped from request/response JSON.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-xs sm:px-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant={detail.ok ? "default" : "destructive"}>
                  {detail.ok ? "OK" : "Failed"}
                </Badge>
                <Badge variant="outline">HTTP {detail.httpStatus}</Badge>
                {detail.usedFallback ? (
                  <Badge variant="secondary">Local fallback used</Badge>
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["When", formatWhen(detail.createdAt)],
                    ["Product ID", detail.productId != null ? `#${detail.productId}` : "—"],
                    [
                      "Quantity",
                      detail.quantity != null ? String(detail.quantity) : "—",
                    ],
                    ["Order", detail.orderId ?? "—"],
                    ["Duration", detail.durationId ?? "—"],
                    ["User", detail.userId ?? "—"],
                    ["Idempotency", detail.idempotencyKey ?? "—"],
                    [
                      "Error",
                      detail.errorCode
                        ? `${detail.errorCode}${detail.errorMessage ? `: ${detail.errorMessage}` : ""}`
                        : "—",
                    ],
                  ] as const
                ).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
                      {k}
                    </dt>
                    <dd className="mt-0.5 font-mono break-all">{v}</dd>
                  </div>
                ))}
              </dl>
              {detail.errorCode || detail.errorMessage ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                  <KeyRound className="mr-1 inline size-3.5" />
                  {detail.errorCode}: {detail.errorMessage}
                </p>
              ) : null}
              <JsonBlock
                label="Request"
                raw={detail.requestJson}
                onCopy={() => void copyText("Request", detail.requestJson)}
              />
              <JsonBlock
                label="Response"
                raw={detail.responseJson}
                onCopy={() => void copyText("Response", detail.responseJson)}
              />
            </div>
          ) : null}
          <DialogFooter className="shrink-0 flex-wrap gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:justify-between sm:px-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!detail) return;
                void copyText(
                  "Call dump",
                  JSON.stringify(
                    {
                      ...detail,
                      request: prettyJson(detail.requestJson),
                      response: prettyJson(detail.responseJson),
                    },
                    null,
                    2,
                  ),
                );
              }}
            >
              <Copy data-icon="inline-start" />
              Copy all
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDetail(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function JsonBlock({
  label,
  raw,
  onCopy,
}: {
  label: string;
  raw: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button type="button" size="sm" variant="ghost" onClick={onCopy}>
          <Copy data-icon="inline-start" />
          Copy
        </Button>
      </div>
      <pre className="max-h-52 overflow-auto rounded-lg bg-muted/40 p-3 font-mono whitespace-pre-wrap break-all">
        {prettyJson(raw)}
      </pre>
    </div>
  );
}
