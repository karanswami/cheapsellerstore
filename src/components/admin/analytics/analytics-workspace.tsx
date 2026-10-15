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
import { KpiCard } from "@/components/admin/stats/kpi-card";
import { useAdminFetch } from "@/components/admin/use-admin-fetch";
import { humanStatus, type AnalyticsPayload } from "@/types/admin-stats";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

const roleConfig = {
  count: { label: "Users", color: "var(--primary)" },
};

const methodConfig = {
  count: { label: "Deposits", color: "var(--success)" },
};

const statusConfig = {
  count: { label: "Count", color: "var(--primary)" },
};

export function AnalyticsWorkspace() {
  const { data, loading } = useAdminFetch<AnalyticsPayload>(
    "/api/admin/analytics",
  );

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        description="Composition of users, orders, deposits, and stock"
      />
      {loading || !data ? (
        <AdminListSkeleton rows={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <KpiCard label="Users" value={String(data.totals.users)} />
            <KpiCard
              label="Fulfilled orders"
              value={String(data.totals.orders)}
              tone="success"
            />
            <KpiCard
              label="Completed deposits"
              value={String(data.totals.deposits)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CompositionPie
              title="Users by role"
              config={roleConfig}
              rows={data.usersByRole}
              empty="No users yet."
            />
            <CompositionPie
              title="Deposits by method"
              config={methodConfig}
              rows={data.depositsByMethod}
              empty="No deposits yet."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CompositionBars
              title="Orders by status"
              config={statusConfig}
              rows={data.ordersByStatus}
              empty="No orders yet."
            />
            <CompositionBars
              title="Keys by status"
              config={statusConfig}
              rows={data.keysByStatus}
              empty="No keys yet."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CompositionBars
              title="Deposits by status"
              config={statusConfig}
              rows={data.depositsByStatus}
              empty="No deposits yet."
            />
            <CompositionBars
              title="Reviews by status"
              config={statusConfig}
              rows={data.reviewsByStatus}
              empty="No reviews yet."
            />
          </div>
        </>
      )}
    </main>
  );
}

function CompositionPie({
  title,
  config,
  rows,
  empty,
}: {
  title: string;
  config: typeof roleConfig;
  rows: { name: string; count: number }[];
  empty: string;
}) {
  const chartData = rows.map((r) => ({
    name: humanStatus(r.name),
    count: r.count,
  }));

  if (!chartData.length) {
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <AdminEmptyState message={empty} />
      </div>
    );
  }

  return (
    <AdminChartCard title={title} config={config} chartClassName="h-[240px]">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="name"
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums">
                  {Number(value).toLocaleString()}
                </span>
              )}
            />
          }
        />
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="name"
          innerRadius={48}
          outerRadius={80}
          strokeWidth={2}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </AdminChartCard>
  );
}

function CompositionBars({
  title,
  config,
  rows,
  empty,
}: {
  title: string;
  config: typeof statusConfig;
  rows: { name: string; count: number }[];
  empty: string;
}) {
  const chartData = rows.map((r) => ({
    name: humanStatus(r.name),
    count: r.count,
  }));

  if (!chartData.length) {
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <AdminEmptyState message={empty} />
      </div>
    );
  }

  return (
    <AdminChartCard title={title} config={config} chartClassName="h-[220px]">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 8, right: 8, top: 4, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          width={88}
          tick={{ fontSize: 11 }}
        />
        <XAxis type="number" hide />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </AdminChartCard>
  );
}
