import { prisma } from "@/lib/prisma";
import { newRequestId, safeEqualHex, sha256Hex } from "@/lib/seller-api/crypto";
import { checkApiRateLimit } from "@/lib/seller-api/rate-limit";
import {
  getApiBurstLimit,
  getApiDefaultRateLimitRpm,
  getApiPlatformEnabled,
  getApiAllowedRoles,
  roleAllowed,
} from "@/lib/seller-api/settings";
import type {
  SellerApiKey,
  SellerApiKeyMode,
  User,
  UserRole,
} from "@prisma/client";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export const API_SCOPES = [
  "balance:read",
  "catalog:read",
  "orders:read",
  "orders:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export type AuthenticatedApiKey = {
  requestId: string;
  key: SellerApiKey;
  user: Pick<
    User,
    | "id"
    | "email"
    | "role"
    | "banned"
    | "apiEnabled"
    | "walletBalance"
    | "username"
    | "name"
  >;
  mode: SellerApiKeyMode;
  isSandbox: boolean;
  rateLimitRpm: number;
  rateLimit: {
    limit: number;
    remaining: number;
    resetAt: number;
  };
};

export type AuthFail = {
  ok: false;
  code: string;
  message: string;
  status: number;
  requestId: string;
  retryAfterSec?: number;
  rateLimit?: AuthenticatedApiKey["rateLimit"];
};

export type AuthOk = { ok: true; ctx: AuthenticatedApiKey };

function clientIp(req: NextRequest): string | null {
  // Never trust a client-supplied leftmost X-Forwarded-For: it would let anyone bypass an IP allowlist.
  const ip = clientIpFromHeaders(req.headers);
  return ip === "unknown" ? null : ip;
}

function extractBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}

export async function authenticateApiRequest(
  req: NextRequest,
  requiredScope?: ApiScope,
): Promise<AuthOk | AuthFail> {
  const requestId = newRequestId();
  const secret = extractBearer(req);
  if (!secret) {
    return {
      ok: false,
      code: "INVALID_API_KEY",
      message: "Missing Authorization Bearer token.",
      status: 401,
      requestId,
    };
  }

  const hash = sha256Hex(secret);
  const key = await prisma.sellerApiKey.findUnique({ where: { keyHash: hash } });
  if (!key || !safeEqualHex(key.keyHash, hash)) {
    return {
      ok: false,
      code: "INVALID_API_KEY",
      message: "Invalid API key.",
      status: 401,
      requestId,
    };
  }

  if (key.status === "REVOKED") {
    return {
      ok: false,
      code: "KEY_REVOKED",
      message: "API key has been revoked.",
      status: 403,
      requestId,
    };
  }

  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      code: "KEY_REVOKED",
      message: "API key has expired.",
      status: 403,
      requestId,
    };
  }

  const platformOn = await getApiPlatformEnabled();
  if (!platformOn) {
    return {
      ok: false,
      code: "PLATFORM_DISABLED",
      message: "Platform API is temporarily disabled.",
      status: 503,
      requestId,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: key.userId },
    select: {
      id: true,
      email: true,
      role: true,
      banned: true,
      apiEnabled: true,
      walletBalance: true,
      username: true,
      name: true,
    },
  });

  if (!user || user.banned) {
    return {
      ok: false,
      code: "USER_API_DISABLED",
      message: "Account cannot use the API.",
      status: 403,
      requestId,
    };
  }

  if (user.apiEnabled === false) {
    return {
      ok: false,
      code: "USER_API_DISABLED",
      message: "API access disabled for this account.",
      status: 403,
      requestId,
    };
  }

  const allowed = await getApiAllowedRoles();
  if (!roleAllowed(user.role as UserRole, allowed)) {
    return {
      ok: false,
      code: "ROLE_NOT_ALLOWED",
      message: "Your role is not allowed to use the Platform API. API access is exclusively available for Seller and Reseller accounts.",
      status: 403,
      requestId,
    };
  }

  if (key.ipAllowlist.length > 0) {
    const ip = clientIp(req);
    if (!ip || !key.ipAllowlist.includes(ip)) {
      return {
        ok: false,
        code: "IP_DENIED",
        message: "Request IP is not on the allowlist.",
        status: 403,
        requestId,
      };
    }
  }

  if (requiredScope && !key.scopes.includes(requiredScope)) {
    return {
      ok: false,
      code: "SCOPE_DENIED",
      message: `Missing scope: ${requiredScope}`,
      status: 403,
      requestId,
    };
  }

  const [effectiveBaseRpm, burst] = await Promise.all([
    getApiDefaultRateLimitRpm(),
    getApiBurstLimit(),
  ]);
  const rpm = key.rateLimitRpm && key.rateLimitRpm > 0
    ? Math.min(key.rateLimitRpm, effectiveBaseRpm, 300)
    : effectiveBaseRpm;

  const rl = await checkApiRateLimit({
    apiKeyId: key.id,
    rpm,
    burst,
  });

  if (!rl.allowed) {
    return {
      ok: false,
      code: "BUSY",
      message: `Busy — rate limit ${rpm}/min. Retry shortly.`,
      status: 429,
      requestId,
      retryAfterSec: rl.retryAfterSec,
      rateLimit: {
        limit: rl.limit,
        remaining: 0,
        resetAt: rl.resetAt,
      },
    };
  }

  void prisma.sellerApiKey
    .update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    ok: true,
    ctx: {
      requestId,
      key,
      user,
      mode: key.mode,
      isSandbox: key.mode === "SANDBOX",
      rateLimitRpm: rpm,
      rateLimit: {
        limit: rl.limit,
        remaining: rl.remaining,
        resetAt: rl.resetAt,
      },
    },
  };
}

export function rateLimitHeaders(
  rl: AuthenticatedApiKey["rateLimit"],
  requestId: string,
  retryAfterSec?: number,
): HeadersInit {
  const h: Record<string, string> = {
    "X-Request-Id": requestId,
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(rl.resetAt),
  };
  if (retryAfterSec) h["Retry-After"] = String(retryAfterSec);
  return h;
}

export async function logApiUsage(input: {
  userId: string;
  apiKeyId: string;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip?: string | null;
  errorCode?: string | null;
}) {
  await prisma.sellerApiUsage.create({
    data: {
      userId: input.userId,
      apiKeyId: input.apiKeyId,
      requestId: input.requestId,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode,
      durationMs: input.durationMs,
      ip: input.ip ?? null,
      errorCode: input.errorCode ?? null,
    },
  });
}

export function getClientIp(req: NextRequest): string | null {
  return clientIp(req);
}

/**
 * Optional Bearer auth for public catalog/pricing — enriches with yourPrice.
 * Missing/invalid key → null (does not fail the public request).
 */
export async function tryOptionalApiAuth(
  req: NextRequest,
): Promise<AuthenticatedApiKey | null> {
  const secret = extractBearer(req);
  if (!secret) return null;
  const auth = await authenticateApiRequest(req, undefined);
  if (!auth.ok) return null;
  return auth.ctx;
}
