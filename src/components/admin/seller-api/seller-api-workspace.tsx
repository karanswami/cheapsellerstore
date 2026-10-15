"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { KpiCard } from "@/components/admin/stats/kpi-card";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatMoney } from "@/lib/currencies";
import type { ApiAllowedRoles } from "@/lib/seller-api/settings";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  KeyRound,
  Loader2,
  Settings2,
  Users,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

type Settings = {
  platformEnabled: boolean;
  allowedRoles: ApiAllowedRoles;
  purchaseFeePercent: number;
  defaultRateLimitRpm: number;
  burstLimit: number;
  maxKeysPerUser: number;
  sandboxEnabled: boolean;
};

type MarginPayload = {
  todayMargin: number;
  last7Margin: number;
  pendingDays: number;
  pendingMargin: number;
  paidDays: number;
  paidMargin: number;
  totalRows: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rows: {
    dateKey: string;
    purchases: number;
    marginMicrocents: number;
    status: "PENDING" | "PAID";
    paidAt: string | null;
  }[];
};

type UsagePayload = {
  kpis: {
    requests24h: number;
    rateLimited24h: number;
    developerMargin24h: number;
  };
  items: {
    id: string;
    method: string;
    path: string;
    statusCode: number;
    feeMicrocents: number;
    durationMs?: number;
    errorCode: string | null;
    username: string;
    keyPrefix: string;
    createdAt: string;
  }[];
  hasMore: boolean;
  page: number;
  pageCount: number;
  total: number;
};

type KeysPayload = {
  keys: {
    id: string;
    name: string;
    keyPrefix: string;
    mode: string;
    status: string;
    lastUsedAt: string | null;
    createdAt: string;
    user: { id: string; username: string; email: string; role: string };
  }[];
  hasMore: boolean;
  page: number;
  pageCount: number;
  total: number;
};

type DevelopersPayload = {
  items: {
    id: string;
    username: string;
    email: string;
    name: string;
    role: string;
    apiEnabled: boolean;
    banned: boolean;
    credentials: {
      id: string;
      keyPrefix: string;
      mode: string;
      status: string;
      lastUsedAt: string | null;
      createdAt: string;
    }[];
    lastUsedAt: string | null;
  }[];
  page: number;
  pageCount: number;
  total: number;
  hasMore: boolean;
};

type DeskTab = "developers" | "keys" | "calls" | "margin";
type EditSection = "access" | "fee" | "limits" | null;
type CallFilter = "all" | "ok" | "error" | "busy" | "purchases";
type DevStatus = "all" | "active" | "none" | "disabled";

