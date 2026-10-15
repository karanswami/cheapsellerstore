import "server-only";

import { purgeExpiredActivityLogs } from "@/lib/activity-log";
import { expireOldDeposits } from "@/lib/deposit-credit";
import { listDepositProviderAdapters } from "@/lib/deposit-providers";
import {
  CRON_RECHECK_ALLOWED_STATUSES,
  recheckDepositNow,
} from "@/lib/deposit-recheck";
import { prisma } from "@/lib/prisma";
import { purgeExpiredSupplierApiLogs } from "@/lib/supplier/client";
import { DepositMethod, type Prisma } from "@prisma/client";

const DEFAULT_PROVIDER_GRACE_MINUTES = 60;
const DEFAULT_PROVIDER_POLL_LIMIT = 50;
const DEFAULT_UPI_POLL_LIMIT = 25;

export type DepositCronProviderResult = {
  method: DepositMethod;
  checked: number;
  completed: number;
  failed: number;
  durationMs: number;
  qrisLiveStatusChecks?: number;
};

export type DepositCronPollResult = {
  ok: boolean;
  expired: number;
  durationMs: number;
  providerGraceMinutes: number;
  startedAt: string;
  finishedAt: string;
  errorMessage: string | null;
  providers: Record<string, DepositCronProviderResult | Prisma.InputJsonValue>;
  runId?: string;
};

function envInt(name: string, fallback: number, min: number, max: number) {
  const raw = Number(process.env[name] || fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(Math.floor(raw), min), max);
}

export function providerGraceMinutes() {
  return envInt(
    "DEPOSIT_PROVIDER_GRACE_MINUTES",
    DEFAULT_PROVIDER_GRACE_MINUTES,
    0,
    24 * 60,
  );
}

function providerGraceCutoff(now = new Date()) {
  return new Date(now.getTime() - providerGraceMinutes() * 60_000);
}

function providerPollLimit(method: DepositMethod) {
  if (method === DepositMethod.UPI) return DEFAULT_UPI_POLL_LIMIT;
  return DEFAULT_PROVIDER_POLL_LIMIT;
}

async function pollProvider(method: DepositMethod): Promise<DepositCronProviderResult> {
  const startedAt = new Date();

  const pending = await prisma.deposit.findMany({
    where: {
      method,
      status: { in: CRON_RECHECK_ALLOWED_STATUSES },
      expiresAt: { gt: providerGraceCutoff() },
    },
    orderBy: { createdAt: "asc" },
    take: providerPollLimit(method),
  });

  if (!pending.length) {
    return {
      method,
      checked: 0,
      completed: 0,
      failed: 0,
      durationMs: Date.now() - startedAt.getTime(),
    };
  }

  let completed = 0;
  let failed = 0;

  for (const deposit of pending) {
    const result = await recheckDepositNow(deposit, {
      allowedStatuses: CRON_RECHECK_ALLOWED_STATUSES,
      allowFinalRecheck: true,
      allowLiveStatusCheck: true,
    }).catch((error) => {
      console.warn(
        `${method}_CRON_RECHECK_FAILED`,
        deposit.providerDepositId || deposit.id,
        error,
      );
      return { completed: false, reason: "provider_error" };
    });

    if (result.completed) completed += 1;
    if ("failed" in result && result.failed) failed += 1;
  }

  return {
    method,
    checked: pending.length,
    completed,
    failed,
    durationMs: Date.now() - startedAt.getTime(),
  };
}

/** Keep only the last 1 hour (60 minutes) of cron run history. */
export const DEPOSIT_CRON_RETENTION_MINUTES = 60;

export function depositCronCutoff(now = new Date()): Date {
  return new Date(now.getTime() - DEPOSIT_CRON_RETENTION_MINUTES * 60_000);
}

/** Delete cron run snapshots older than 1 hour. Safe to call from cron. */
export async function purgeExpiredDepositCronRuns(): Promise<{ deleted: number }> {
  const result = await prisma.depositCronRun.deleteMany({
    where: { startedAt: { lt: depositCronCutoff() } },
  });
  return { deleted: result.count };
}

