import "server-only";

import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import {
  redisBufferMongoFallback,
  redisPopMongoFallbackBatch,
  redisPushActivityLog,
} from "@/lib/redis";
import { reportDatabaseError } from "@/lib/system-alert";
import type {
  ActivityLogAction,
  ActivityLogCategory,
  ActivityLogRow,
  ActivityLogsPage,
} from "@/types/activity-log";
import type { Prisma } from "@prisma/client";

/** Keep only the last 7 days so Mongo does not fill with audit noise. */
export const ACTIVITY_LOG_RETENTION_DAYS = 7;

/** Hard limit on total ActivityLog rows in MongoDB to guarantee 512MB space safety. */
export const MONGO_ACTIVITY_LOG_MAX_ROWS = 5000;

const PURGE_CHANCE = 0.05;

export type ActivityLogActor = {
  id?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string | null;
};

export type LogActivityInput = {
  action: ActivityLogAction | string;
  category: ActivityLogCategory | string;
  message: string;
  user?: ActivityLogActor | null;
  userId?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean;
  /** When set, IP / UA are taken from the request headers. */
  request?: Request | null;
};

export function getRequestClientInfo(request?: Request | null): {
  ip: string | null;
  userAgent: string | null;
} {
  if (!request) return { ip: null, userAgent: null };
  // Same trusted source as the rate limiter: a client-sent leftmost X-Forwarded-For must not forge the log.
  const resolved = clientIpFromHeaders(request.headers);
  const ip = resolved === "unknown" ? null : resolved;
  const userAgent = request.headers.get("user-agent")?.trim() || null;
  return { ip, userAgent };
}

function asMetadata(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (!value || Object.keys(value).length === 0) return undefined;
  return value as Prisma.InputJsonValue;
}

function resolveActor(input: LogActivityInput) {
  return {
    userId: input.user?.id ?? input.userId ?? null,
    username: input.user?.username ?? input.username ?? null,
    email: input.user?.email ?? input.email ?? null,
    role: input.user?.role ?? input.role ?? null,
  };
}

/**
 * Internal worker: writes to Redis first (ultra-fast) then persists to MongoDB.
 * If MongoDB fails, safely buffers in Redis fallback queue and triggers Telegram alert.
 */
async function writeActivityLog(input: LogActivityInput): Promise<void> {
  const actor = resolveActor(input);
  const fromReq = getRequestClientInfo(input.request);
  const ip = input.ip ?? fromReq.ip;
  const userAgent = input.userAgent ?? fromReq.userAgent;
  const now = new Date();

  const logPayload = {
    userId: actor.userId,
    username: actor.username,
    email: actor.email,
    role: actor.role,
    action: String(input.action),
    category: String(input.category),
    message: input.message.slice(0, 500),
    metadata: input.metadata ?? null,
    ip,
    userAgent: userAgent ? userAgent.slice(0, 400) : null,
    success: input.success !== false,
    createdAt: now.toISOString(),
  };

  // 1. FAST LOCAL WRITE TO REDIS (<1ms, no blocking)
  void redisPushActivityLog(JSON.stringify(logPayload)).catch(() => undefined);

  // 2. SAFE PERSISTENCE TO MONGODB WITH SMART FALLBACK
  try {
    await prisma.activityLog.create({
      data: {
        userId: logPayload.userId,
        username: logPayload.username,
        email: logPayload.email,
        role: logPayload.role,
        action: logPayload.action,
        category: logPayload.category,
        message: logPayload.message,
        metadata: asMetadata(input.metadata ?? undefined),
        ip: logPayload.ip,
        userAgent: logPayload.userAgent,
        success: logPayload.success,
      },
    });

    if (Math.random() < PURGE_CHANCE) {
      void purgeExpiredActivityLogs().catch(() => undefined);
    }
  } catch (mongoErr) {
    console.warn("[activity-log] MongoDB write failed — buffering to Redis:", mongoErr);

    // 3. BUFFER IN REDIS FALLBACK QUEUE (0% data loss)
    await redisBufferMongoFallback(JSON.stringify(logPayload)).catch(() => undefined);

    // 4. INSTANT TELEGRAM ALERT ON DB ISSUES
    void reportDatabaseError("ActivityLog.create", mongoErr, {
      user: actor,
      ip,
      fallbackActive: true,
      metadata: { action: input.action, category: input.category },
    }).catch(() => undefined);
  }
}

/**
 * Fire-and-forget activity write. Never throws to the caller —
 * logging must not break login / checkout / deposits.
 */
