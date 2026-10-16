"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, Coins, KeyRound, Settings2, Users } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, Pager, SearchBox, StatCard, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminList, useAdminQuery, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/currencies";

export function PlatformApiTab() {
  return (
    <Tabs defaultValue="settings" className="space-y-4">
      <TabsList className="w-fit">
        <TabsTrigger value="settings">
          <Settings2 className="size-4" /> Settings
        </TabsTrigger>
        <TabsTrigger value="developers">
          <Users className="size-4" /> Developers
        </TabsTrigger>
        <TabsTrigger value="keys">
          <KeyRound className="size-4" /> Keys
        </TabsTrigger>
        <TabsTrigger value="usage">
          <Activity className="size-4" /> Usage
        </TabsTrigger>
        <TabsTrigger value="margin">
          <Coins className="size-4" /> Margin
        </TabsTrigger>
      </TabsList>
      <TabsContent value="settings">
        <ApiSettings />
      </TabsContent>
      <TabsContent value="developers">
        <Developers />
      </TabsContent>
      <TabsContent value="keys">
        <ApiKeys />
      </TabsContent>
      <TabsContent value="usage">
        <Usage />
      </TabsContent>
      <TabsContent value="margin">
        <Margin />
      </TabsContent>
    </Tabs>
  );
}

type ApiSettings = {
  platformEnabled: boolean;
  allowedRoles: { user: boolean; seller: boolean; reseller: boolean; admin: boolean };
  purchaseFeePercent: number;
  defaultRateLimitRpm: number;
  burstLimit: number;
  maxKeysPerUser: number;
  sandboxEnabled: boolean;
};

function ApiSettings() {
  const { data } = useAdminQuery<ApiSettings>("/api/admin/seller-api/settings");
  return data ? <ApiSettingsForm initial={data} /> : <TableSkeleton rows={4} />;
}

