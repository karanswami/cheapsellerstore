"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import {
  AdminChartCard,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/admin/stats/admin-chart-card";
import { KpiCard, StatSection } from "@/components/admin/stats/kpi-card";
import { useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  formatWhenCompact,
  humanStatus,
  shortDateLabel,
  type DashboardPayload,
} from "@/types/admin-stats";
import {
  AlertTriangle,
  KeyRound,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

const sparkConfig = {
  total: { label: "Revenue", color: "var(--primary)" },
};

export function OverviewWorkspace() {
  const { data, loading } = useAdminFetch<DashboardPayload>(
    "/api/admin/dashboard",
  );

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Control room"
        description="Compact health snapshot. Use the sidebar submenu or mobile menu to open detailed admin pages."
      />
      {loading || !data ? (
        <AdminListSkeleton rows={8} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <KpiCard
              label="Today orders"
              value={String(data.today.orders)}
              hint={formatMoney(data.today.revenue)}
              tone="success"
            />
            <KpiCard
              label="7-day revenue"
              value={formatMoney(data.week.revenue)}
              hint={`${data.week.orders} orders this week`}
              tone="success"
            />
            <KpiCard
              label="Pending payments"
              value={String(data.pendingPayments)}
              hint={`${data.completedDepositsToday} completed today`}
            />
            <KpiCard
              label="Open reports"
              value={String(data.openReports)}
              hint="Manual verification needed"
            />
          </div>

          {data.week.revenue > 0 ? (
            <AdminChartCard
              title="Revenue overview"
              description="Last 7 days trend."
              config={sparkConfig}
              chartClassName="h-[180px]"
            >
              <AreaChart
                data={data.sparkline}
                margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={shortDateLabel}
                  minTickGap={24}
                />
                <YAxis hide />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) =>
                        typeof v === "string" ? shortDateLabel(v) : String(v)
                      }
                      formatter={(value) => (
                        <span className="font-mono font-medium tabular-nums">
                          {formatMoney(Number(value))}
                        </span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-total)"
                  fill="var(--color-total)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </AreaChart>
            </AdminChartCard>
          ) : (
            <Card variant="summary" className="gap-0">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle>Revenue overview</CardTitle>
                <CardDescription className="mt-0.5">
                  Last 7 days trend.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
                <p className="text-sm font-medium">No sales</p>
                <p className="text-sm text-muted-foreground">No revenue yet</p>
                <p className="mt-2 max-w-sm text-xs text-muted-foreground">
                  Orders from the last 7 days will appear here automatically.
                </p>
              </CardContent>
            </Card>
          )}

          <StatSection
            title="Needs attention"
            description="Only critical admin queues."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <AttentionRow
                href="/admin/deposits"
                icon={Wallet}
                label="Payment queue"
                value={`${data.pendingPayments} pending or processing`}
                hot={data.pendingPayments > 0}
              />
              <AttentionRow
                href="/admin/reports"
                icon={AlertTriangle}
                label="Deposit reports"
                value={`${data.openReports} user reports open`}
                hot={data.openReports > 0}
              />
              <AttentionRow
                href="/admin/deposits"
                icon={Receipt}
                label="Expired deposits"
                value={`${data.expiredDeposits} expired records`}
                hot={data.expiredDeposits > 0}
              />
              <AttentionRow
                href="/admin/keys"
                icon={KeyRound}
                label="Key stock"
                value={`${data.stock.availableKeys} ready • ${data.stock.soldKeys} sold`}
              />
            </div>
          </StatSection>

          <StatSection
            title="Latest activity"
            description="Last deposits and orders only. Open full lists from navigation."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ActivityColumn
                title="Deposits"
                href="/admin/deposits"
                empty="No deposits yet."
                count={data.recentDeposits.length}
              >
                {data.recentDeposits.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-start justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        @{d.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.method.replaceAll("_", " ")} ·{" "}
                        {formatWhenCompact(d.at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium tabular-nums">
                        {formatMoney(d.amount)}
                      </p>
                      <Badge
                        variant={statusVariant(d.badge)}
                        className="mt-0.5 text-[10px]"
                      >
                        {d.badge}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ActivityColumn>

              <ActivityColumn
                title="Orders"
                href="/admin/orders"
                empty="No orders yet."
                count={data.recentOrders.length}
              >
                {data.recentOrders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-start justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {o.productTitle}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{o.username} · {o.durationLabel} ·{" "}
                        {formatWhenCompact(o.at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-success tabular-nums">
                        {formatMoney(o.amount)}
                      </p>
                      <Badge
                        variant="secondary"
                        className="mt-0.5 text-[10px]"
                      >
                        {humanStatus(o.status)}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ActivityColumn>
            </div>
          </StatSection>
        </>
      )}
    </main>
  );
}

function AttentionRow({
  href,
  icon: Icon,
  label,
  value,
  hot,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40",
        hot && "ring-primary/30",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
          hot && "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{value}</span>
      </span>
    </Link>
  );
}

function ActivityColumn({
  title,
  href,
  empty,
  count,
  children,
}: {
  title: string;
  href: string;
  empty: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <Card variant="list" className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/40 px-3 py-2.5">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Link
          href={href}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {count === 0 ? (
          <div className="px-3 py-6">
            <AdminEmptyState message={empty} />
          </div>
        ) : (
          <ul className="divide-y divide-border/40">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toUpperCase();
  if (
    s === "FAILED" ||
    s === "EXPIRED" ||
    s === "CANCELLED" ||
    s.includes("NO_CREDIT")
  ) {
    return "destructive";
  }
  if (s === "PENDING" || s === "PROCESSING") return "outline";
  if (s === "COMPLETED" || s === "PAID" || s === "FULFILLED") return "secondary";
  return "secondary";
}