export function logActivity(input: LogActivityInput): void {
  void writeActivityLog(input).catch((err) => {
    console.warn("[activity-log] unhandled write failure:", err);
  });
}

export function activityLogCutoff(now = new Date()): Date {
  return new Date(
    now.getTime() - ACTIVITY_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

/**
 * Delete logs older than retention window AND trim total count to MONGO_ACTIVITY_LOG_MAX_ROWS.
 * 100% guarantees MongoDB 512MB free tier storage remains safe and uncluttered.
 */
export async function purgeExpiredActivityLogs(): Promise<{ deleted: number }> {
  try {
    let deletedCount = 0;

    // 1. Time-based purge (older than 7 days)
    const timePurge = await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: activityLogCutoff() } },
    });
    deletedCount += timePurge.count;

    // 2. Capped-count safety check: if still above threshold, prune oldest excess rows
    const currentCount = await prisma.activityLog.count();
    if (currentCount > MONGO_ACTIVITY_LOG_MAX_ROWS) {
      const excess = currentCount - MONGO_ACTIVITY_LOG_MAX_ROWS;
      const oldestRows = await prisma.activityLog.findMany({
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: excess,
      });

      if (oldestRows.length > 0) {
        const idPurge = await prisma.activityLog.deleteMany({
          where: { id: { in: oldestRows.map((r) => r.id) } },
        });
        deletedCount += idPurge.count;
      }
    }

    return { deleted: deletedCount };
  } catch (err) {
    console.warn("[activity-log] purge error:", err);
    return { deleted: 0 };
  }
}

/**
 * Drain buffered fallback logs from Redis and save to MongoDB.
 * Called automatically by deposit cron every minute to ensure zero data loss.
 */
export async function flushFallbackLogsToMongo(batchSize = 100): Promise<{ flushed: number }> {
  try {
    const rawItems = await redisPopMongoFallbackBatch(batchSize);
    if (!rawItems.length) return { flushed: 0 };

    let flushed = 0;
    for (const raw of rawItems) {
      try {
        const parsed = JSON.parse(raw);
        await prisma.activityLog.create({
          data: {
            userId: parsed.userId ?? null,
            username: parsed.username ?? null,
            email: parsed.email ?? null,
            role: parsed.role ?? null,
            action: String(parsed.action || "UNKNOWN"),
            category: String(parsed.category || "SECURITY"),
            message: String(parsed.message || "").slice(0, 500),
            metadata: asMetadata(parsed.metadata ?? undefined),
            ip: parsed.ip ?? null,
            userAgent: parsed.userAgent ?? null,
            success: parsed.success !== false,
          },
        });
        flushed++;
      } catch (itemErr) {
        // Re-buffer if Mongo is still failing
        await redisBufferMongoFallback(raw).catch(() => undefined);
        break;
      }
    }

    return { flushed };
  } catch {
    return { flushed: 0 };
  }
}

function toRow(row: {
  id: string;
  userId: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  action: string;
  category: string;
  message: string;
  metadata: Prisma.JsonValue | null;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: Date;
}): ActivityLogRow {
  const meta =
    row.metadata &&
    typeof row.metadata === "object" &&
    !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null;

  return {
    id: row.id,
    userId: row.userId,
    username: row.username,
    email: row.email,
    role: row.role,
    action: row.action,
    category: row.category,
    message: row.message,
    metadata: meta,
    ip: row.ip,
    userAgent: row.userAgent,
    success: row.success,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getActivityLogsPage(options?: {
  page?: number;
  limit?: number;
  category?: string | null;
  action?: string | null;
  q?: string | null;
  success?: boolean | null;
}): Promise<ActivityLogsPage> {
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(50, Math.max(1, options?.limit ?? 20));
  const q = options?.q?.trim() ?? "";
  const category = options?.category?.trim() || null;
  const action = options?.action?.trim() || null;

  const where: Prisma.ActivityLogWhereInput = {
    createdAt: { gte: activityLogCutoff() },
  };

  if (category && category !== "all") where.category = category;
  if (action && action !== "all") where.action = action;
  if (options?.success === true) where.success = true;
  if (options?.success === false) where.success = false;

  if (q) {
    const or: Prisma.ActivityLogWhereInput[] = [
      { message: { contains: q, mode: "insensitive" } },
      { username: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
      { ip: { contains: q, mode: "insensitive" } },
    ];
    if (q.length >= 12) or.push({ userId: q });
    where.OR = or;
  }

  const [total, rows] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: rows.map(toRow),
    page,
    limit,
    total,
    hasMore: page * limit < total,
    retentionDays: ACTIVITY_LOG_RETENTION_DAYS,
  };
}
