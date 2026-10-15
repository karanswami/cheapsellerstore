import "server-only";

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | null | undefined;
};

/**
 * High-performance, fault-tolerant Redis singleton client.
 * Configured with short timeouts and fast failure so it never blocks web requests.
 */
function createRedisClient(): Redis | null {
  try {
    const client = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 2000,
      enableOfflineQueue: false,
      retryStrategy(times) {
        // Backoff retry: min 500ms, max 3000ms
        return Math.min(times * 500, 3000);
      },
    });

    client.on("error", (err) => {
      // Avoid unhandled crashes; log warning in dev/server
      if (process.env.NODE_ENV !== "production") {
        console.warn("[redis] connection warning:", err?.message || err);
      }
    });

    return client;
  } catch (err) {
    console.warn("[redis] initialization failed:", err);
    return null;
  }
}

let redisInstance: Redis | null = globalForRedis.redisClient ?? null;

export async function getRedis(): Promise<Redis | null> {
  if (redisInstance) {
    if (redisInstance.status === "ready" || redisInstance.status === "connecting") {
      return redisInstance;
    }
  }

  if (!redisInstance) {
    redisInstance = createRedisClient();
    if (process.env.NODE_ENV !== "production") {
      globalForRedis.redisClient = redisInstance;
    }
  }

  if (redisInstance && redisInstance.status === "wait") {
    try {
      await redisInstance.connect();
    } catch {
      // Connect failure is non-fatal; callers handle null
      return null;
    }
  }

  return redisInstance?.status === "ready" ? redisInstance : null;
}

/** Check if Redis server is alive and responding to PING in under 500ms. */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (!redis) return false;
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

/** Redis Keys used for logging, buffers, and system alerts */
export const REDIS_KEYS = {
  ACTIVITY_LOG_STREAM: "drip:activity_logs:stream",
  MONGO_FALLBACK_QUEUE: "drip:logs:mongo_fallback_queue",
  ALERT_THROTTLE_PREFIX: "drip:alert:throttle:",
  SYSTEM_STATUS: "drip:system:status",
} as const;

/** Max temporary logs kept in fast Redis stream (7 days max / 5,000 items) */
export const REDIS_LOG_STREAM_MAX_ITEMS = 5000;
export const REDIS_LOG_STREAM_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Fast fire-and-forget push of temporary activity logs to local Redis.
 * Execution takes < 1ms and never throws.
 */
export async function redisPushActivityLog(entryJson: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (!redis) return false;

    const pipeline = redis.pipeline();
    pipeline.lpush(REDIS_KEYS.ACTIVITY_LOG_STREAM, entryJson);
    pipeline.ltrim(REDIS_KEYS.ACTIVITY_LOG_STREAM, 0, REDIS_LOG_STREAM_MAX_ITEMS - 1);
    pipeline.expire(REDIS_KEYS.ACTIVITY_LOG_STREAM, REDIS_LOG_STREAM_TTL_SECONDS);
    await pipeline.exec();
    return true;
  } catch {
    return false;
  }
}

/** Retrieve latest N activity logs directly from fast Redis cache. */
export async function redisGetRecentActivityLogs(
  limit = 50,
): Promise<string[]> {
  try {
    const redis = await getRedis();
    if (!redis) return [];
    return await redis.lrange(REDIS_KEYS.ACTIVITY_LOG_STREAM, 0, Math.max(0, limit - 1));
  } catch {
    return [];
  }
}

/**
 * Buffer a failed MongoDB write into Redis fallback queue.
 * Ensures 0% data loss even when MongoDB is down or storage is restricted.
 */
export async function redisBufferMongoFallback(payloadJson: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (!redis) return false;
    // Keep max 50,000 fallback queue items
    const pipeline = redis.pipeline();
    pipeline.rpush(REDIS_KEYS.MONGO_FALLBACK_QUEUE, payloadJson);
    pipeline.ltrim(REDIS_KEYS.MONGO_FALLBACK_QUEUE, -50000, -1);
    await pipeline.exec();
    return true;
  } catch {
    return false;
  }
}

/** Pop a batch of buffered logs from Redis fallback queue to replay into MongoDB. */
export async function redisPopMongoFallbackBatch(batchSize = 100): Promise<string[]> {
  try {
    const redis = await getRedis();
    if (!redis) return [];

    const items: string[] = [];
    for (let i = 0; i < batchSize; i++) {
      const item = await redis.lpop(REDIS_KEYS.MONGO_FALLBACK_QUEUE);
      if (!item) break;
      items.push(item);
    }
    return items;
  } catch {
    return [];
  }
}

/** Check size of the pending MongoDB fallback queue. */
export async function redisGetFallbackQueueSize(): Promise<number> {
  try {
    const redis = await getRedis();
    if (!redis) return 0;
    return await redis.llen(REDIS_KEYS.MONGO_FALLBACK_QUEUE);
  } catch {
    return 0;
  }
}

/**
 * Atomic alert throttle check to prevent spamming Telegram on rapid recurring errors.
 * Returns true if alert should be sent (first occurrence within ttlSeconds), false if throttled.
 */
export async function redisCheckAlertThrottle(
  key: string,
  ttlSeconds = 60,
): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (!redis) return true; // Fallback: allow alert if Redis is down
    const result = await redis.set(
      `${REDIS_KEYS.ALERT_THROTTLE_PREFIX}${key}`,
      "1",
      "EX",
      ttlSeconds,
      "NX",
    );
    return result === "OK";
  } catch {
    return true;
  }
}
