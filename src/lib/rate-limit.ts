import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/** Best-effort client IP behind Cloudflare/nginx. Never trusts a client-supplied leftmost XFF. */
export function clientIpFromHeaders(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

/**
 * Fixed-window limiter backed by a unique-key counter. Fails OPEN on DB errors so an outage
 * never locks every user out (money paths have their own atomic guards).
 */
export async function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitDecision> {
  const now = new Date();
  try {
    const bump = await prisma.rateLimitBucket.updateMany({
      where: { key: input.key, resetAt: { gt: now } },
      data: { count: { increment: 1 } },
    });
    if (bump.count === 0) {
      await prisma.rateLimitBucket.deleteMany({
        where: { key: input.key, resetAt: { lte: now } },
      });
      try {
        await prisma.rateLimitBucket.create({
          data: {
            key: input.key,
            count: 1,
            resetAt: new Date(now.getTime() + input.windowMs),
          },
        });
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
        await prisma.rateLimitBucket.updateMany({
          where: { key: input.key },
          data: { count: { increment: 1 } },
        });
      }
    }
    const row = await prisma.rateLimitBucket.findUnique({ where: { key: input.key } });
    const count = row?.count ?? 1;
    const retryAfterSec = Math.max(
      1,
      Math.ceil(((row?.resetAt.getTime() ?? now.getTime() + input.windowMs) - Date.now()) / 1000),
    );
    return {
      allowed: count <= input.limit,
      remaining: Math.max(0, input.limit - count),
      retryAfterSec,
    };
  } catch (e) {
    console.warn("[rate-limit] failing open:", e instanceof Error ? e.message : e);
    return { allowed: true, remaining: input.limit, retryAfterSec: 0 };
  }
}

/** Convenience: check several keys, return the first denial (or null). */
export async function rateLimitAll(
  checks: { key: string; limit: number; windowMs: number }[],
): Promise<RateLimitDecision | null> {
  for (const c of checks) {
    const d = await rateLimit(c);
    if (!d.allowed) return d;
  }
  return null;
}

/** Standard 429 JSON response for a denied decision. */
export function tooManyRequests(d: RateLimitDecision, message = "Too many attempts. Please try again later.") {
  return new Response(
    JSON.stringify({ error: { code: "RATE_LIMITED", message } }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(d.retryAfterSec),
      },
    },
  );
}
