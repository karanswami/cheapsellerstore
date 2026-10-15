import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(sp.get("limit") ?? "20", 10) || 20),
  );
  const okRaw = sp.get("ok");
  const okFilter =
    okRaw === "true" ? true : okRaw === "false" ? false : undefined;
  const fallbackRaw = sp.get("fallback");
  const fallbackOnly = fallbackRaw === "true";

  const where = {
    ...(okFilter === undefined ? {} : { ok: okFilter }),
    ...(fallbackOnly ? { usedFallback: true } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.supplierApiLog.count({ where }),
    prisma.supplierApiLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return jsonOk({
    page,
    limit,
    total,
    hasMore: page * limit < total,
    rows: rows.map((r) => ({
      id: r.id,
      endpoint: r.endpoint,
      method: r.method,
      httpStatus: r.httpStatus,
      ok: r.ok,
      productId: r.productId,
      quantity: r.quantity,
      idempotencyKey: r.idempotencyKey,
      orderId: r.orderId,
      durationId: r.durationId,
      userId: r.userId,
      requestJson: r.requestJson,
      responseJson: r.responseJson,
      usedFallback: r.usedFallback,
      errorCode: r.errorCode,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
