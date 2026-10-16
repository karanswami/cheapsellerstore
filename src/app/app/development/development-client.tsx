"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, AlertTriangle, Check, Code2, Copy, KeyRound, Loader2, Plus, RefreshCw, Trash2, Webhook } from "lucide-react";
import { EmptyState, Panel, formatDate } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";
import type { ApiKeyPublic } from "@/lib/seller-api/keys";
import { cn } from "@/lib/utils";

type Overview = {
  allowed: boolean;
  gateMessage: string | null;
  defaultRateLimitRpm: number;
  maxKeysPerUser: number;
  sandboxEnabled: boolean;
  walletBalanceMicrocents: number;
  activeKeys: number;
  stats: {
    requests24h: number;
    requests7d: number;
    errors24h: number;
    rateLimited24h: number;
    successRate24h: number;
    avgDurationMs24h: number;
    purchases24h: number;
    purchasesAll: number;
    spendAllMicrocents: number;
  } | null;
};

type Hook = { id: string; url: string; secretPrefix: string; events: string[]; status: string; failCount: number; lastDeliveryAt: string | null; createdAt: string };
type UsageRow = { id: string; method: string; path: string; statusCode: number; durationMs: number; keyName: string; createdAt: string };

const TABS = ["Overview", "Keys", "Webhooks", "Usage"] as const;
type Tab = (typeof TABS)[number];

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message ?? "Request failed.");
  return json.data as T;
}
const send = (url: string, method: string, body?: object) =>
  call<Record<string, unknown>>(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

function copy(text: string) {
  navigator.clipboard?.writeText(text);
  toast.success("Copied");
}

export function DevelopmentClient({ overview, credentials, webhooks, scopes, baseUrl }: { overview: Overview; credentials: ApiKeyPublic[]; webhooks: Hook[]; scopes: string[]; baseUrl: string }) {
  const [tab, setTab] = useState<Tab>("Overview");

  if (!overview.allowed) {
    return <EmptyState icon={AlertTriangle} title="API access isn't available" hint={overview.gateMessage ?? "Platform API is not enabled for this account."} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("h-9 shrink-0 rounded-full border px-4 text-sm font-medium", tab === t ? "border-transparent bg-brand-gradient text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" ? <OverviewTab overview={overview} baseUrl={baseUrl} /> : null}
      {tab === "Keys" ? <KeysTab overview={overview} credentials={credentials} scopes={scopes} /> : null}
      {tab === "Webhooks" ? <WebhooksTab webhooks={webhooks} /> : null}
      {tab === "Usage" ? <UsageTab /> : null}
    </div>
  );
}

function OverviewTab({ overview, baseUrl }: { overview: Overview; baseUrl: string }) {
  const s = overview.stats;
  const tiles = s
    ? [
        { label: "Requests · 24h", value: String(s.requests24h) },
        { label: "Success rate", value: `${s.successRate24h}%` },
        { label: "Avg latency", value: `${s.avgDurationMs24h} ms` },
        { label: "Purchases · all time", value: String(s.purchasesAll) },
        { label: "API spend", value: formatMoney(s.spendAllMicrocents) },
        { label: "Purchases · 24h", value: String(s.purchases24h) },
      ]
    : [];
  const snippet = `curl ${baseUrl}/balance \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border bg-card p-4">
            <p className="font-display text-2xl font-bold leading-none">{t.value}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Quick start" icon={Code2}>
          <p className="mb-3 text-sm text-muted-foreground">Authenticate every request with your key as a Bearer token.</p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{snippet}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => copy(snippet.replace(/\\\n\s*/g, ""))}>
              <Copy /> Copy cURL
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={`${baseUrl}/openapi.json`} target="_blank" rel="noreferrer">
                OpenAPI spec
              </a>
            </Button>
          </div>
        </Panel>
        <Panel title="Your limits" icon={Activity}>
          <dl className="space-y-2.5 text-sm">
            <Row k="API fees" v="None" />
            <Row k="Default rate limit" v={`${overview.defaultRateLimitRpm} req / min`} />
            <Row k="Keys (active / max)" v={`${overview.activeKeys} / ${overview.maxKeysPerUser}`} />
            <Row k="Sandbox mode" v={overview.sandboxEnabled ? "Available" : "Off"} />
            <Row k="Wallet" v={formatMoney(overview.walletBalanceMicrocents)} />
          </dl>
        </Panel>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function SecretBox({ secret, onDone }: { secret: string; onDone: () => void }) {
  return (
    <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-warning">
        <AlertTriangle className="size-4" /> Copy this secret now — it won&apos;t be shown again.
      </p>
      <p className="break-all rounded-lg bg-background px-3 py-2 font-mono text-sm">{secret}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => copy(secret)}>
          <Copy /> Copy
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          <Check /> Done
        </Button>
      </div>
    </div>
  );
}

function KeysTab({ overview, credentials, scopes }: { overview: Overview; credentials: ApiKeyPublic[]; scopes: string[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"LIVE" | "SANDBOX">("LIVE");
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const full = credentials.length >= overview.maxKeysPerUser;

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {secret ? <SecretBox secret={secret} onDone={() => setSecret(null)} /> : null}
      <Panel title="Create key" icon={Plus}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. Production bot" maxLength={60} />
          <select value={mode} onChange={(e) => setMode(e.target.value as "LIVE" | "SANDBOX")} className="h-10 rounded-lg border bg-input px-3 text-sm">
            <option value="LIVE">Live</option>
            {overview.sandboxEnabled ? <option value="SANDBOX">Sandbox</option> : null}
          </select>
          <Button
            disabled={full || busy === "create"}
            onClick={() =>
              run("create", async () => {
                const r = (await send("/api/platform-api/keys", "POST", { name, mode, scopes })) as { secret: string };
                setSecret(r.secret);
                setName("");
                router.refresh();
              })
            }
          >
            {busy === "create" ? <Loader2 className="animate-spin" /> : <KeyRound />} Create
          </Button>
        </div>
        {full ? <p className="mt-2 text-xs text-muted-foreground">Key limit reached — revoke one to create another.</p> : null}
      </Panel>

      {credentials.length === 0 ? (
        <EmptyState icon={KeyRound} title="No API keys" hint="Create a key to start calling the API." />
      ) : (
        <ul className="space-y-3">
          {credentials.map((k) => (
            <li key={k.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {k.name} <Badge variant={k.mode === "LIVE" ? "success" : "warning"}>{k.mode}</Badge>
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{k.keyPrefix}••••••••</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {formatDate(k.createdAt)} · {k.lastUsedAt ? `last used ${formatDate(k.lastUsedAt, true)}` : "never used"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy === `rot-${k.id}`}
                    onClick={() =>
                      confirm("Rotate this key? The old secret stops working immediately.") &&
                      run(`rot-${k.id}`, async () => {
                        const r = (await send(`/api/platform-api/keys/${k.id}`, "POST", { action: "rotate" })) as { secret: string };
                        setSecret(r.secret);
                        router.refresh();
                      })
                    }
                  >
                    <RefreshCw /> Rotate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy === `rev-${k.id}`}
                    onClick={() =>
                      confirm("Revoke this key permanently?") &&
                      run(`rev-${k.id}`, async () => {
                        await send(`/api/platform-api/keys/${k.id}`, "POST", { action: "revoke" });
                        toast.success("Key revoked.");
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 /> Revoke
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {k.scopes.map((s) => (
                  <Badge key={s} variant="muted">
                    {s}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WebhooksTab({ webhooks }: { webhooks: Hook[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {secret ? <SecretBox secret={secret} onDone={() => setSecret(null)} /> : null}
      <Panel title="Add webhook" icon={Webhook}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhooks/store" />
          <Button
            disabled={!url.trim() || busy === "add"}
            onClick={() =>
              run("add", async () => {
                const r = (await send("/api/platform-api/webhooks", "POST", { url: url.trim() })) as { secret: string };
                setSecret(r.secret);
                setUrl("");
                router.refresh();
              })
            }
          >
            {busy === "add" ? <Loader2 className="animate-spin" /> : <Plus />} Add
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">We POST signed JSON to this URL when an API order is fulfilled.</p>
      </Panel>
      {webhooks.length === 0 ? (
        <EmptyState icon={Webhook} title="No webhooks" hint="Add an endpoint to be notified about fulfilled orders." />
      ) : (
        <ul className="space-y-3">
          {webhooks.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm">{w.url}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <Badge variant={w.status === "ACTIVE" ? "success" : "muted"}>{w.status}</Badge> · {w.events.join(", ")} · {w.failCount} failures ·{" "}
                  {w.lastDeliveryAt ? `last delivery ${formatDate(w.lastDeliveryAt, true)}` : "no deliveries"}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={busy === w.id}
                onClick={() =>
                  confirm("Delete this webhook?") &&
                  run(w.id, async () => {
                    await call(`/api/platform-api/webhooks/${w.id}`, { method: "DELETE" });
                    router.refresh();
                  })
                }
              >
                <Trash2 /> Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UsageTab() {
  const [filter, setFilter] = useState<"all" | "ok" | "error" | "purchases">("all");
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number, f: string) => {
    try {
      const d = await call<{ items: UsageRow[]; hasMore: boolean }>(`/api/platform-api/usage?page=${p}&limit=20&filter=${f}`);
      setRows((prev) => (p === 1 ? d.items : [...prev, ...d.items]));
      setHasMore(d.hasMore);
      setPage(p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load usage.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial page; later loads are triggered from handlers.
  useEffect(() => {
    let alive = true;
    call<{ items: UsageRow[]; hasMore: boolean }>("/api/platform-api/usage?page=1&limit=20&filter=all")
      .then((d) => {
        if (!alive) return;
        setRows(d.items);
        setHasMore(d.hasMore);
      })
      .catch(() => toast.error("Could not load usage."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  function fetchFilter(f: typeof filter) {
    setFilter(f);
    setLoading(true);
    load(1, f);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "ok", "error", "purchases"] as const).map((f) => (
          <button key={f} onClick={() => fetchFilter(f)} className={cn("h-9 rounded-full border px-4 text-sm font-medium capitalize", filter === f ? "border-transparent bg-brand-gradient text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {f}
          </button>
        ))}
      </div>
      {rows.length === 0 && !loading ? (
        <EmptyState icon={Activity} title="No requests yet" hint="Calls made with your API keys will be logged here." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-3 text-sm">
              <Badge variant={r.statusCode < 400 ? "success" : "destructive"}>{r.statusCode}</Badge>
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{r.method}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{r.path}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{r.durationMs} ms</span>
              <span className="text-xs text-muted-foreground">{formatDate(r.createdAt, true)}</span>
            </li>
          ))}
        </ul>
      )}
      {loading ? <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /> : null}
      {hasMore && !loading ? (
        <div className="text-center">
          <Button variant="secondary" onClick={() => { setLoading(true); load(page + 1, filter); }}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
