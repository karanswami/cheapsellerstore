import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { getManualDepositMethods } from "@/lib/manual-deposit-methods";
import { prisma } from "@/lib/prisma";
import type { DepositStatus, Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_GROUPS: Record<string, DepositStatus[]> = {
  OPEN: ["PENDING", "PROCESSING"],
  PENDING: ["PENDING"],
  PROCESSING: ["PROCESSING"],
  COMPLETED: ["COMPLETED"],
  FAILED: ["FAILED"],
  CANCELLED: ["CANCELLED"],
  EXPIRED: ["EXPIRED"],
};

function parseAmount(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Pending deposits = manual-payment deposits only (proof review queue). */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(sp.get("limit")) || DEFAULT_LIMIT));

  const statusKey = (sp.get("status") || "open").toUpperCase();
  const statuses = STATUS_GROUPS[statusKey];
  const range = sp.get("range") || "all";
  const days = { today: 1, "7d": 7, "30d": 30 }[range];
  const methodKey = (sp.get("method") || "").trim();
  const proof = sp.get("proof");
  const q = (sp.get("q") || "").trim();
  const minAmount = parseAmount(sp.get("minAmount"));
  const maxAmount = parseAmount(sp.get("maxAmount"));
  const sort = sp.get("sort") || "newest";

  // Filters shared by the list and the summary cards (status excluded).
  const base: Prisma.DepositWhereInput = { method: "MANUAL" };
  if (days) {
    const since =
      range === "today"
        ? new Date(new Date().setHours(0, 0, 0, 0))
        : new Date(Date.now() - days * DAY_MS);
    base.createdAt = { gte: since };
  }
  if (methodKey) base.manualMethodKey = methodKey;
  if (proof === "with") base.proofImage = { not: null };
  if (proof === "without") base.proofImage = null;
  if (minAmount !== undefined || maxAmount !== undefined) {
    base.amount = {
      ...(minAmount !== undefined ? { gte: minAmount } : {}),
      ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
    };
  }
  if (q) {
    base.OR = [
      { user: { is: { username: { contains: q, mode: "insensitive" } } } },
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
      ...(/^[0-9a-fA-F]{24}$/.test(q) ? [{ id: q }] : []),
    ];
  }

  const where: Prisma.DepositWhereInput = statuses ? { ...base, status: { in: statuses } } : base;
  const orderBy: Prisma.DepositOrderByWithRelationInput[] =
    sort === "oldest"
      ? [{ createdAt: "asc" }]
      : sort === "amount"
        ? [{ amount: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const [total, deposits, manualMethods, byStatus] = await Promise.all([
    prisma.deposit.count({ where }),
    prisma.deposit.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, username: true, banned: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    getManualDepositMethods(),
    prisma.deposit.groupBy({
      by: ["status"],
      where: base,
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const count = (s: DepositStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
  const sum = (s: DepositStatus) => byStatus.find((r) => r.status === s)?._sum.amount ?? 0;
  const summary = {
    open: count("PENDING") + count("PROCESSING"),
    pending: count("PENDING"),
    processing: count("PROCESSING"),
    openAmount: sum("PENDING") + sum("PROCESSING"),
    completed: count("COMPLETED"),
    completedAmount: sum("COMPLETED"),
    rejected: count("FAILED") + count("CANCELLED") + count("EXPIRED"),
  };

  const manualNameById = new Map(manualMethods.map((m) => [m.id, m.name]));

  return jsonOk({
    deposits: deposits.map((d) => ({
      ...d,
      manualMethodName:
        d.manualMethodKey != null ? manualNameById.get(d.manualMethodKey) ?? d.manualMethodKey : null,
    })),
    methods: manualMethods.map((m) => ({ id: m.id, name: m.name })),
    summary,
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}
