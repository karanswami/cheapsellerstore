import { prisma } from "@/lib/prisma";

const burstBuckets = new Map<string, { count: number; resetAt: number }>();
/** In-memory public IP windows (1 minute). */
const publicIpBuckets = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSec?: number;
};

export async function checkApiRateLimit(input: {
  apiKeyId: string;
  rpm: number;
  burst: number;
}): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - 60_000);

  // Burst (2s window, in-process)
  const burstKey = input.apiKeyId;
  const burstWindowMs = 2000;
  let burst = burstBuckets.get(burstKey);
  if (!burst || burst.resetAt <= now) {
    burst = { count: 0, resetAt: now + burstWindowMs };
    burstBuckets.set(burstKey, burst);
  }
  if (burst.count >= input.burst) {
    const retryAfterSec = Math.max(1, Math.ceil((burst.resetAt - now) / 1000));
    return {
      allowed: false,
      limit: input.rpm,
      remaining: 0,
      resetAt: Math.ceil(burst.resetAt / 1000),
      retryAfterSec,
    };
  }

  const used = await prisma.sellerApiUsage.count({
    where: {
      apiKeyId: input.apiKeyId,
      createdAt: { gte: windowStart },
    },
  });

  const remaining = Math.max(0, input.rpm - used);
  const resetAt = Math.ceil((now + 60_000) / 1000);

  if (used >= input.rpm) {
    return {
      allowed: false,
      limit: input.rpm,
      remaining: 0,
      resetAt,
      retryAfterSec: 60,
    };
  }

  burst.count += 1;
  return {
    allowed: true,
    limit: input.rpm,
    remaining: Math.max(0, remaining - 1),
    resetAt,
  };
}

/** Public (no-key) endpoints — fixed 1-minute window per IP. */
export function checkPublicIpRateLimit(input: {
  ip: string;
  rpm: number;
}): RateLimitResult {
  const now = Date.now();
  const key = input.ip || "unknown";
  let bucket = publicIpBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + 60_000 };
    publicIpBuckets.set(key, bucket);
  }

  const resetAt = Math.ceil(bucket.resetAt / 1000);
  if (bucket.count >= input.rpm) {
    return {
      allowed: false,
      limit: input.rpm,
      remaining: 0,
      resetAt,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    limit: input.rpm,
    remaining: Math.max(0, input.rpm - bucket.count),
    resetAt,
  };
}