function ApiSettingsForm({ initial }: { initial: ApiSettings }) {
  const [s, setS] = useState<ApiSettings>(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const { platformEnabled, allowedRoles, purchaseFeePercent, defaultRateLimitRpm, burstLimit, maxKeysPerUser, sandboxEnabled } = s;
      await adminFetch("/api/admin/seller-api/settings", {
        method: "PATCH",
        json: { platformEnabled, allowedRoles, purchaseFeePercent, defaultRateLimitRpm, burstLimit, maxKeysPerUser, sandboxEnabled },
      });
      toast.success("API settings saved.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  const num = (k: "purchaseFeePercent" | "defaultRateLimitRpm" | "burstLimit" | "maxKeysPerUser") => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });

  return (
    <div className="grid max-w-2xl gap-4 rounded-xl border bg-card p-4">
      <ToggleRow label="Platform API enabled" hint="Master switch for /api/v1." checked={s.platformEnabled} onChange={(v) => setS({ ...s, platformEnabled: v })} />
      <ToggleRow label="Sandbox mode available" checked={s.sandboxEnabled} onChange={(v) => setS({ ...s, sandboxEnabled: v })} />
      <div>
        <p className="mb-2 text-sm font-medium">Roles allowed to create keys</p>
        <div className="flex flex-wrap gap-4">
          {(["user", "seller", "reseller", "admin"] as const).map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm capitalize">
              <Checkbox checked={s.allowedRoles[r]} onCheckedChange={(v) => setS({ ...s, allowedRoles: { ...s.allowedRoles, [r]: v === true } })} /> {r}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Purchase fee (%)" hint="Developer margin added on API purchases.">
          <Input type="number" min="0" step="0.1" value={s.purchaseFeePercent} onChange={num("purchaseFeePercent")} />
        </Field>
        <Field label="Max keys per user">
          <Input type="number" min="1" value={s.maxKeysPerUser} onChange={num("maxKeysPerUser")} />
        </Field>
        <Field label="Default rate limit (req/min)">
          <Input type="number" min="1" value={s.defaultRateLimitRpm} onChange={num("defaultRateLimitRpm")} />
        </Field>
        <Field label="Burst limit">
          <Input type="number" min="1" value={s.burstLimit} onChange={num("burstLimit")} />
        </Field>
      </div>
      <div>
        <SubmitButton busy={busy} onClick={save}>
          Save settings
        </SubmitButton>
      </div>
    </div>
  );
}

type Developer = {
  id: string;
  username: string;
  email: string;
  role: string;
  apiEnabled: boolean;
  banned: boolean;
  credentials: { id: string; keyPrefix: string; mode: string }[];
  lastUsedAt: string | null;
};

function Developers() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<Developer>("/api/admin/seller-api/developers", "items", { page, limit: 20, status, q: dq });
  const [toggle, setToggle] = useState<Developer | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ v: "all", label: "All" }, { v: "active", label: "Has key" }, { v: "none", label: "No key" }, { v: "disabled", label: "API disabled" }]} />
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Username or email…" />
      </div>
      <div className="rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="No developers" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Keys</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>API</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <p className="text-sm font-medium">@{d.username}</p>
                    <p className="text-xs text-muted-foreground">{d.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted">{d.role}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{d.credentials.map((c) => c.keyPrefix).join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.lastUsedAt ? formatDate(d.lastUsedAt, true) : "Never"}</TableCell>
                  <TableCell>
                    <Button variant={d.apiEnabled ? "secondary" : "destructive"} size="sm" onClick={() => setToggle(d)}>
                      {d.apiEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={20} total={list.total} onPage={setPage} loading={list.loading} />
      <ConfirmDialog
        open={!!toggle}
        onOpenChange={(o) => !o && setToggle(null)}
        title={toggle?.apiEnabled ? `Disable API for @${toggle?.username}?` : `Enable API for @${toggle?.username}?`}
        description={toggle?.apiEnabled ? "Their keys stop working immediately." : undefined}
        confirmLabel={toggle?.apiEnabled ? "Disable" : "Enable"}
        destructive={toggle?.apiEnabled}
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/users/${toggle!.id}`, { method: "PATCH", json: { apiEnabled: !toggle!.apiEnabled } });
            toast.success("Updated.");
            list.reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

type ApiKey = { id: string; name: string; keyPrefix: string; mode: string; status: string; rateLimitRpm: number | null; lastUsedAt: string | null; createdAt: string; user: { username: string; email: string } };

function ApiKeys() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<ApiKey>("/api/admin/seller-api/keys", "keys", { page, limit: 20, q: dq });
  return (
    <div className="space-y-4">
      <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Key name, prefix or user…" />
      <div className="rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={KeyRound} title="No API keys" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{k.keyPrefix}…</p>
                  </TableCell>
                  <TableCell className="text-sm">@{k.user.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{k.mode}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={k.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{k.lastUsedAt ? formatDate(k.lastUsedAt, true) : "Never"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={20} total={list.total} onPage={setPage} loading={list.loading} />
    </div>
  );
}

type UsageRow = { id: string; method: string; path: string; statusCode: number; feeMicrocents: number; durationMs: number | null; errorCode: string | null; username: string; keyPrefix: string; createdAt: string };

function Usage() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<UsageRow>("/api/admin/seller-api/usage", "items", { page, limit: 20, filter, q: dq });
  const [kpis, setKpis] = useState<{ requests24h: number; rateLimited24h: number; developerMargin24h: number } | null>(null);
  useEffect(() => {
    adminFetch<{ kpis: NonNullable<typeof kpis> }>("/api/admin/seller-api/usage?limit=1")
      .then((d) => setKpis(d.kpis))
      .catch(() => {});
  }, []);
  return (
    <div className="space-y-4">
      {kpis ? (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Requests 24h" value={kpis.requests24h} />
          <StatCard label="Rate limited 24h" value={kpis.rateLimited24h} tone={kpis.rateLimited24h ? "warning" : "default"} />
          <StatCard label="Margin 24h" value={formatMoney(kpis.developerMargin24h)} tone="success" />
        </div>
      ) : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips value={filter} onChange={(v) => { setFilter(v); setPage(1); }} options={[{ v: "all", label: "All" }, { v: "ok", label: "OK" }, { v: "error", label: "Errors" }, { v: "busy", label: "429" }, { v: "purchases", label: "Purchases" }]} />
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Path, user or key prefix…" />
      </div>
      <div className="rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Activity} title="No requests" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.createdAt, true)}</TableCell>
                  <TableCell className="max-w-64 truncate font-mono text-xs">
                    <span className="font-semibold">{r.method}</span> {r.path}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.statusCode < 400 ? "success" : r.statusCode === 429 ? "warning" : "destructive"}>{r.statusCode}</Badge>
                    {r.errorCode ? <span className="ml-1 text-xs text-muted-foreground">{r.errorCode}</span> : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    @{r.username} <span className="font-mono text-xs text-muted-foreground">{r.keyPrefix}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm">{r.feeMicrocents ? formatMoney(r.feeMicrocents) : "—"}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{r.durationMs != null ? `${r.durationMs}ms` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={20} total={list.total} onPage={setPage} loading={list.loading} />
    </div>
  );
}

type MarginPayload = {
  feePercentLabel: string;
  todayMargin: number;
  last7Margin: number;
  pendingDays: number;
  pendingMargin: number;
  paidMargin: number;
  totalRows: number;
  pageCount: number;
  rows: { dateKey: string; purchases: number; marginMicrocents: number; status: "PENDING" | "PAID"; paidAt: string | null }[];
};

function Margin() {
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useAdminQuery<MarginPayload>(`/api/admin/seller-api/developer-margin?page=${page}`);
  const [pay, setPay] = useState<string[] | null>(null);
  return (
    <div className="space-y-4">
      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Today" value={formatMoney(data.todayMargin)} hint={`Fee ${data.feePercentLabel}`} />
          <StatCard label="Last 7 days" value={formatMoney(data.last7Margin)} />
          <StatCard label="Pending" value={formatMoney(data.pendingMargin)} hint={`${data.pendingDays} days`} tone="warning" />
          <StatCard label="Paid out" value={formatMoney(data.paidMargin)} tone="success" />
        </div>
      ) : null}
      <div className="rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows ?? []).map((r) => (
                <TableRow key={r.dateKey}>
                  <TableCell>{r.dateKey}</TableCell>
                  <TableCell className="text-right">{r.purchases}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(r.marginMicrocents)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "PENDING" ? (
                      <Button size="sm" variant="secondary" onClick={() => setPay([r.dateKey])}>
                        Mark paid
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={data ? Math.max(1, Math.ceil(data.totalRows / data.pageCount)) : 10} total={data?.totalRows ?? 0} onPage={setPage} loading={loading} />
      <ConfirmDialog
        open={!!pay}
        onOpenChange={(o) => !o && setPay(null)}
        title="Mark margin as paid?"
        description={pay ? `Day ${pay.join(", ")} will be recorded as paid out.` : undefined}
        confirmLabel="Mark paid"
        onConfirm={async () => {
          try {
            await adminFetch("/api/admin/seller-api/developer-margin", { method: "POST", json: { dateKeys: pay } });
            toast.success("Marked paid.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}
