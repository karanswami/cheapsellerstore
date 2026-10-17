import { maintenanceApiBlock } from "@/lib/maintenance";
import { withSellerApi } from "@/lib/seller-api/handler";
import {
  createAndFulfillApiOrder,
  getIdempotentResponse,
  listApiOrdersForUser,
  saveIdempotentResponse,
} from "@/lib/seller-api/orders";
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
    const idemKey = req.headers.get("idempotency-key")?.trim() || null;
    if (!idemKey) {
      return {
        error: {
          code: "IDEMPOTENCY_REQUIRED",
          message:
            "Header Idempotency-Key is required (UUID recommended). Retries with the same key are safe.",
          status: 400,
        },
      };
    }

    const cached = await getIdempotentResponse(ctx.user.id, idemKey);
    if (cached) {
      if (
        cached.body &&
        typeof cached.body === "object" &&
        "error" in (cached.body as object)
      ) {
        const err = (cached.body as { error: { code: string; message: string } })
          .error;
        return {
          error: {
            code: err.code,
            message: err.message,
            status: cached.statusCode,
          },
        };
      }
      return {
        data: (cached.body as { data: unknown }).data,
      };
    }

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
      await saveIdempotentResponse({
        userId: ctx.user.id,
        key: idemKey,
        statusCode: status,
        body: errorBody,
      });
      return {
        error: {
          code: result.code,
          message: result.message,
          status,
        },
      };
    }

    const okBody = { data: result.order };
    await saveIdempotentResponse({
      userId: ctx.user.id,
      key: idemKey,
      statusCode: 200,
      body: okBody,
    });

    return {
      data: result.order,
    };
  });
}
