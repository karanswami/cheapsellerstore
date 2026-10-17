import "server-only";
import { NextResponse } from "next/server";
import {
  claimIdempotency,
  completeIdempotency,
  normalizeIdempotencyKey,
  releaseIdempotency,
} from "@/lib/idempotency";

/**
 * Run `handler` at most once per (scope, Idempotency-Key). Retries with the same key get the
 * original response back; a retry while the first is still running gets 409.
 * No header → handler just runs (callers keep their own locks for that case).
 * 5xx results are not stored, so a genuine server failure can be retried with the same key.
 */
export async function withIdempotency(
  request: Request,
  scope: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const raw = request.headers.get("idempotency-key");
  if (raw == null || raw.trim() === "") return handler();
  const key = normalizeIdempotencyKey(raw);
  if (!key) {
    return NextResponse.json(
      { error: { code: "INVALID_IDEMPOTENCY_KEY", message: "Idempotency-Key must be 1-200 chars of A-Z a-z 0-9 . _ : -" } },
      { status: 400 },
    );
  }

  const claim = await claimIdempotency(scope, key, 10 * 60 * 1000);
  if (!claim.ok) {
    if (claim.inFlight || claim.statusCode == null) {
      return NextResponse.json(
        { error: { code: "REQUEST_IN_PROGRESS", message: "This request is already being processed." } },
        { status: 409 },
      );
    }
    return NextResponse.json(claim.body, {
      status: claim.statusCode,
      headers: { "Idempotent-Replayed": "true" },
    });
  }

  let res: Response;
  try {
    res = await handler();
  } catch (e) {
    await releaseIdempotency(scope, key).catch(() => undefined);
    throw e;
  }
  if (res.status >= 500) {
    await releaseIdempotency(scope, key).catch(() => undefined);
    return res;
  }
  try {
    const body = await res.clone().json();
    await completeIdempotency(scope, key, res.status, body);
  } catch {
    await releaseIdempotency(scope, key).catch(() => undefined);
  }
  return res;
}
