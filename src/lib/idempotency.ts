import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_KEY_LEN = 200;

export function normalizeIdempotencyKey(raw: string | null | undefined): string | null {
  const key = String(raw ?? "").trim();
  if (!key || key.length > MAX_KEY_LEN) return null;
  if (!/^[A-Za-z0-9._:\-]+$/.test(key)) return null;
  return key;
}

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export type ClaimResult =
  | { ok: true }
  | {
      ok: false;
      /** Another request holds the claim and has not finished yet. */
      inFlight: boolean;
      statusCode: number | null;
      body: unknown;
    };

/**
 * Atomically claim (scope, key). Exactly one concurrent caller wins; everybody else gets the
 * stored response (or `inFlight` when the winner is still running).
 */
export async function claimIdempotency(
  scope: string,
  key: string,
  ttlMs: number,
): Promise<ClaimResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await prisma.idempotencyClaim.create({
        data: { scope, key, expiresAt: new Date(Date.now() + ttlMs) },
      });
      return { ok: true };
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      const row = await prisma.idempotencyClaim.findUnique({
        where: { scope_key: { scope, key } },
      });
      if (!row) continue;
      if (row.expiresAt.getTime() < Date.now()) {
        // Expired claim: only one caller may reap it.
        const reaped = await prisma.idempotencyClaim.deleteMany({
          where: { id: row.id, expiresAt: { lt: new Date() } },
        });
        if (reaped.count > 0 || attempt === 0) continue;
      }
      return {
        ok: false,
        inFlight: row.state !== "DONE",
        statusCode: row.statusCode ?? null,
        body: row.responseJson ? (JSON.parse(row.responseJson) as unknown) : null,
      };
    }
  }
  return { ok: false, inFlight: true, statusCode: null, body: null };
}

export async function completeIdempotency(
  scope: string,
  key: string,
  statusCode: number,
  body: unknown,
  keepMs = 24 * 60 * 60 * 1000,
) {
  await prisma.idempotencyClaim.updateMany({
    where: { scope, key },
    data: {
      state: "DONE",
      statusCode,
      responseJson: JSON.stringify(body ?? null),
      expiresAt: new Date(Date.now() + keepMs),
    },
  });
}

/** Drop a claim so the caller (or a retry) can run again, e.g. after an internal failure. */
export async function releaseIdempotency(scope: string, key: string) {
  await prisma.idempotencyClaim.deleteMany({ where: { scope, key } });
}

/** Fire-once guard: true only for the first caller within `ttlMs`. */
export async function claimOnce(scope: string, key: string, ttlMs: number) {
  const r = await claimIdempotency(scope, key, ttlMs);
  return r.ok;
}

/**
 * Short mutation lock (e.g. one checkout per user at a time).
 * Returns a release function, or null when the lock is already held.
 */
export async function acquireLock(scope: string, key: string, ttlMs = 30_000) {
  const r = await claimIdempotency(`lock:${scope}`, key, ttlMs);
  if (!r.ok) return null;
  return () => releaseIdempotency(`lock:${scope}`, key).catch(() => undefined);
}
