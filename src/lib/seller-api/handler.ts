import { jsonError, jsonOk } from "@/lib/api";
import {
  authenticateApiRequest,
  getClientIp,
  logApiUsage,
  rateLimitHeaders,
  tryOptionalApiAuth,
  type ApiScope,
  type AuthenticatedApiKey,
  type AuthFail,
} from "@/lib/seller-api/auth";
import { newRequestId } from "@/lib/seller-api/crypto";
import { checkPublicIpRateLimit } from "@/lib/seller-api/rate-limit";
import { getApiPublicRateLimitRpm } from "@/lib/seller-api/settings";
import type { NextRequest } from "next/server";

export type PublicApiCtx = {
  requestId: string;
  ip: string | null;
  /** Present when a valid Bearer key was optionally sent. */
  auth: AuthenticatedApiKey | null;
  rateLimit: AuthenticatedApiKey["rateLimit"];
};

export async function withSellerApi(
  req: NextRequest,
  scope: ApiScope | undefined,
  handler: (ctx: AuthenticatedApiKey) => Promise<{
    data?: unknown;
    error?: { code: string; message: string; status: number };
    feeMicrocents?: number;
  }>,
) {
  const started = Date.now();
  const path = req.nextUrl.pathname;
  const method = req.method;
  const ip = getClientIp(req);

  const auth = await authenticateApiRequest(req, scope);
  if (!auth.ok) {
    const fail = auth as AuthFail;
    const headers = rateLimitHeaders(
      fail.rateLimit ?? { limit: 0, remaining: 0, resetAt: 0 },
      fail.requestId,
      fail.retryAfterSec,
    );
    return jsonError(fail.code, fail.message, fail.status, { headers });
  }

  const ctx = auth.ctx;
  try {
    const result = await handler(ctx);
    const durationMs = Date.now() - started;
    if (result.error) {
      await logApiUsage({
        userId: ctx.user.id,
        apiKeyId: ctx.key.id,
        requestId: ctx.requestId,
        method,
        path,
        statusCode: result.error.status,
        feeMicrocents: 0,
        durationMs,
        ip,
        errorCode: result.error.code,
      }).catch(() => undefined);
      return jsonError(result.error.code, result.error.message, result.error.status, {
        headers: rateLimitHeaders(
          ctx.rateLimit,
          ctx.requestId,
          result.error.status === 429 ? 60 : undefined,
        ),
      });
    }

    await logApiUsage({
      userId: ctx.user.id,
      apiKeyId: ctx.key.id,
      requestId: ctx.requestId,
      method,
      path,
      statusCode: 200,
      feeMicrocents: result.feeMicrocents ?? 0,
      durationMs,
      ip,
    }).catch(() => undefined);

    return jsonOk(result.data, {
      headers: rateLimitHeaders(ctx.rateLimit, ctx.requestId),
    });
  } catch (e) {
    const durationMs = Date.now() - started;
    await logApiUsage({
      userId: ctx.user.id,
      apiKeyId: ctx.key.id,
      requestId: ctx.requestId,
      method,
      path,
      statusCode: 500,
      durationMs,
      ip,
      errorCode: "INTERNAL",
    }).catch(() => undefined);
    console.error("[seller-api]", e);
    return jsonError("INTERNAL", "Internal server error.", 500, {
      headers: rateLimitHeaders(ctx.rateLimit, ctx.requestId),
    });
  }
}

/** Public product/pricing/stock — no key required; optional Bearer for yourPrice. */
export async function withPublicApi(
  req: NextRequest,
  handler: (ctx: PublicApiCtx) => Promise<{
    data?: unknown;
    error?: { code: string; message: string; status: number };
  }>,
) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const rpm = await getApiPublicRateLimitRpm();
  const rl = checkPublicIpRateLimit({
    ip: ip || "unknown",
    rpm,
  });

  const rateLimit = {
    limit: rl.limit,
    remaining: rl.remaining,
    resetAt: rl.resetAt,
  };

  if (!rl.allowed) {
    return jsonError(
      "BUSY",
      "Busy — rate limit 100/min. Retry shortly.",
      429,
      {
        headers: rateLimitHeaders(rateLimit, requestId, rl.retryAfterSec),
      },
    );
  }

  const auth = await tryOptionalApiAuth(req);
  try {
    const result = await handler({
      requestId,
      ip,
      auth,
      rateLimit,
    });
    if (result.error) {
      return jsonError(
        result.error.code,
        result.error.message,
        result.error.status,
        { headers: rateLimitHeaders(rateLimit, requestId) },
      );
    }
    return jsonOk(result.data, {
      headers: rateLimitHeaders(rateLimit, requestId),
    });
  } catch (e) {
    console.error("[public-api]", e);
    return jsonError("INTERNAL", "Internal server error.", 500, {
      headers: rateLimitHeaders(rateLimit, requestId),
    });
  }
}
