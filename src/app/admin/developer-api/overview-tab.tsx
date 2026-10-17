"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, CheckCircle2, Clock, Code2, KeyRound, Route, ShieldAlert, TrendingDown, TrendingUp, Users, Zap } from "lucide-react";
import { EmptyState, Panel, formatDate } from "@/components/app-ui";
import { StatCard, TableSkeleton } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HttpStatus, Meter, MethodBadge, compact, nf, timeAgo } from "./shared";

export type Overview = {
  kpis: {
    requests24h: number;
    requestsPrev24h: number;
    errors24h: number;
    rateLimited24h: number;
    successRate: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    activeKeys: number;
    sandboxKeys: number;
    revokedKeys: number;
    developers: number;
    disabledDevs: number;
    activeDevs24h: number;
  };
  series: { t: string; ok: number; errors: number; limited: number }[];
  topEndpoints: { method: string; path: string; count: number; errors: number; avgMs: number }[];
  topDevelopers: { userId: string; username: string; role: string; count: number; errors: number }[];
  recentErrors: { id: string; method: string; path: string; statusCode: number; errorCode: string | null; username: string; keyPrefix: string; createdAt: string }[];
  truncated: boolean;
};

function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0 && now === 0) return <span>No traffic yet</span>;
  if (prev === 0) return <span className="text-success">New traffic vs. yesterday</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1", up ? "text-success" : "text-warning")}>
      <Icon className="size-3" /> {up ? "+" : ""}
      {pct}% vs. previous 24h
    </span>
  );
}

export function OverviewTab({ data, onGoto }: { data: Overview | null; onGoto: (tab: string) => void }) {
  if (!data) return <TableSkeleton rows={8} />;
  const k = data.kpis;
  const chart = data.series.map((s) => ({
    hour: new Date(s.t).toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).toLowerCase().replace(" ", ""),
    Success: s.ok,
    Errors: s.errors,
    "Rate limited": s.limited,
  }));
  const maxEp = Math.max(1, ...data.topEndpoints.map((e) => e.count));
  const maxDev = Math.max(1, ...data.topDevelopers.map((d) => d.count));
  const healthy = k.successRate >= 98;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Zap} label="Requests · 24h" value={compact(k.requests24h)} hint={undefined} />
        <StatCard icon={CheckCircle2} label="Success rate" value={`${k.successRate}%`} tone={healthy ? "success" : k.successRate >= 90 ? "warning" : "destructive"} hint={`${nf.format(k.errors24h)} failed`} />
        <StatCard icon={Clock} label="Avg latency" value={k.avgLatencyMs ? `${k.avgLatencyMs} ms` : "—"} hint={k.p95LatencyMs ? `p95 ${k.p95LatencyMs} ms` : "No data yet"} tone={k.avgLatencyMs >= 800 ? "warning" : "default"} />
        <StatCard icon={Users} label="Active developers" value={k.activeDevs24h} hint={`${k.developers} with live keys`} />
      </div>
      <p className="-mt-2 px-1 text-xs text-muted-foreground">
        <Delta now={k.requests24h} prev={k.requestsPrev24h} />
        {data.truncated ? " · showing the latest 30,000 requests" : ""}
      </p>

      <Panel
        title="Traffic · last 24 hours"
        icon={Activity}
        action={
          <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" /> Success</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-destructive" /> Errors</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-warning" /> Rate limited</span>
          </div>
        }
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="gApiOk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gApiErr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--destructive)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
              <ChartTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="Success" stroke="var(--primary)" strokeWidth={2} fill="url(#gApiOk)" />
              <Area type="monotone" dataKey="Errors" stroke="var(--destructive)" strokeWidth={2} fill="url(#gApiErr)" />
              <Area type="monotone" dataKey="Rate limited" stroke="var(--warning)" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Top endpoints" icon={Route} action={<span className="text-xs text-muted-foreground">24h</span>}>
          {data.topEndpoints.length === 0 ? (
            <EmptyState icon={Route} title="No traffic yet" hint="Endpoints appear once developers start calling the API." />
          ) : (
            <ul className="space-y-3.5">
              {data.topEndpoints.map((e) => (
                <li key={`${e.method}${e.path}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <MethodBadge method={e.method} />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{e.path}</span>
                    <span className="text-sm font-semibold tabular-nums">{nf.format(e.count)}</span>
                  </div>
                  <Meter value={e.count} max={maxEp} />
                  <p className="text-[11px] text-muted-foreground">
                    avg {e.avgMs} ms{e.errors ? <span className="text-destructive"> · {e.errors} failed</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top developers" icon={Code2} action={<span className="text-xs text-muted-foreground">24h</span>}>
          {data.topDevelopers.length === 0 ? (
            <EmptyState icon={Users} title="No active developers" hint="Be the first to ship something on the API." />
          ) : (
            <ul className="space-y-3.5">
              {data.topDevelopers.map((d, i) => (
                <li key={d.userId} className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">@{d.username}</span>
                    <Badge variant="muted" shape="pill" className="capitalize">{d.role.toLowerCase()}</Badge>
                    <span className="text-sm font-semibold tabular-nums">{nf.format(d.count)}</span>
                  </div>
                  <Meter value={d.count} max={maxDev} />
                  {d.errors ? <p className="text-[11px] text-destructive">{d.errors} failed requests</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent failures"
        icon={AlertTriangle}
        action={
          <button type="button" onClick={() => onGoto("usage")} className="text-xs font-medium text-primary hover:underline">
            Open request log
          </button>
        }
      >
        {data.recentErrors.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="All clear" hint="No failed API requests recorded." />
        ) : (
          <ul className="divide-y">
            {data.recentErrors.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                <HttpStatus code={r.statusCode} />
                <MethodBadge method={r.method} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{r.path}</span>
                <span className="text-xs text-muted-foreground">
                  @{r.username} · {r.errorCode ?? "error"} · <span title={formatDate(r.createdAt, true)}>{timeAgo(r.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button type="button" onClick={() => onGoto("keys")} className="text-left">
          <StatCard icon={KeyRound} label="Active keys" value={k.activeKeys} hint={`${k.sandboxKeys} sandbox · ${k.revokedKeys} revoked`} />
        </button>
        <button type="button" onClick={() => onGoto("developers")} className="text-left">
          <StatCard icon={Users} label="Developers" value={k.developers} hint={k.disabledDevs ? `${k.disabledDevs} with API disabled` : "All enabled"} tone={k.disabledDevs ? "warning" : "default"} />
        </button>
        <StatCard icon={Activity} label="Rate limited · 24h" value={nf.format(k.rateLimited24h)} tone={k.rateLimited24h ? "warning" : "default"} hint="HTTP 429 responses" />
        <StatCard icon={ShieldAlert} label="Errors · 24h" value={nf.format(k.errors24h)} tone={k.errors24h ? "destructive" : "default"} hint="HTTP 4xx / 5xx" />
      </div>
    </div>
  );
}
