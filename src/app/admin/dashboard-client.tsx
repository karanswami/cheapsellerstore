"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Flag, KeyRound, Loader2, Percent, ReceiptText, ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
import { Panel, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, StatCard, adminFetch, errMsg } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, microcentsToUsd } from "@/lib/currencies";
import type { AnalyticsPayload, DashboardPayload, StatisticsPayload, StatisticsPeriod } from "@/types/admin-stats";
import { shortDateLabel } from "@/types/admin-stats";

const PERIODS: { v: StatisticsPeriod; label: string }[] = [
  { v: "today", label: "Today" },
  { v: "7", label: "7 days" },
  { v: "30", label: "30 days" },
  { v: "90", label: "90 days" },
];

export function AdminDashboardClient({
  dashboard: d,
  analytics: a,
  initialStats,
}: {
  dashboard: DashboardPayload;
  analytics: AnalyticsPayload;
  initialStats: StatisticsPayload;
}) {
  const [period, setPeriod] = useState<StatisticsPeriod>("7");
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);

  async function changePeriod(p: StatisticsPeriod) {
    setPeriod(p);
    setLoading(true);
    try {
      setStats(await adminFetch<StatisticsPayload>(`/api/admin/statistics?period=${p}`));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  const chart = stats.chart.map((c) => ({
    date: shortDateLabel(c.date),
    Sales: microcentsToUsd(c.sales),
    Profit: microcentsToUsd(c.profit),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue today" value={formatMoney(d.today.revenue)} hint={`${d.today.orders} orders`} icon={TrendingUp} tone="success" />
        <StatCard label="Revenue 7 days" value={formatMoney(d.week.revenue)} hint={`${d.week.orders} orders`} icon={ReceiptText} />
        <StatCard label="Pending payments" value={d.pendingPayments} hint={`${d.completedDepositsToday} completed today`} icon={Wallet} tone={d.pendingPayments ? "warning" : "default"} />
        <StatCard label="Open reports" value={d.openReports} hint={`${d.expiredDeposits} expired deposits`} icon={Flag} tone={d.openReports ? "destructive" : "default"} />
      </div>

      <Panel
        title="Performance"
        icon={TrendingUp}
        action={
          <div className="flex items-center gap-2">
            {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
            <Chips value={period} onChange={changePeriod} options={PERIODS} />
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Revenue" value={formatMoney(stats.revenue)} hint={`${stats.orders} orders · ${stats.buyers} buyers`} />
          <StatCard label="Gross profit" value={formatMoney(stats.grossProfit)} hint={stats.missingCost ? `${stats.missingCost} items missing cost` : "All costs set"} tone="success" />
          <StatCard label="Owner share" value={formatMoney(stats.totals.owner)} hint={`Developer ${formatMoney(stats.totals.developer)}`} />
          <StatCard label="Deposits credited" value={formatMoney(stats.depositCredit)} hint={`${stats.depositsCompleted} deposits`} icon={Percent} />
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `$${v}`} />
              <ChartTooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => `$${Number(v).toFixed(2)}`}
              />
              <Area type="monotone" dataKey="Sales" stroke="var(--primary)" strokeWidth={2} fill="url(#gSales)" />
              <Area type="monotone" dataKey="Profit" stroke="var(--success)" strokeWidth={2} fill="url(#gProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {stats.productRows.length > 0 ? (
        <Panel title="Top products" icon={ShoppingBag}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.productRows.slice(0, 10).map((r) => (
                <TableRow key={`${r.productTitle}-${r.durationLabel}`}>
                  <TableCell>
                    <span className="font-medium">{r.productTitle}</span> <span className="text-muted-foreground">· {r.durationLabel}</span>
                  </TableCell>
                  <TableCell className="text-right">{r.sold}</TableCell>
                  <TableCell className="text-right">{formatMoney(r.revenue)}</TableCell>
                  <TableCell className="text-right text-success">{formatMoney(r.profit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent orders" icon={ShoppingBag} action={<Link href="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>}>
          <ul className="divide-y">
            {d.recentOrders.length === 0 ? <li className="py-6 text-center text-sm text-muted-foreground">No orders yet.</li> : null}
            {d.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {o.productTitle} <span className="text-muted-foreground">· {o.durationLabel}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{o.username} · {formatDate(o.at, true)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold">{formatMoney(o.amount)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recent deposits" icon={Wallet} action={<Link href="/admin/deposits" className="text-xs text-primary hover:underline">View all</Link>}>
          <ul className="divide-y">
            {d.recentDeposits.length === 0 ? <li className="py-6 text-center text-sm text-muted-foreground">No deposits yet.</li> : null}
            {d.recentDeposits.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">@{x.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {x.method} · {formatDate(x.at, true)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold">{formatMoney(x.amount)}</span>
                  <StatusBadge status={x.status} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Stock" icon={KeyRound}>
          <div className="space-y-2 text-sm">
            <Row k="Available keys" v={d.stock.availableKeys} />
            <Row k="Sold keys" v={d.stock.soldKeys} />
            {a.keysByStatus.map((k) => (
              <Row key={k.name} k={k.name} v={k.count} muted />
            ))}
          </div>
        </Panel>
        <Panel title="Users" icon={Users}>
          <div className="space-y-2 text-sm">
            <Row k="Total users" v={a.totals.users} />
            {a.usersByRole.map((r) => (
              <Row key={r.name} k={r.name} v={r.count} muted />
            ))}
          </div>
        </Panel>
        <Panel title="Deposits by method" icon={Wallet}>
          <div className="space-y-2 text-sm">
            <Row k="Total deposits" v={a.totals.deposits} />
            {a.depositsByMethod.map((r) => (
              <Row key={r.name} k={r.name} v={r.count} muted />
            ))}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {a.depositsByStatus.map((s) => (
                <Badge key={s.name} variant="muted">
                  {s.name} · {s.count}
                </Badge>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: number | string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "pl-3 text-muted-foreground" : "font-medium"}>{k}</span>
      <span className={muted ? "text-muted-foreground" : "font-semibold"}>{v}</span>
    </div>
  );
}