/** Expire stale deposits + poll auto rails; persists a `DepositCronRun` row. */
export async function runDepositCronPoll(): Promise<DepositCronPollResult> {
  const startedAt = new Date();
  let expired = 0;
  let ok = true;
  let errorMessage: string | null = null;
  const providers: Record<string, Prisma.InputJsonValue> = {};

  try {
    const expireResult = await expireOldDeposits();
    expired = expireResult.count;

    const adapters = listDepositProviderAdapters().filter(
      (a) => a.capabilities.cronPolling,
    );
    for (const adapter of adapters) {
      providers[adapter.method] = (await pollProvider(
        adapter.method,
      )) as Prisma.InputJsonValue;
    }

    try {
      const purged = await purgeExpiredActivityLogs();
      if (purged.deleted > 0) {
        providers.activityLogPurge = {
          deleted: purged.deleted,
        } as Prisma.InputJsonValue;
      }
    } catch (purgeErr) {
      console.warn("ACTIVITY_LOG_PURGE_FAILED", purgeErr);
    }

    try {
      const { flushFallbackLogsToMongo } = await import("@/lib/activity-log");
      const { redisGetFallbackQueueSize, isRedisHealthy } = await import("@/lib/redis");
      const [flushedRes, queueSize, redisOk] = await Promise.all([
        flushFallbackLogsToMongo(100),
        redisGetFallbackQueueSize(),
        isRedisHealthy(),
      ]);
      providers.redisLogging = {
        healthy: redisOk,
        flushedFallbackLogs: flushedRes.flushed,
        pendingFallbackQueue: queueSize,
      } as Prisma.InputJsonValue;
    } catch (redisLogErr) {
      console.warn("REDIS_LOG_CRON_SYNC_FAILED", redisLogErr);
    }

    try {
      const cronPurged = await purgeExpiredDepositCronRuns();
      if (cronPurged.deleted > 0) {
        providers.cronHistoryPurge = {
          deleted: cronPurged.deleted,
        } as Prisma.InputJsonValue;
      }
    } catch (purgeErr) {
      console.warn("DEPOSIT_CRON_PURGE_FAILED", purgeErr);
    }

    try {
      const supplierPurged = await purgeExpiredSupplierApiLogs();
      if (supplierPurged.deleted > 0) {
        providers.supplierLogPurge = {
          deleted: supplierPurged.deleted,
        } as Prisma.InputJsonValue;
      }
    } catch (purgeErr) {
      console.warn("SUPPLIER_LOG_PURGE_FAILED", purgeErr);
    }

    try {
      const { getCachedSupplierCatalog, getCachedSupplierBalance } =
        await import("@/lib/supplier/catalog-cache");
      const [supplierCache, supplierBalance] = await Promise.all([
        getCachedSupplierCatalog(),
        getCachedSupplierBalance(),
      ]);
      if (supplierCache) {
        providers.supplierCatalogSynced = {
          itemsCount: supplierCache.items.length,
          fetchedAt: supplierCache.fetchedAt,
          balance: supplierBalance?.balance ?? null,
        } as Prisma.InputJsonValue;
      }
    } catch (suppErr) {
      console.warn("SUPPLIER_CATALOG_SYNC_FAILED", suppErr);
    }
  } catch (err) {
    ok = false;
    errorMessage = err instanceof Error ? err.message : "poll_failed";
    console.error("DEPOSIT_CRON_FAILED", err);
    try {
      const { reportDatabaseError } = await import("@/lib/system-alert");
      void reportDatabaseError("deposit_cron_poll", err, {
        metadata: { expiredCount: expired },
      }).catch(() => undefined);
    } catch {
      // ignore alert delivery failures
    }
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const grace = providerGraceMinutes();
  let runId: string | undefined;

  try {
    const row = await prisma.depositCronRun.create({
      data: {
        startedAt,
        finishedAt,
        durationMs,
        expired,
        providerGraceMinutes: grace,
        providers: providers as Prisma.InputJsonValue,
        ok,
        errorMessage,
      },
    });
    runId = row.id;
  } catch (err) {
    console.error("DEPOSIT_CRON_HISTORY_FAILED", err);
  }

  return {
    ok,
    expired,
    durationMs,
    providerGraceMinutes: grace,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    errorMessage,
    providers,
    runId,
  };
}