const PAGE_SIZE = 15;

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SellerApiWorkspace() {
  const [tab, setTab] = useState<DeskTab>("developers");
  const [edit, setEdit] = useState<EditSection>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  const [devPage, setDevPage] = useState(1);
  const [devSearch, setDevSearch] = useState("");
  const [devStatus, setDevStatus] = useState<DevStatus>("all");
  const deferredDevSearch = useDeferredValue(devSearch.trim());
  const [selectedDev, setSelectedDev] = useState<
    DevelopersPayload["items"][number] | null
  >(null);

  const [keysPage, setKeysPage] = useState(1);
  const [keysSearch, setKeysSearch] = useState("");
  const deferredKeysSearch = useDeferredValue(keysSearch.trim());
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);

  const [callsPage, setCallsPage] = useState(1);
  const [callsFilter, setCallsFilter] = useState<CallFilter>("all");
  const [callsSearch, setCallsSearch] = useState("");
  const deferredCallsSearch = useDeferredValue(callsSearch.trim());
  const [selectedCall, setSelectedCall] = useState<
    UsagePayload["items"][number] | null
  >(null);

  const [marginPage, setMarginPage] = useState(1);
  const [marginSearch, setMarginSearch] = useState("");
  const deferredMarginSearch = useDeferredValue(marginSearch.trim());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: settings, loading: settingsLoading, reload: reloadSettings } =
    useAdminFetch<Settings>("/api/admin/seller-api/settings");

  const developersQuery = new URLSearchParams({
    page: String(devPage),
    limit: String(PAGE_SIZE),
    status: devStatus,
    ...(deferredDevSearch ? { q: deferredDevSearch } : {}),
  });
  const {
    data: developers,
    loading: developersLoading,
    reload: reloadDevelopers,
  } = useAdminFetch<DevelopersPayload>(
    `/api/admin/seller-api/developers?${developersQuery}`,
  );

  const keysQuery = new URLSearchParams({
    page: String(keysPage),
    limit: String(PAGE_SIZE),
    ...(deferredKeysSearch ? { q: deferredKeysSearch } : {}),
  });
  const { data: keysData, loading: keysLoading, reload: reloadKeys } =
    useAdminFetch<KeysPayload>(`/api/admin/seller-api/keys?${keysQuery}`);

  const callsQuery = new URLSearchParams({
    page: String(callsPage),
    limit: String(PAGE_SIZE),
    filter: callsFilter,
    ...(deferredCallsSearch ? { q: deferredCallsSearch } : {}),
  });
  const { data: usage, loading: usageLoading, reload: reloadUsage } =
    useAdminFetch<UsagePayload>(`/api/admin/seller-api/usage?${callsQuery}`);

  const marginQuery = new URLSearchParams({
    page: String(marginPage),
    ...(deferredMarginSearch ? { q: deferredMarginSearch } : {}),
  });
  const { data: margin, loading: marginLoading, reload: reloadMargin } =
    useAdminFetch<MarginPayload>(
      `/api/admin/seller-api/developer-margin?${marginQuery}`,
    );

  function openEdit(section: EditSection) {
    if (!settings) return;
    setDraft({ ...settings, allowedRoles: { ...settings.allowedRoles } });
    setEdit(section);
  }

  async function saveSettings() {
    if (!draft) return;
    setBusy(true);
    try {
      const result = await adminMutate("/api/admin/seller-api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          platformEnabled: draft.platformEnabled,
          allowedRoles: draft.allowedRoles,
          purchaseFeePercent: draft.purchaseFeePercent,
          defaultRateLimitRpm: draft.defaultRateLimitRpm,
          burstLimit: draft.burstLimit,
          maxKeysPerUser: draft.maxKeysPerUser,
          sandboxEnabled: draft.sandboxEnabled,
        }),
      });
      if (!result.ok) {
        toast.error(result.message ?? "Save failed");
        return;
      }
      toast.success("Settings saved");
      setEdit(null);
      reloadSettings();
    } finally {
      setBusy(false);
    }
  }

  const selectedPending = useMemo(() => {
    if (!margin) return [];
    return margin.rows.filter(
      (r) => selected.has(r.dateKey) && r.status === "PENDING",
    );
  }, [margin, selected]);

  async function markPaid() {
    if (!selectedPending.length) return;
    setBusy(true);
    try {
      const result = await adminMutate("/api/admin/seller-api/developer-margin", {
        method: "POST",
        body: JSON.stringify({
          dateKeys: selectedPending.map((r) => r.dateKey),
        }),
      });
      if (!result.ok) {
        toast.error(result.message ?? "Failed");
        return;
      }
      toast.success("Marked paid");
      setConfirmOpen(false);
      setSelected(new Set());
      reloadMargin();
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    setBusy(true);
    try {
      const result = await adminMutate(`/api/admin/seller-api/keys/${id}`, {
        method: "POST",
        body: JSON.stringify({ action: "revoke" }),
      });
      if (!result.ok) {
        toast.error(result.message ?? "Failed");
        return;
      }
      toast.success("Key revoked");
      setRevokeKeyId(null);
      setSelectedDev(null);
      reloadKeys();
      reloadDevelopers();
    } finally {
      setBusy(false);
    }
  }

  async function toggleApiEnabled(userId: string, apiEnabled: boolean) {
    setBusy(true);
    try {
      const result = await adminMutate(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ apiEnabled }),
      });
      if (!result.ok) {
        toast.error(result.message ?? "Failed");
        return;
      }
      toast.success(apiEnabled ? "API enabled" : "API disabled");
      reloadDevelopers();
      setSelectedDev((prev) =>
        prev && prev.id === userId ? { ...prev, apiEnabled } : prev,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Platform API"
        description="Active keys per developer · access, usage, and margin."
        actions={
          <Button size="sm" onClick={() => openEdit("access")} disabled={!settings}>
            <Settings2 className="size-4" />
            Settings
          </Button>
        }
      />

      {settingsLoading || !settings ? (
        <AdminListSkeleton rows={2} />
      ) : (
        <div className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40"
            onClick={() => openEdit("access")}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Access</p>
              <p className="truncate text-xs text-muted-foreground">
                {settings.platformEnabled
                  ? `On · ${Object.entries(settings.allowedRoles)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(", ")}`
                  : "Platform disabled"}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40"
            onClick={() => openEdit("fee")}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Developer margin</p>
              <p className="text-xs text-muted-foreground">
                {settings.purchaseFeePercent}% on API purchases · up to {settings.maxKeysPerUser} keys / account
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40"
            onClick={() => openEdit("limits")}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Limits & Sandbox keys</p>
              <p className="text-xs text-muted-foreground">
                {settings.defaultRateLimitRpm} RPM · burst {settings.burstLimit} ·
                sandbox {settings.sandboxEnabled ? "on" : "off"}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiCard label="Margin today" value={formatMoney(margin?.todayMargin ?? 0)} />
        <KpiCard label="Margin 7d" value={formatMoney(margin?.last7Margin ?? 0)} />
        <KpiCard
          label="Unpaid"
          value={formatMoney(margin?.pendingMargin ?? 0)}
        />
        <KpiCard
          label="Requests 24h"
          value={String(usage?.kpis.requests24h ?? 0)}
        />
      </div>

      <FilterChipRow className="px-0">
        {(
          [
            ["developers", "Developers"],
            ["keys", "Keys"],
            ["calls", "Calls"],
            ["margin", "Margin"],
          ] as const
        ).map(([id, label]) => (
          <FilterChip
            key={id}
            active={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </FilterChip>
        ))}
      </FilterChipRow>

      {tab === "developers" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-9 max-w-xs"
              placeholder="Search username / email"
              value={devSearch}
              onChange={(e) => {
                setDevSearch(e.target.value);
                setDevPage(1);
              }}
            />
            <FilterChipRow>
              {(
                [
                  ["all", "All"],
                  ["active", "Active key"],
                  ["none", "No key"],
                  ["disabled", "Disabled"],
                ] as const
              ).map(([id, label]) => (
                <FilterChip
                  key={id}
                  active={devStatus === id}
                  onClick={() => {
                    setDevStatus(id);
                    setDevPage(1);
                  }}
                >
                  {label}
                </FilterChip>
              ))}
            </FilterChipRow>
          </div>
          {developersLoading || !developers ? (
            <AdminListSkeleton rows={6} />
          ) : developers.items.length === 0 ? (
            <AdminEmptyState message="No developers yet — appear when a user creates an API key." />
          ) : (
            <div className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              {developers.items.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                  onClick={() => setSelectedDev(d)}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {d.username}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {d.role}
                      </span>
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {d.credentials.length === 0
                        ? "No active key"
                        : d.credentials.length === 1
                          ? d.credentials[0].keyPrefix
                          : `${d.credentials.length} active keys`}
                      {d.lastUsedAt ? ` · ${formatWhen(d.lastUsedAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {!d.apiEnabled ? (
                      <Badge variant="destructive">API off</Badge>
                    ) : d.credentials.length > 0 ? (
                      <Badge variant="secondary">
                        {d.credentials.length} ACTIVE
                      </Badge>
                    ) : (
                      <Badge variant="outline">NONE</Badge>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
          {developers && developers.pageCount > 1 ? (
            <Pager
              page={developers.page}
              pageCount={developers.pageCount}
              onPrev={() => setDevPage((p) => Math.max(1, p - 1))}
              onNext={() => setDevPage((p) => p + 1)}
            />
          ) : null}
        </section>
      ) : null}

      {tab === "keys" ? (
        <section className="space-y-3">
          <Input
            className="h-9 max-w-xs"
            placeholder="Search key / user"
            value={keysSearch}
            onChange={(e) => {
              setKeysSearch(e.target.value);
              setKeysPage(1);
            }}
          />
          {keysLoading || !keysData ? (
            <AdminListSkeleton rows={6} />
          ) : keysData.keys.length === 0 ? (
            <AdminEmptyState message="No API keys yet." />
          ) : (
            <div className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              {keysData.keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <KeyRound className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {k.user.username} · {k.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {k.keyPrefix} · {k.mode} · {formatWhen(k.lastUsedAt)}
                    </p>
                  </div>
                  <Badge
                    variant={k.status === "ACTIVE" ? "secondary" : "outline"}
                  >
                    {k.status}
                  </Badge>
                  {k.status === "ACTIVE" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRevokeKeyId(k.id)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {keysData && keysData.pageCount > 1 ? (
            <Pager
              page={keysData.page}
              pageCount={keysData.pageCount}
              onPrev={() => setKeysPage((p) => Math.max(1, p - 1))}
              onNext={() => setKeysPage((p) => p + 1)}
            />
          ) : null}
        </section>
      ) : null}

      {tab === "calls" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-9 max-w-xs"
              placeholder="Search path / user"
              value={callsSearch}
              onChange={(e) => {
                setCallsSearch(e.target.value);
                setCallsPage(1);
              }}
            />
            <FilterChipRow>
              {(
                [
                  ["all", "All"],
                  ["ok", "OK"],
                  ["error", "Error"],
                  ["busy", "BUSY"],
                  ["purchases", "Purchases"],
                ] as const
              ).map(([id, label]) => (
                <FilterChip
                  key={id}
                  active={callsFilter === id}
                  onClick={() => {
                    setCallsFilter(id);
                    setCallsPage(1);
                  }}
                >
                  {label}
                </FilterChip>
              ))}
            </FilterChipRow>
            <Button size="sm" variant="ghost" onClick={() => reloadUsage()}>
              Refresh
            </Button>
          </div>
          {usageLoading || !usage ? (
            <AdminListSkeleton rows={6} />
          ) : usage.items.length === 0 ? (
            <AdminEmptyState message="No API calls yet." />
          ) : (
            <div className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              {usage.items.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                  onClick={() => setSelectedCall(row)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.method}
                      </span>{" "}
                      {row.path}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.username} · {row.keyPrefix} · {formatWhen(row.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      row.statusCode >= 400
                        ? row.statusCode === 429
                          ? "outline"
                          : "destructive"
                        : "secondary"
                    }
                  >
                    {row.statusCode === 429 || row.errorCode === "BUSY"
                      ? "BUSY"
                      : row.statusCode}
                  </Badge>
                </button>
              ))}
            </div>
          )}
          {usage && usage.pageCount > 1 ? (
            <Pager
              page={usage.page}
              pageCount={usage.pageCount}
              onPrev={() => setCallsPage((p) => Math.max(1, p - 1))}
              onNext={() => setCallsPage((p) => p + 1)}
            />
          ) : null}
        </section>
      ) : null}

      {tab === "margin" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              className="h-9 w-40"
              placeholder="Search date"
              value={marginSearch}
              onChange={(e) => {
                setMarginSearch(e.target.value);
                setMarginPage(1);
              }}
            />
            <Button
              size="sm"
              disabled={!selectedPending.length}
              onClick={() => setConfirmOpen(true)}
            >
              Mark paid
            </Button>
          </div>
          {marginLoading || !margin ? (
            <AdminListSkeleton rows={5} />
          ) : margin.rows.length === 0 ? (
            <AdminEmptyState message="No API margin yet — appears when API purchases collect the fee." />
          ) : (
            <div className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              {margin.rows.map((row) => (
                <div
                  key={row.dateKey}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  {row.status === "PENDING" ? (
                    <Checkbox
                      checked={selected.has(row.dateKey)}
                      onCheckedChange={(c) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (c) next.add(row.dateKey);
                          else next.delete(row.dateKey);
                          return next;
                        });
                      }}
                    />
                  ) : (
                    <span className="size-4" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{row.dateKey}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.purchases} purchases · {formatMoney(row.marginMicrocents)}
                    </p>
                  </div>
                  <Badge variant={row.status === "PAID" ? "secondary" : "outline"}>
                    {row.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {margin && margin.pageCount > 1 ? (
            <Pager
              page={margin.page}
              pageCount={margin.pageCount}
              onPrev={() => setMarginPage((p) => Math.max(1, p - 1))}
              onNext={() => setMarginPage((p) => p + 1)}
            />
          ) : null}
        </section>
      ) : null}

      {/* Settings dialog */}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/60 bg-muted/40 px-4 py-3">
            <DialogTitle>
              {edit === "access"
                ? "Access"
                : edit === "fee"
                  ? "Developer margin"
                  : "Limits"}
            </DialogTitle>
            <DialogDescription>
              {edit === "access"
                ? "Global kill switch and role allowlist."
                : edit === "fee"
                  ? "Percent charged on Platform API purchases only."
                  : "Rate limits, key limit and sandbox."}
            </DialogDescription>
          </DialogHeader>
          {draft ? (
            <div className="max-h-[min(60dvh,420px)] space-y-4 overflow-y-auto px-4 py-4">
              {edit === "access" ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="platform-on">Platform enabled</Label>
                    <Switch
                      id="platform-on"
                      checked={draft.platformEnabled}
                      onCheckedChange={(v) =>
                        setDraft({ ...draft, platformEnabled: v })
                      }
                    />
                  </div>
                  {(
                    [
                      ["user", "USER"],
                      ["seller", "SELLER"],
                      ["reseller", "RESELLER"],
                      ["admin", "ADMIN"],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3"
                    >
                      <Label>{label}</Label>
                      <Switch
                        checked={draft.allowedRoles[key]}
                        onCheckedChange={(v) =>
                          setDraft({
                            ...draft,
                            allowedRoles: {
                              ...draft.allowedRoles,
                              [key]: v,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </>
              ) : null}
              {edit === "fee" ? (
                <div className="space-y-2">
                  <Label htmlFor="fee-pct">Purchase fee %</Label>
                  <Input
                    id="fee-pct"
                    type="number"
                    min={0}
                    max={100}
                    value={draft.purchaseFeePercent}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        purchaseFeePercent: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              ) : null}
              {edit === "limits" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="rpm">Default private RPM</Label>
                    <Input
                      id="rpm"
                      type="number"
                      min={1}
                      max={300}
                      value={draft.defaultRateLimitRpm}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          defaultRateLimitRpm: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="burst">Burst</Label>
                    <Input
                      id="burst"
                      type="number"
                      min={1}
                      value={draft.burstLimit}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          burstLimit: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-keys">Max active keys per user</Label>
                    <Input
                      id="max-keys"
                      type="number"
                      min={1}
                      max={50}
                      value={draft.maxKeysPerUser}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          maxKeysPerUser: Number(e.target.value) || 1,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Default 5. Lowering it does not revoke existing keys;
                      users just can&apos;t create more until under the limit.
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="sandbox">Sandbox keys</Label>
                    <Switch
                      id="sandbox"
                      checked={draft.sandboxEnabled}
                      onCheckedChange={(v) =>
                        setDraft({ ...draft, sandboxEnabled: v })
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="border-t border-border/60 px-4 py-3">
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveSettings()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Developer detail */}
      <Dialog
        open={!!selectedDev}
        onOpenChange={(o) => !o && setSelectedDev(null)}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/60 bg-muted/40 px-4 py-3">
            <DialogTitle>{selectedDev?.username}</DialogTitle>
            <DialogDescription>
              {selectedDev?.email} · {selectedDev?.role}
            </DialogDescription>
          </DialogHeader>
          {selectedDev ? (
            <div className="max-h-[min(60dvh,420px)] space-y-4 overflow-y-auto px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">API access</p>
                  <p className="text-xs text-muted-foreground">
                    Per-user gate (independent of role allowlist)
                  </p>
                </div>
                <Switch
                  checked={selectedDev.apiEnabled}
                  disabled={busy || selectedDev.banned}
                  onCheckedChange={(v) =>
                    void toggleApiEnabled(selectedDev.id, v)
                  }
                />
              </div>
              {selectedDev.credentials.length > 0 ? (
                <div className="space-y-2">
                  {selectedDev.credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="space-y-2 rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10"
                    >
                      <p className="font-mono text-sm">{cred.keyPrefix}</p>
                      <p className="text-xs text-muted-foreground">
                        {cred.mode} · last used {formatWhen(cred.lastUsedAt)}
                      </p>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => setRevokeKeyId(cred.id)}
                      >
                        Revoke key
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No active API key on this account.
                </p>
              )}
            </div>
          ) : null}
          <DialogFooter className="border-t border-border/60 px-4 py-3">
            <Button variant="outline" onClick={() => setSelectedDev(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call detail */}
      <Dialog
        open={!!selectedCall}
        onOpenChange={(o) => !o && setSelectedCall(null)}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/60 bg-muted/40 px-4 py-3">
            <DialogTitle>API call</DialogTitle>
            <DialogDescription>
              {selectedCall
                ? `${selectedCall.method} ${selectedCall.path}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedCall ? (
            <div className="space-y-2 px-4 py-4 text-sm">
              <Row label="User" value={selectedCall.username} />
              <Row label="Key" value={selectedCall.keyPrefix} mono />
              <Row label="Status" value={String(selectedCall.statusCode)} />
              <Row
                label="Error"
                value={selectedCall.errorCode ?? "—"}
              />
              <Row
                label="Duration"
                value={
                  selectedCall.durationMs != null
                    ? `${selectedCall.durationMs} ms`
                    : "—"
                }
              />
              <Row
                label="Fee"
                value={formatMoney(selectedCall.feeMicrocents ?? 0)}
              />
              <Row label="When" value={formatWhen(selectedCall.createdAt)} />
            </div>
          ) : null}
          <DialogFooter className="border-t border-border/60 px-4 py-3">
            <Button variant="outline" onClick={() => setSelectedCall(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <Dialog
        open={!!revokeKeyId}
        onOpenChange={(o) => !o && setRevokeKeyId(null)}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border/60 bg-muted/40 px-4 py-3">
            <DialogTitle>Revoke API key?</DialogTitle>
            <DialogDescription>
              The key stops working immediately. The user can create a new one
              later (still max one active).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-4 py-3">
            <Button variant="outline" onClick={() => setRevokeKeyId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !revokeKeyId}
              onClick={() => revokeKeyId && void revokeKey(revokeKeyId)}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark paid confirm */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border/60 bg-muted/40 px-4 py-3">
            <DialogTitle>Mark margin paid?</DialogTitle>
            <DialogDescription>
              {selectedPending.length} day(s) ·{" "}
              {formatMoney(
                selectedPending.reduce((s, r) => s + r.marginMicrocents, 0),
              )}
              . Ledger only — no wallet side effects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-4 py-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void markPaid()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Pager({
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={page <= 1}
        onClick={onPrev}
      >
        Prev
      </Button>
      <span className="text-xs text-muted-foreground">
        Page {page} / {pageCount}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= pageCount}
        onClick={onNext}
      >
        Next
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}
