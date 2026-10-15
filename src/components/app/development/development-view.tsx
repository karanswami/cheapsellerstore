"use client";

import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip, FilterChipRow } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/currencies";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  ExternalLink,
  KeyRound,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";

type HubTab = "overview" | "credential" | "calls" | "purchases" | "webhooks";

const HUB_TABS: { id: HubTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "credential", label: "Credential" },
  { id: "calls", label: "Calls" },
  { id: "purchases", label: "Purchases" },
  { id: "webhooks", label: "Webhooks" },
];

type ApiStats = {
  requests24h: number;
  requests7d: number;
  errors24h: number;
  rateLimited24h: number;
  successRate24h: number;
  avgDurationMs24h: number;
  fees24hMicrocents: number;
  feesAllMicrocents: number;
  purchases24h: number;
  purchasesAll: number;
  spendAllMicrocents: number;
};

type Overview = {
  allowed: boolean;
  gateMessage: string | null;
  purchaseFeePercent: number;
  defaultRateLimitRpm: number;
  isPremium?: boolean;
  maxKeysPerUser: number;
  sandboxEnabled: boolean;
  walletBalanceMicrocents: number;
  hasCredential?: boolean;
  activeKeys: number;
  stats: ApiStats | null;
};

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  mode: "LIVE" | "SANDBOX";
  status: string;
  scopes: string[];
  ipAllowlist: string[];
  rateLimitRpm: number | null;
  lastUsedAt: string | null;
  createdAt: string;
};

type UsageItem = {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  feeMicrocents: number;
  durationMs: number;
  keyPrefix: string;
  keyName: string;
  createdAt: string;
  errorCode: string | null;
  requestId: string;
};

type PurchaseItem = {
  id: string;
  orderId: string;
  status: string;
  productTitle: string;
  durationLabel: string | null;
  durationApiCode: string | null;
  quantity: number;
  uniqueProducts: number;
  subtotalMicrocents: number;
  apiFeeMicrocents: number;
  totalMicrocents: number;
  createdAt: string;
  items: {
    productTitle: string;
    durationLabel: string;
    durationApiCode?: string | null;
    unitPriceMicrocents: number;
  }[];
};

type WebhookRow = {
  id: string;
  url: string;
  secretPrefix: string;
  events: string[];
  status: string;
  failCount: number;
};

type UsageFilter = "all" | "ok" | "error" | "purchases";

type DevelopmentViewProps = {
  initialOverview: Overview;
  initialCredentials: ApiKeyRow[];
  initialWebhooks: WebhookRow[];
};

const ALL_SCOPES = [
  "balance:read",
  "catalog:read",
  "orders:read",
  "orders:write",
];

