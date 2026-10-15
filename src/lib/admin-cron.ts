import "server-only";

import { providerGraceMinutes } from "@/lib/deposit-cron";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type CronJobId = "deposits";

export type CronProviderSummary = {
  method: string;
  checked: number;
  completed: number;
  failed: number;
  durationMs: number;
  qrisLiveStatusChecks?: number;
};

export type CronRunRow = {
  id: string;
  jobId: CronJobId;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number;
  expired: number;
  providerGraceMinutes: number;
  providers: CronProviderSummary[];
  ok: boolean;
  errorMessage: string | null;
  createdAt: string;
};

export type CronJobSummary = {
  id: CronJobId;
  name: string;
  description: string;
  endpoint: string;
  scheduleHint: string;
  secretConfigured: boolean;
  providerGraceMinutes: number;
  lastRun: CronRunRow | null;
  stats24h: {
    total: number;
    ok: number;
    failed: number;
    avgDurationMs: number;
    expiredTotal: number;
  };
};

export type CronOverview = {
  jobs: CronJobSummary[];
  serverTime: string;
};

export type CronRunsPage = {
  runs: CronRunRow[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseProviders(raw: Prisma.JsonValue): CronProviderSummary[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw as Record<string, unknown>).map(([method, value]) => {
    const row =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    return {
      method: String(row.method ?? method),
      checked: asNumber(row.checked),
      completed: asNumber(row.completed),
      failed: asNumber(row.failed),
      durationMs: asNumber(row.durationMs),
      qrisLiveStatusChecks:
        row.qrisLiveStatusChecks == null
          ? undefined
          : asNumber(row.qrisLiveStatusChecks),
    };
  });
}

function mapDepositRun(row: {
  id: string;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number;
  expired: number;
  providerGraceMinutes: number;
  providers: Prisma.JsonValue;
  ok: boolean;
  errorMessage: string | null;
  createdAt: Date;
}): CronRunRow {
  return {
    id: row.id,
    jobId: "deposits",
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    durationMs: row.durationMs,
    expired: row.expired,
    providerGraceMinutes: row.providerGraceMinutes,
    providers: parseProviders(row.providers),
    ok: row.ok,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getCronOverview(): Promise<CronOverview> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [last, total24h, ok24h, failed24h, avgAgg, expiredAgg] =
    await Promise.all([
      prisma.depositCronRun.findFirst({ orderBy: { startedAt: "desc" } }),
      prisma.depositCronRun.count({ where: { startedAt: { gte: since } } }),
      prisma.depositCronRun.count({
        where: { startedAt: { gte: since }, ok: true },
      }),
      prisma.depositCronRun.count({
        where: { startedAt: { gte: since }, ok: false },
      }),
      prisma.depositCronRun.aggregate({
        where: { startedAt: { gte: since } },
        _avg: { durationMs: true },
      }),
      prisma.depositCronRun.aggregate({
        where: { startedAt: { gte: since } },
        _sum: { expired: true },
      }),
    ]);

  const deposits: CronJobSummary = {
    id: "deposits",
    name: "Deposit poll",
    description:
      "Expire stale tickets and recheck Binance / QRIS / MGCloudPay / Cashfree pending deposits.",
    endpoint: "/api/cron/deposits/poll",
    scheduleHint: "Every minute · VPS crontab → CRON_SECRET",
    secretConfigured: Boolean(process.env.CRON_SECRET),
    providerGraceMinutes: providerGraceMinutes(),
    lastRun: last ? mapDepositRun(last) : null,
    stats24h: {
      total: total24h,
      ok: ok24h,
      failed: failed24h,
      avgDurationMs: Math.round(avgAgg._avg.durationMs ?? 0),
      expiredTotal: expiredAgg._sum.expired ?? 0,
    },
  };

  return {
    jobs: [deposits],
    serverTime: new Date().toISOString(),
  };
}

export async function listCronRuns(opts: {
  job?: CronJobId | "all";
  page?: number;
  limit?: number;
  ok?: boolean | null;
}): Promise<CronRunsPage> {
  const job = opts.job ?? "all";
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const limit = Math.min(50, Math.max(1, Math.floor(opts.limit ?? 20)));
  const skip = (page - 1) * limit;

  // Only deposit cron history exists today; keep job filter for future jobs.
  if (job !== "all" && job !== "deposits") {
    return { runs: [], page, limit, total: 0, hasMore: false };
  }

  const where =
    opts.ok == null
      ? {}
      : {
          ok: opts.ok,
        };

  const [total, rows] = await Promise.all([
    prisma.depositCronRun.count({ where }),
    prisma.depositCronRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    runs: rows.map(mapDepositRun),
    page,
    limit,
    total,
    hasMore: skip + rows.length < total,
  };
}
