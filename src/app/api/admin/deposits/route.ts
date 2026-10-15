import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { getManualDepositMethods } from "@/lib/manual-deposit-methods";
import { prisma } from "@/lib/prisma";
import type { DepositStatus, Prisma } from "@prisma/client";
import { DEPOSIT_REVIEW_ACTION } from "@/lib/deposit-review";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;

function parseStatusFilter(raw: string | null): DepositStatus[] | undefined {
  if (!raw || raw === "all") return undefined;
  const upper = raw.toUpperCase();
  if (upper === "PENDING") return ["PENDING"];
  if (upper === "PROCESSING") return ["PROCESSING"];
  if (upper === "OPEN") return ["PENDING", "PROCESSING"];
  return undefined;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get("limit") || DEFAULT_LIMIT) || DEFAULT_LIMIT),
  );
  const statusParam = url.searchParams.get("status");
  const statuses = parseStatusFilter(statusParam);
  const defaultOpen = statusParam === null;
  // Automatic rails (QRIS, Binance, UPI…) are credited automatically; this
  // page lists manual proof-review deposits plus auto deposits flagged for review.
  const where: Prisma.DepositWhereInput = {
    OR: [{ method: "MANUAL" }, { adminAction: DEPOSIT_REVIEW_ACTION }],
    ...(defaultOpen
      ? { status: { in: ["PENDING", "PROCESSING"] } }
      : statuses
        ? { status: { in: statuses } }
        : {}),
  };

  const [total, deposits, manualMethods] = await Promise.all([
    prisma.deposit.count({ where }),
    prisma.deposit.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            banned: true,
          },
        },
      },
      orderBy: [{ proofUploadedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    getManualDepositMethods(),
  ]);

  const manualNameById = new Map(manualMethods.map((m) => [m.id, m.name]));

  return jsonOk({
    deposits: deposits.map((d) => ({
      ...d,
      manualMethodName:
        d.manualMethodKey != null
          ? manualNameById.get(d.manualMethodKey) ?? d.manualMethodKey
          : null,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}