const FETCH_TIMEOUT_MS = 15_000;

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function shortPath(path: string) {
  return path.replace(/^\/api\/v1/, "").replace(/^\//, "") || path;
}

function statusTone(code: number): "ok" | "warn" | "err" {
  if (code < 400) return "ok";
  if (code === 429) return "warn";
  return "err";
}

export function DevelopmentView({
  initialOverview,
  initialCredentials,
  initialWebhooks,
}: DevelopmentViewProps) {
  const [overview, setOverview] = useState<Overview | null>(initialOverview);
  const [credentials, setCredentials] =
    useState<ApiKeyRow[]>(initialCredentials);
  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [usageHasMore, setUsageHasMore] = useState(false);
  const [usagePage, setUsagePage] = useState(1);
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [usageTotal, setUsageTotal] = useState(0);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [purchasesHasMore, setPurchasesHasMore] = useState(false);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [purchasesTotal, setPurchasesTotal] = useState(0);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>(initialWebhooks);
  const [loading, setLoading] = useState(false);
  const [listPending, startListTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [secretOpen, setSecretOpen] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);
  const [whOpen, setWhOpen] = useState(false);
  const [whSecret, setWhSecret] = useState<string | null>(null);
  const [purchaseDetail, setPurchaseDetail] = useState<PurchaseItem | null>(
    null
  );
  const [callDetail, setCallDetail] = useState<UsageItem | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    name: "My API Key",
    mode: "LIVE" as "LIVE" | "SANDBOX",
    scopes: [...ALL_SCOPES],
    ipAllowlist: "",
    rateLimitRpm: "",
  });
  const [whUrl, setWhUrl] = useState("");
  const [tab, setTab] = useState<HubTab>("overview");

  const hasCredential = credentials.length > 0;
  const maxKeys = overview?.maxKeysPerUser ?? 5;
  const atKeyLimit = credentials.length >= maxKeys;

  const loadCore = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    const ac = new AbortController();
    const kill = window.setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    try {
      const [oRes, kRes, wRes] = await Promise.all([
        fetch("/api/platform-api/overview", {
          credentials: "include",
          signal: ac.signal,
          cache: "no-store",
        }),
        fetch("/api/platform-api/keys", {
          credentials: "include",
          signal: ac.signal,
          cache: "no-store",
        }),
        fetch("/api/platform-api/webhooks", {
          credentials: "include",
          signal: ac.signal,
          cache: "no-store",
        }),
      ]);
      const oJson = (await oRes.json()) as {
        data?: Overview;
        error?: { message: string };
      };
      if (!oRes.ok) {
        toast.error(oJson.error?.message ?? "Failed to load");
        return;
      }
      setOverview(oJson.data ?? null);

      if (kRes.ok) {
        const kJson = (await kRes.json()) as {
          data?: { credentials: ApiKeyRow[] };
        };
        setCredentials(kJson.data?.credentials ?? []);
      }
      if (wRes.ok) {
        const wJson = (await wRes.json()) as {
          data?: { webhooks: WebhookRow[] };
        };
        setWebhooks(wJson.data?.webhooks ?? []);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("Request timed out — try Refresh.");
      } else {
        toast.error("Failed to load API hub");
      }
    } finally {
      window.clearTimeout(kill);
      setLoading(false);
    }
  }, []);

  const loadUsage = useCallback(
    async (page: number, filter: UsageFilter, append: boolean) => {
      const ac = new AbortController();
      const kill = window.setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(
          `/api/platform-api/usage?page=${page}&limit=20&filter=${filter}`,
          { credentials: "include", signal: ac.signal, cache: "no-store" }
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          data?: {
            items: UsageItem[];
            hasMore: boolean;
            total: number;
            page: number;
          };
        };
        const data = json.data;
        if (!data) return;
        setUsage((prev) => (append ? [...prev, ...data.items] : data.items));
        setUsageHasMore(data.hasMore);
        setUsagePage(data.page);
        setUsageTotal(data.total);
      } catch {
        /* timeout / network — keep prior rows */
      } finally {
        window.clearTimeout(kill);
      }
    },
    []
  );

  const loadPurchases = useCallback(async (page: number, append: boolean) => {
    const ac = new AbortController();
    const kill = window.setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(
        `/api/platform-api/purchases?page=${page}&limit=20`,
        { credentials: "include", signal: ac.signal, cache: "no-store" }
      );
      if (!res.ok) return;
      const json = (await res.json()) as {
        data?: {
          items: PurchaseItem[];
          hasMore: boolean;
          total: number;
          page: number;
        };
      };
      const data = json.data;
      if (!data) return;
      setPurchases((prev) => (append ? [...prev, ...data.items] : data.items));
      setPurchasesHasMore(data.hasMore);
      setPurchasesPage(data.page);
      setPurchasesTotal(data.total);
    } catch {
      /* timeout / network — keep prior rows */
    } finally {
      window.clearTimeout(kill);
    }
  }, []);

  const refreshAll = useCallback(
    async (opts?: { silent?: boolean }) => {
      await loadCore(opts);
      await Promise.all([
        loadUsage(1, usageFilter, false),
        loadPurchases(1, false),
      ]);
    },
    [loadCore, loadUsage, loadPurchases, usageFilter]
  );

  useEffect(() => {
    void (async () => {
      await Promise.all([loadUsage(1, "all", false), loadPurchases(1, false)]);
      void loadCore({ silent: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial mount only
  }, []);

  function changeUsageFilter(next: UsageFilter) {
    setUsageFilter(next);
    startListTransition(() => {
      void loadUsage(1, next, false);
    });
  }

  async function createKey() {
    setPending(true);
    try {
      const res = await fetch("/api/platform-api/keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          mode: form.mode,
          scopes: form.scopes,
          ipAllowlist: form.ipAllowlist
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean),
          rateLimitRpm: form.rateLimitRpm ? Number(form.rateLimitRpm) : null,
        }),
      });
      const json = (await res.json()) as {
        data?: { secret: string };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed");
        return;
      }
      setCreateOpen(false);
      setSecretOpen(json.data?.secret ?? null);
      toast.success("API key created");
      await loadCore();
    } finally {
      setPending(false);
    }
  }

  async function rotateKey(id: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/platform-api/keys/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate" }),
      });
      const json = (await res.json()) as {
        data?: { secret: string };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed");
        return;
      }
      setSecretOpen(json.data?.secret ?? null);
      toast.success("Key rotated — old secret revoked instantly");
      await loadCore();
    } finally {
      setPending(false);
    }
  }

  async function revokeKey(id: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/platform-api/keys/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message: string } };
        toast.error(json.error?.message ?? "Failed");
        return;
      }
      setRevokeTarget(null);
      toast.success("API key revoked — slot freed");
      await loadCore();
    } finally {
      setPending(false);
    }
  }

  async function createWebhook() {
    setPending(true);
    try {
      const res = await fetch("/api/platform-api/webhooks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: whUrl }),
      });
      const json = (await res.json()) as {
        data?: { secret: string };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed");
        return;
      }
      setWhOpen(false);
      setWhUrl("");
      setWhSecret(json.data?.secret ?? null);
      toast.success("Webhook created");
      await loadCore();
    } finally {
      setPending(false);
    }
  }

  async function deleteWebhook(id: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/platform-api/webhooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Failed to disable webhook");
        return;
      }
      toast.success("Webhook disabled");
      await loadCore();
    } finally {
      setPending(false);
    }
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  function closeSecretDialog() {
    setSecretOpen(null);
  }

  if (loading && !overview) {
    return (
      <HubPageShell maxWidth="xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-36 shrink-0 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </HubPageShell>
    );
  }

  if (!overview?.allowed) {
    return (
      <HubPageShell maxWidth="md">
        <EmptyState
          icon={<KeyRound className="size-6" />}
          title="Platform API"
          description={
            overview?.gateMessage ??
            "API access is exclusively available for Seller and Reseller accounts."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href="/app/become-seller">
                  <Store className="size-4" /> Become a Reseller
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/developers">
                  <BookOpen className="size-4" /> Public docs
                </Link>
              </Button>
            </div>
          }
        />
      </HubPageShell>
    );
  }

  const stats = overview.stats;
  const activeWebhooks = webhooks.filter((w) => w.status === "ACTIVE");
  const tabCounts: Record<HubTab, number | null> = {
    overview: null,
    credential: credentials.length,
    calls: usageTotal,
    purchases: purchasesTotal,
    webhooks: activeWebhooks.length,
  };

  return (
    <HubPageShell maxWidth="xl">
      <HubHeaderBar
        icon={<KeyRound />}
        title="Platform API"
        description={
          overview.isPremium
            ? `Up to ${overview.maxKeysPerUser} API keys per account · 300 RPM · 0% API Fee (VIP)`
            : `Up to ${overview.maxKeysPerUser} API keys per account · ${overview.defaultRateLimitRpm} RPM · ${overview.purchaseFeePercent}% API Fee`
        }
        stats={[
          {
            label: "Balance",
            value: formatMoney(overview.walletBalanceMicrocents),
            tone: "success",
          },
          {
            label: "Calls 24h",
            value: String(stats?.requests24h ?? 0),
          },
          {
            label: "Success",
            value: `${stats?.successRate24h ?? 100}%`,
            tone: (stats?.errors24h ?? 0) > 0 ? "default" : "success",
          },
          {
            label: "Purchases",
            value: String(purchasesTotal || stats?.purchasesAll || 0),
          },
        ]}
        statsLabel="API summary"
        actions={
          <Button
            size="icon"
            variant="outline"
            disabled={pending || loading}
            aria-label="Refresh"
            onClick={() => void refreshAll()}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        }
      />

      <div className="flex gap-2">
        <Button
          className="h-11 flex-1 sm:h-9 sm:flex-none"
          disabled={atKeyLimit}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" /> Create API key
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 flex-1 sm:h-9 sm:flex-none"
        >
          <Link href="/developers" target="_blank" rel="noreferrer">
            <BookOpen className="size-4" />
            Docs
            <ExternalLink className="size-3.5 opacity-70" />
          </Link>
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as HubTab)}
        className="gap-4"
      >
        <div className="-mx-4 px-4 pb-0.5 sm:mx-0 sm:px-0">
          <FilterChipRow role="tablist" aria-label="API hub sections">
            {HUB_TABS.map((t) => {
              const active = tab === t.id;
              const count = tabCounts[t.id];
              return (
                <FilterChip
                  key={t.id}
                  active={active}
                  onClick={() => setTab(t.id)}
                  className="h-10 px-4 text-sm"
                >
                  {t.label}
                  {count != null ? (
                    <Badge
                      variant={active ? "secondary" : "outline"}
                      className={cn(
                        "ml-1.5 h-4 min-w-4 justify-center px-1 text-[10px]",
                        active &&
                          "border-transparent bg-primary-foreground/20 text-primary-foreground"
                      )}
                    >
                      {count}
                    </Badge>
                  ) : null}
                </FilterChip>
              );
            })}
          </FilterChipRow>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-4">
          <p className="rounded-xl bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground ring-1 ring-foreground/8">
            Up to {overview.maxKeysPerUser} API keys per account. Product &amp;
            pricing checks are{" "}
            <Link
              href="/developers#quick-start"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              public — no key
            </Link>
            .{" "}
            {overview.isPremium || overview.purchaseFeePercent === 0 ? (
              <span className="font-semibold text-emerald-400">
                0% API fee (VIP Premium active)
              </span>
            ) : (
              `Buys add a ${overview.purchaseFeePercent}% developer fee`
            )}
            . Copy duration{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
              apiCode
            </code>{" "}
            from Purchases or{" "}
            <Link
              href="/developers#codes"
              className="underline-offset-2 hover:underline"
            >
              docs
            </Link>
            .
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <QuickStat
              label="Avg latency 24h"
              value={
                stats?.avgDurationMs24h ? `${stats.avgDurationMs24h} ms` : "—"
              }
              icon={<Zap className="size-4 text-primary" />}
            />
            <QuickStat
              label="Rate limited 24h"
              value={String(stats?.rateLimited24h ?? 0)}
              icon={<AlertTriangle className="size-4 text-amber-500" />}
            />
            <QuickStat
              label="API spend"
              value={formatMoney(stats?.spendAllMicrocents ?? 0)}
              icon={<Package className="size-4 text-success" />}
            />
            <QuickStat
              label="API fees"
              value={formatMoney(stats?.feesAllMicrocents ?? 0)}
              icon={<ShoppingBag className="size-4 text-primary" />}
            />
            <QuickStat
              label="API keys"
              value={`${credentials.length} / ${maxKeys}`}
              icon={<ShieldCheck className="size-4 text-primary" />}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Panel
              title="Recent calls"
              action={
                <Button
                  variant="ghost"
                  className="h-9 px-3 text-sm"
                  onClick={() => setTab("calls")}
                >
                  View all
                  <ChevronRight className="size-4" />
                </Button>
              }
            >
              {usage.length === 0 ? (
                <EmptyRow text="No API calls yet. Open docs to try the live tester." />
              ) : (
                <ul className="divide-y divide-border/40">
                  {usage.slice(0, 5).map((u) => (
                    <CallRow
                      key={u.id}
                      item={u}
                      onClick={() => setCallDetail(u)}
                    />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Recent purchases"
              action={
                <Button
                  variant="ghost"
                  className="h-9 px-3 text-sm"
                  onClick={() => setTab("purchases")}
                >
                  View all
                  <ChevronRight className="size-4" />
                </Button>
              }
            >
              {purchases.length === 0 ? (
                <EmptyRow text="No API purchases yet." />
              ) : (
                <ul className="divide-y divide-border/40">
                  {purchases.slice(0, 5).map((p) => (
                    <PurchaseRow
                      key={p.id}
                      item={p}
                      onClick={() => setPurchaseDetail(p)}
                    />
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-11"
              disabled={atKeyLimit}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" /> Create API key
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setWhOpen(true)}
            >
              <Webhook className="size-4" /> Webhook
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="credential" className="mt-0 space-y-3">
          {credentials.length === 0 ? (
            <EmptyState
              icon={<KeyRound className="size-6" />}
              title="No API key yet"
              description="Create a key to call private /api/v1 endpoints."
              action={
                <Button
                  className="h-11 px-5"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="size-4" /> Create API key
                </Button>
              }
            />
          ) : (
            credentials.map((credential) => (
              <Card
                key={credential.id}
                className="overflow-hidden ring-1 ring-foreground/10"
              >
                <div className="border-b bg-muted/30 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="truncate text-base font-semibold">
                          {credential.name}
                        </h2>
                        <Badge variant="secondary" className="text-[10px]">
                          {credential.mode}
                        </Badge>
                        <Badge variant="default" className="text-[10px]">
                          {credential.status}
                        </Badge>
                      </div>
                      <p className="font-mono text-sm text-muted-foreground">
                        {credential.keyPrefix}
                      </p>
                    </div>
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <KeyRound className="size-5" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <MetaGrid
                    rows={[
                      [
                        "Created",
                        new Date(credential.createdAt).toLocaleString(),
                      ],
                      [
                        "Last used",
                        credential.lastUsedAt
                          ? formatRelative(credential.lastUsedAt)
                          : "Never",
                      ],
                      [
                        "RPM",
                        String(
                          credential.rateLimitRpm ??
                            overview.defaultRateLimitRpm
                        ),
                      ],
                      [
                        "IP allowlist",
                        credential.ipAllowlist.length
                          ? credential.ipAllowlist.join(", ")
                          : "Any",
                      ],
                    ]}
                  />

                  <div className="space-y-1.5">
                    <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                      Scopes
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {credential.scopes.map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Rotate replaces the secret instantly — the old key stops
                    working. Revoke frees a slot so you can create a new key.
                  </p>

                  <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                    <Button
                      variant="outline"
                      className="h-11 flex-1 sm:h-9 sm:flex-none"
                      onClick={() => copy(credential.keyPrefix)}
                    >
                      <Copy className="size-4" /> Copy prefix
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 flex-1 sm:h-9 sm:flex-none"
                      disabled={pending}
                      onClick={() => void rotateKey(credential.id)}
                    >
                      <RefreshCw className="size-4" /> Rotate
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-11 flex-1 sm:h-9 sm:flex-none"
                      disabled={pending}
                      onClick={() => setRevokeTarget(credential)}
                    >
                      <Trash2 className="size-4" /> Revoke
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="h-11 flex-1 sm:h-9 sm:flex-none"
                    >
                      <Link href="/developers" target="_blank" rel="noreferrer">
                        <BookOpen className="size-4" /> Docs
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="calls" className="mt-0 space-y-3">
          <div className="pb-0.5" role="tablist" aria-label="Call filters">
            <FilterChipRow>
              {(
                [
                  ["all", "All"],
                  ["ok", "OK"],
                  ["error", "Errors"],
                  ["purchases", "Purchases"],
                ] as const
              ).map(([id, label]) => (
                <FilterChip
                  key={id}
                  active={usageFilter === id}
                  onClick={() => changeUsageFilter(id)}
                >
                  {label}
                </FilterChip>
              ))}
            </FilterChipRow>
          </div>

          <div
            className={cn(
              "overflow-hidden rounded-xl ring-1 ring-foreground/10",
              listPending && "opacity-70"
            )}
          >
            {usage.length === 0 ? (
              <EmptyRow text="No matching calls." />
            ) : (
              <ul className="divide-y divide-border/40">
                {usage.map((u) => (
                  <CallRow
                    key={u.id}
                    item={u}
                    onClick={() => setCallDetail(u)}
                    detailed
                  />
                ))}
              </ul>
            )}
          </div>

          {usageHasMore ? (
            <Button
              variant="outline"
              className="h-11 w-full"
              disabled={listPending}
              onClick={() =>
                startListTransition(() => {
                  void loadUsage(usagePage + 1, usageFilter, true);
                })
              }
            >
              {listPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Load more"
              )}
            </Button>
          ) : null}
        </TabsContent>

        <TabsContent value="purchases" className="mt-0 space-y-3">
          <p className="text-xs text-muted-foreground">
            Via{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
              POST /api/v1/orders
            </code>
            . Tap a row for details or copy the duration apiCode inline.
          </p>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            {purchases.length === 0 ? (
              <EmptyRow text="No API purchases yet." />
            ) : (
              <ul className="divide-y divide-border/40">
                {purchases.map((p) => (
                  <PurchaseRow
                    key={p.id}
                    item={p}
                    onClick={() => setPurchaseDetail(p)}
                    detailed
                    showCopyCode
                  />
                ))}
              </ul>
            )}
          </div>
          {purchasesHasMore ? (
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={() => void loadPurchases(purchasesPage + 1, true)}
            >
              Load more
            </Button>
          ) : null}
        </TabsContent>

        <TabsContent value="webhooks" className="mt-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                order.fulfilled
              </span>{" "}
              · X-Drip-Signature
            </p>
            <Button
              variant="outline"
              className="h-11 w-full shrink-0 sm:h-9 sm:w-auto"
              onClick={() => setWhOpen(true)}
            >
              <Plus className="size-4" /> Add
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            {activeWebhooks.length === 0 ? (
              <EmptyRow text="No active webhooks." />
            ) : (
              <ul className="divide-y divide-border/40">
                {activeWebhooks.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center gap-2 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium">{w.url}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {w.secretPrefix}
                        {w.failCount > 0 ? ` · ${w.failCount} fails` : ""}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-10 shrink-0 text-destructive"
                      disabled={pending}
                      aria-label="Disable webhook"
                      onClick={() => void deleteWebhook(w.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create credential */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[min(92dvh,640px)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b bg-muted/40 px-5 py-4 pr-12 sm:px-6">
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Up to {overview.maxKeysPerUser} keys per account. Secret is shown
              once.{" "}
              {overview.isPremium ? (
                <span className="text-emerald-400 font-medium">
                  VIP: 300 RPM rate limit &amp; 0% purchase fee.
                </span>
              ) : (
                `Rate limit capped at ${overview.defaultRateLimitRpm} RPM.`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(55dvh,420px)] space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Sandbox mode</Label>
              <Switch
                checked={form.mode === "SANDBOX"}
                disabled={!overview.sandboxEnabled}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, mode: v ? "SANDBOX" : "LIVE" }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="space-y-2">
                {ALL_SCOPES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.scopes.includes(s)}
                      onCheckedChange={(checked) => {
                        setForm((f) => ({
                          ...f,
                          scopes: checked
                            ? [...f.scopes, s]
                            : f.scopes.filter((x) => x !== s),
                        }));
                      }}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>IP allowlist (optional)</Label>
              <Input
                placeholder="1.2.3.4, 5.6.7.8"
                value={form.ipAllowlist}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ipAllowlist: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Custom RPM (optional)</Label>
              <Input
                type="number"
                min={1}
                max={overview.defaultRateLimitRpm}
                value={form.rateLimitRpm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rateLimitRpm: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="border-t px-5 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || atKeyLimit}
              onClick={() => void createKey()}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
      >
        <DialogContent className="max-h-[min(92dvh,640px)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b bg-muted/40 px-5 py-4 pr-12 sm:px-6">
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>
              This frees a key slot immediately. The key will stop working and
              you can create a new one.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t px-5 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !revokeTarget}
              onClick={() => revokeTarget && void revokeKey(revokeTarget.id)}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call detail */}
      <Dialog
        open={!!callDetail}
        onOpenChange={(o) => !o && setCallDetail(null)}
      >
        <DialogContent className="max-h-[min(92dvh,640px)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b bg-muted/40 px-5 py-4 pr-12 sm:px-6">
            <DialogTitle className="truncate font-mono text-base">
              {callDetail?.method}{" "}
              {callDetail ? shortPath(callDetail.path) : ""}
            </DialogTitle>
            <DialogDescription>
              {callDetail
                ? new Date(callDetail.createdAt).toLocaleString()
                : ""}
            </DialogDescription>
          </DialogHeader>
          {callDetail ? (
            <div className="max-h-[min(55dvh,420px)] space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge
                  code={callDetail.statusCode}
                  errorCode={callDetail.errorCode}
                />
                {callDetail.errorCode && callDetail.errorCode !== "BUSY" ? (
                  <Badge variant="destructive">{callDetail.errorCode}</Badge>
                ) : null}
              </div>
              <MetaGrid
                rows={[
                  ["Key", `${callDetail.keyName} · ${callDetail.keyPrefix}`],
                  ["Latency", `${callDetail.durationMs} ms`],
                  [
                    "Fee",
                    callDetail.feeMicrocents > 0
                      ? formatMoney(callDetail.feeMicrocents)
                      : "—",
                  ],
                  ["Request ID", callDetail.requestId],
                  ["Full path", callDetail.path],
                ]}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => copy(callDetail.requestId)}
              >
                <Copy className="size-3.5" /> Copy request ID
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Purchase detail */}
      <Dialog
        open={!!purchaseDetail}
        onOpenChange={(o) => !o && setPurchaseDetail(null)}
      >
        <DialogContent className="max-h-[min(92dvh,640px)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b bg-muted/40 px-5 py-4 pr-12 sm:px-6">
            <DialogTitle className="flex min-w-0 items-center gap-2">
              <ShoppingBag className="size-4 shrink-0 text-primary" />
              <span className="truncate">{purchaseDetail?.productTitle}</span>
            </DialogTitle>
            <DialogDescription>
              {purchaseDetail
                ? new Date(purchaseDetail.createdAt).toLocaleString()
                : ""}
            </DialogDescription>
          </DialogHeader>
          {purchaseDetail ? (
            <div className="max-h-[min(55dvh,420px)] space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{purchaseDetail.status}</Badge>
                <Badge variant="outline">×{purchaseDetail.quantity}</Badge>
              </div>
              <MetaGrid
                rows={[
                  ["Order", purchaseDetail.orderId],
                  ["Duration code", purchaseDetail.durationApiCode ?? "—"],
                  ["Subtotal", formatMoney(purchaseDetail.subtotalMicrocents)],
                  ["API fee", formatMoney(purchaseDetail.apiFeeMicrocents)],
                  ["Total", formatMoney(purchaseDetail.totalMicrocents)],
                ]}
              />
              <div className="space-y-1.5">
                <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                  Line items
                </p>
                <ul className="divide-y rounded-lg border">
                  {purchaseDetail.items.map((it, i) => (
                    <li
                      key={`${it.productTitle}-${i}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {it.productTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {it.durationLabel}
                          {it.durationApiCode ? ` · ${it.durationApiCode}` : ""}
                        </p>
                      </div>
                      <span className="tabular-nums text-success">
                        {formatMoney(it.unitPriceMicrocents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                {purchaseDetail.durationApiCode ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => copy(purchaseDetail.durationApiCode!)}
                  >
                    <Copy className="size-3.5" /> Copy duration apiCode
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => copy(purchaseDetail.orderId)}
                >
                  <Copy className="size-3.5" /> Copy order ID
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Secret — shown once after create/rotate */}
      <Dialog
        open={!!secretOpen}
        onOpenChange={(open) => {
          if (!open) closeSecretDialog();
        }}
      >
        <DialogContent className="max-h-[min(92dvh,640px)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b bg-muted/40 px-5 py-4 pr-12 sm:px-6">
            <DialogTitle>Copy your secret</DialogTitle>
            <DialogDescription>
              This is the only time the full key is shown. Store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4 sm:px-6">
            <code className="block break-all rounded-lg bg-muted p-3 text-xs">
              {secretOpen}
            </code>
            <Button
              className="w-full"
              onClick={() => secretOpen && copy(secretOpen)}
            >
              <Copy className="size-4" /> Copy secret
            </Button>
          </div>
          <DialogFooter className="border-t px-5 py-4 sm:px-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={closeSecretDialog}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={whOpen} onOpenChange={setWhOpen}>
        <DialogContent className="max-h-[min(92dvh,640px)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b bg-muted/40 px-5 py-4 pr-12 sm:px-6">
            <DialogTitle>Add webhook</DialogTitle>
            <DialogDescription>
              Receives order.fulfilled with X-Drip-Signature HMAC.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4 sm:px-6">
            <Label>HTTPS URL</Label>
            <Input
              value={whUrl}
              onChange={(e) => setWhUrl(e.target.value)}
              placeholder="https://example.com/hooks/drip"
            />
          </div>
          <DialogFooter className="border-t px-5 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setWhOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !whUrl.trim()}
              onClick={() => void createWebhook()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!whSecret}
        onOpenChange={(open) => {
          if (!open) setWhSecret(null);
        }}
      >
        <DialogContent className="max-h-[min(92dvh,640px)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b bg-muted/40 px-5 py-4 pr-12 sm:px-6">
            <DialogTitle>Webhook signing secret</DialogTitle>
            <DialogDescription>
              Shown once — verify X-Drip-Signature.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4 sm:px-6">
            <code className="block break-all rounded-lg bg-muted p-3 text-xs">
              {whSecret}
            </code>
            <Button
              className="w-full"
              onClick={() => whSecret && copy(whSecret)}
            >
              <Copy className="size-4" /> Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </HubPageShell>
  );
}

function QuickStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/8">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card variant="list">
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-3 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="p-4 text-sm text-muted-foreground">{text}</p>;
}

function StatusBadge({
  code,
  errorCode,
}: {
  code: number;
  errorCode?: string | null;
}) {
  const isBusy = errorCode === "BUSY" || code === 429;
  const tone = isBusy ? "warn" : statusTone(code);
  return (
    <Badge
      variant={
        tone === "ok"
          ? "secondary"
          : tone === "warn"
          ? "outline"
          : "destructive"
      }
      className={cn(
        "tabular-nums",
        tone === "ok" && "bg-success/15 text-success",
        tone === "warn" &&
          "border-amber-500/40 text-amber-600 dark:text-amber-400"
      )}
    >
      {isBusy ? "BUSY" : code}
    </Badge>
  );
}

function CallRow({
  item,
  onClick,
  detailed,
}: {
  item: UsageItem;
  onClick: () => void;
  detailed?: boolean;
}) {
  const showErrorInSubtitle =
    item.errorCode != null && item.errorCode !== "BUSY";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
              {item.method}
            </span>
            <span className="truncate font-mono text-xs">
              {shortPath(item.path)}
            </span>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3 shrink-0" />
              {formatRelative(item.createdAt)}
            </span>
            {detailed ? (
              <>
                <span> · {item.durationMs} ms</span>
                <span> · {item.keyName}</span>
              </>
            ) : null}
            {showErrorInSubtitle ? (
              <span className="text-destructive"> · {item.errorCode}</span>
            ) : null}
            {item.feeMicrocents > 0 ? (
              <span className="text-success">
                {" "}
                · fee {formatMoney(item.feeMicrocents)}
              </span>
            ) : null}
          </p>
        </div>
        <StatusBadge code={item.statusCode} errorCode={item.errorCode} />
      </button>
    </li>
  );
}

function PurchaseRow({
  item,
  onClick,
  detailed,
  showCopyCode,
}: {
  item: PurchaseItem;
  onClick: () => void;
  detailed?: boolean;
  showCopyCode?: boolean;
}) {
  return (
    <li>
      <div className="flex w-full items-center gap-2.5 px-3 py-2.5">
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-colors hover:opacity-90"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <Package className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-medium">
                {item.productTitle}
              </span>
              {item.durationLabel ? (
                <Badge
                  variant="outline"
                  className="hidden h-4 shrink-0 px-1.5 text-[10px] sm:inline-flex"
                >
                  {item.durationLabel}
                </Badge>
              ) : null}
              <Badge
                variant="secondary"
                className="h-4 shrink-0 px-1.5 text-[10px]"
              >
                ×{item.quantity}
              </Badge>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {formatRelative(item.createdAt)}
              {item.durationApiCode ? (
                <span className="font-mono"> · {item.durationApiCode}</span>
              ) : null}
              {detailed && item.apiFeeMicrocents > 0
                ? ` · fee ${formatMoney(item.apiFeeMicrocents)}`
                : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <p className="text-sm font-semibold tabular-nums text-success">
              {formatMoney(item.totalMicrocents)}
            </p>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </div>
        </button>
        {showCopyCode && item.durationApiCode ? (
          <Button
            size="icon"
            variant="ghost"
            className="size-10 shrink-0"
            aria-label="Copy duration apiCode"
            onClick={(e) => {
              e.stopPropagation();
              void navigator.clipboard.writeText(item.durationApiCode!);
              toast.success("Copied apiCode");
            }}
          >
            <Copy className="size-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function MetaGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-2 rounded-lg bg-muted/20 p-3 text-sm ring-1 ring-foreground/8">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-xs text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-all text-right text-xs font-medium">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}
