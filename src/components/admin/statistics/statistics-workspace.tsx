"use client";

import {
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/currencies";
import {
  formatWhen,
  shortDateLabel,
  type StatisticsPayload,
  type StatisticsPeriod,
} from "@/types/admin-stats";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  sales: { label: "Sales", color: "var(--primary)" },
  profit: { label: "Profit", color: "var(--success)" },
};

const PERIOD_LABEL: Record<StatisticsPeriod, string> = {
  today: "Today",
  "7": "7 days",
  "30": "30 days",
  "90": "90 days",
};

export function StatisticsWorkspace() {
  const [period, setPeriod] = useState<StatisticsPeriod>("today");
  const { data, loading } = useAdminFetch<StatisticsPayload>(
    `/api/admin/statistics?period=${period}`,
  );

  const hasChartActivity = useMemo(() => {
    if (!data) return false;
    return data.chart.some((p) => p.sales > 0 || p.profit > 0);
  }, [data]);

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Statistics"
        description="Business performance — sales, profit, deposits, product winners and stock health in one mobile-first admin report."
      />

      {loading || !data ? (
        <AdminListSkeleton rows={8} />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Updated {formatWhen(data.updatedAt)}
          </p>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <KpiCard
              label="Revenue"
              value={formatMoney(data.revenue)}
              hint={`${data.orders} orders`}
              tone="success"
            />
            <KpiCard
              label="Gross profit"
              value={formatMoney(data.grossProfit)}
              hint={`${data.missingCost} missing cost`}
              tone="success"
            />
            <KpiCard
              label="Deposit credit"
              value={formatMoney(data.depositCredit)}
              hint={`${data.depositsCompleted} completed`}
            />
            <KpiCard
              label="Buyers"
              value={String(data.buyers)}
              hint={`${data.orderDepositPct}% order/deposit`}
            />
          </div>

          <StatSection
            title="Report period"
            description="Change period from directly above the statistics it filters."
            action={
              <Select
                value={period}
                onValueChange={(v) => {
                  if (
                    v === "today" ||
                    v === "7" ||
                    v === "30" ||
                    v === "90"
                  ) {
                    setPeriod(v);
                  }
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            {hasChartActivity ? (
              <AdminChartCard
                title="Sales vs profit"
                description={`${PERIOD_LABEL[period]} trend · Live data`}
                config={chartConfig}
                chartClassName="h-[180px]"
              >
                <AreaChart
                  data={data.chart}
                  margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={shortDateLabel}
                    minTickGap={28}
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
                    dataKey="sales"
                    stroke="var(--color-sales)"
                    fill="var(--color-sales)"
                    fillOpacity={0.16}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="var(--color-profit)"
                    fill="var(--color-profit)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </AreaChart>
              </AdminChartCard>
            ) : (
              <Card className="gap-0">
                <CardHeader className="border-b pb-3">
                  <CardTitle>Sales vs profit</CardTitle>
                  <CardDescription className="mt-0.5">
                    {PERIOD_LABEL[period]} trend · Live data
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
                  <p className="text-sm font-medium">No chart activity</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Orders and completed deposits for this period will appear
                    here.
                  </p>
                </CardContent>
              </Card>
            )}
          </StatSection>

          <Card className="gap-0">
            <CardHeader className="border-b pb-3">
              <CardTitle>Top product</CardTitle>
              <CardDescription className="mt-0.5">
                Highest revenue duration · Owner{" "}
                {Math.round((1 - (data.shareRate ?? 0.1)) * 100)}% / Developer{" "}
                {Math.round((data.shareRate ?? 0.1) * 100)}% of gross profit
                (sale − buy).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-3 py-4">
              {!data.topProduct ? (
                <div className="text-center">
                  <p className="text-sm font-medium">No winner yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No product sales for selected period.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    {data.topProduct.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.topProduct.durationLabel} · {data.topProduct.sold}{" "}
                    sold · {formatMoney(data.topProduct.revenue)}
                  </p>
                  <p className="text-xs text-success tabular-nums">
                    Profit {formatMoney(data.topProduct.profit)}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat label="Owner" value={formatMoney(data.totals.owner)} />
                <MiniStat
                  label="Developer"
                  value={formatMoney(data.totals.developer)}
                />
                <MiniStat
                  label="Discount"
                  value={formatMoney(data.totals.discount)}
                />
                <MiniStat label="Cost" value={formatMoney(data.totals.cost)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat
                  label="Users"
                  value={String(data.stock.users)}
                  hint={`${data.stock.resellers} resellers`}
                />
                <MiniStat
                  label="Keys"
                  value={String(data.stock.availableKeys)}
                  hint={`${data.stock.soldKeys} sold`}
                />
              </div>
            </CardContent>
          </Card>

          <StatSection
            title="Product wise sales"
            description="Revenue, profit and developer share by product duration."
            action={
              <Badge variant="secondary" className="tabular-nums">
                {PERIOD_LABEL[period]}
              </Badge>
            }
          >
            {!data.productRows.length ? (
              <Card className="gap-0">
                <CardContent className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
                  <p className="text-sm font-medium">No product sales</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Product performance rows will appear after orders are
                    created in this period.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
                {data.productRows.map((row) => (
                  <li
                    key={`${row.productTitle}-${row.durationLabel}`}
                    className="flex items-start justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {row.productTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.durationLabel} · {row.sold} sold
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Dev {formatMoney(row.developer)} · Owner{" "}
                        {formatMoney(row.owner)} · Cost{" "}
                        {formatMoney(row.cost)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-success tabular-nums">
                        {formatMoney(row.revenue)}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        Profit {formatMoney(row.profit)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </StatSection>
        </>
      )}
    </main>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
      <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
