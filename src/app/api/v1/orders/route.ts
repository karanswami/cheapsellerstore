import { maintenanceApiBlock } from "@/lib/maintenance";
import { withSellerApi } from "@/lib/seller-api/handler";
import {
  createAndFulfillApiOrder,
  listApiOrdersForUser,
} from "@/lib/seller-api/orders";
import {
  claimIdempotency,
  completeIdempotency,
  releaseIdempotency,
} from "@/lib/idempotency";
import type { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withSellerApi(req, "orders:read", async (ctx) => {
    if (ctx.isSandbox) {
      return {
        data: {
          page: 1,
          limit: 20,
          total: 0,
          hasMore: false,
          items: [],
          sandbox: true,
        },
      };
    }
    const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
    const list = await listApiOrdersForUser(ctx.user.id, page, limit);
    return { data: list };
  });
}

export async function POST(req: NextRequest) {
  const maint = await maintenanceApiBlock();
  if (maint) return maint;

  return withSellerApi(req, "orders:write", async (ctx) => {
    const idemKeyRaw = req.headers.get("idempotency-key")?.trim() || null;
    if (!idemKeyRaw) {
      return {
        error: {
          code: "IDEMPOTENCY_REQUIRED",
          message:
            "Header Idempotency-Key is required (UUID recommended). Retries with the same key are safe.",
          status: 400,
        },
      };
    }

    const idemKey: string = idemKeyRaw;
    if (!/^[A-Za-z0-9._:\-]{1,200}$/.test(idemKey)) {
      return {
        error: {
          code: "INVALID_IDEMPOTENCY_KEY",
          message: "Idempotency-Key must be 1-200 chars of A-Z a-z 0-9 . _ : -",
          status: 400,
        },
      };
    }

    // Atomic claim: concurrent duplicates cannot both pass (unique index), so no double order.
    const scope = `api-order:${ctx.user.id}`;
    const claim = await claimIdempotency(scope, idemKey, 24 * 60 * 60 * 1000);
    if (!claim.ok) {
      if (claim.inFlight || claim.statusCode == null) {
        return {
          error: {
            code: "REQUEST_IN_PROGRESS",
            message: "A request with this Idempotency-Key is still processing.",
            status: 409,
          },
        };
      }
      const cachedBody = claim.body as
        | { error?: { code: string; message: string }; data?: unknown }
        | null;
      if (cachedBody?.error) {
        return {
          error: {
            code: cachedBody.error.code,
            message: cachedBody.error.message,
            status: claim.statusCode,
          },
        };
      }
      return { data: cachedBody?.data };
    }

    let finished = false;
    try {
      const out = await runOrder();
      finished = true;
      return out;
    } finally {
      // Validation errors / crashes leave no stored result: free the key so a corrected retry works.
      if (!finished) await releaseIdempotency(scope, idemKey).catch(() => undefined);
    }

    async function runOrder() {
    let body: {
      sku?: string | number;
      duration?: string | number;
      quantity?: number;
      price?: unknown;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return {
        error: {
          code: "INVALID_BODY",
          message: "JSON body required.",
          status: 400,
        },
      };
    }

    // Security: ignore any client-supplied price fields.
    void body.price;

    const sku = String(body.sku ?? body.duration ?? "").trim();
    const quantity = Number(body.quantity ?? 1);
    if (!sku) {
      return {
        error: {
          code: "UNKNOWN_DURATION",
          message: "Field sku (number from GET /api/v1/products) is required. Alias: duration.",
          status: 400,
        },
      };
    }

    const result = await createAndFulfillApiOrder({
      userId: ctx.user.id,
      buyerEmail: ctx.user.email,
      role: ctx.user.role as UserRole,
      duration: sku,
      quantity,
      sandbox: ctx.isSandbox,
    });

    if (!result.ok) {
      const status =
        result.code === "INSUFFICIENT_BALANCE"
          ? 402
          : result.code === "BUSY"
            ? 409
            : result.code === "UNKNOWN_DURATION" ||
                result.code === "DURATION_REQUIRED"
              ? result.code === "DURATION_REQUIRED"
                ? 400
                : 404
              : 400;
      const errorBody = {
        error: { code: result.code, message: result.message },
      };
      await completeIdempotency(scope, idemKey, status, errorBody);
      return {
        error: {
          code: result.code,
          message: result.message,
          status,
        },
      };
    }

    const okBody = { data: result.order };
    await completeIdempotency(scope, idemKey, 200, okBody);

    return {
      data: result.order,
    };
    }
  });
}
