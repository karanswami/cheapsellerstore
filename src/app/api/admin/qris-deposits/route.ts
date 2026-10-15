import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { DepositMethod, DepositStatus, type Prisma } from "@prisma/client";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** AutoGoPay go-live: analytics ignore anything older (WIB midnight). */
const ANALYTICS_START = new Date("2026-10-14T00:00:00+07:00");
const MAX_ROWS = 20_000;
const MAX_LIMIT = 100;

/** Start of the WIB (UTC+7) day containing `date`, as a UTC Date. */
function startOfWibDay(date: Date): Date {
  const shifted = date.getTime() + WIB_OFFSET_MS;
  return new Date(Math.floor(shifted / DAY_MS) * DAY_MS - WIB_OFFSET_MS);
}

function parseWibDate(raw: string | null): Date | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function wibDayKey(date: Date): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

function parseAmount(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(request.url);
  const sp = url.searchParams;
  const now = new Date();
  const todayStart = startOfWibDay(now);

  const range = sp.get("range") || "7d";
  let from = todayStart;
  let to = new Date(todayStart.getTime() + DAY_MS);
  if (range === "custom") {
    const f = parseWibDate(sp.get("from"));
    const t = parseWibDate(sp.get("to"));
    if (f) from = f;
    if (t) to = new Date(t.getTime() + DAY_MS);
    else to = new Date(from.getTime() + DAY_MS);
    if (to <= from) to = new Date(from.getTime() + DAY_MS);
  } else if (range === "yesterday") {
    from = new Date(todayStart.getTime() - DAY_MS);
    to = todayStart;
  } else if (range === "all") {
    from = new Date(0);
  } else if (range !== "today") {
    const days = { "7d": 7, "30d": 30, "90d": 90 }[range] ?? 7;
    from = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
  }

  if (from < ANALYTICS_START) from = ANALYTICS_START;
  if (to <= from) to = new Date(from.getTime() + DAY_MS);

  const statusParam = (sp.get("status") || "all").toUpperCase();
  const status =
    statusParam !== "ALL" && statusParam in DepositStatus
      ? (statusParam as DepositStatus)
      : undefined;

  const q = (sp.get("q") || "").trim();
  const minAmount = parseAmount(sp.get("minAmount"));
  const maxAmount = parseAmount(sp.get("maxAmount"));
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(sp.get("limit")) || 20));

  const base: Prisma.DepositWhereInput = {
    method: DepositMethod.QRIS,
    createdAt: { gte: from, lt: to },
  };
  if (minAmount !== undefined || maxAmount !== undefined) {
    base.payableAmount = {
      ...(minAmount !== undefined ? { gte: minAmount } : {}),
      ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
    };
  }
  if (q) {
    const userMatch = {
      user: {
        is: {
          OR: [
            { username: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        },
      },
    };
    base.OR = [
      { providerDepositId: { contains: q, mode: "insensitive" } },
      { providerReference: { contains: q, mode: "insensitive" } },
      ...(/^[0-9a-fA-F]{24}$/.test(q) ? [{ id: q }] : []),
      userMatch,
    ];
  }

  const listWhere: Prisma.DepositWhereInput = status
    ? { ...base, status }
    : base;

  // Summary + daily series ignore the status filter so every status shows.
  const [rows, total, deposits] = await Promise.all([
    prisma.deposit.findMany({
      where: base,
      select: {
        status: true,
        payableAmount: true,
        paidAmount: true,
        amount: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
    }),
    prisma.deposit.count({ where: listWhere }),
    prisma.deposit.findMany({
      where: listWhere,
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const summary = {
    total: rows.length,
    completed: 0,
    failed: 0,
    expired: 0,
    cancelled: 0,
    open: 0,
    paidIdr: 0,
    creditedMicrocents: 0,
    avgIdr: 0,
    successRate: 0,
  };
  const daily = new Map<
    string,
    { date: string; count: number; completed: number; failed: number; paidIdr: number; creditedMicrocents: number }
  >();

  for (const r of rows) {
    const key = wibDayKey(r.createdAt);
    let day = daily.get(key);
    if (!day) {
      day = { date: key, count: 0, completed: 0, failed: 0, paidIdr: 0, creditedMicrocents: 0 };
      daily.set(key, day);
    }
    day.count += 1;
    switch (r.status) {
      case DepositStatus.COMPLETED: {
        const idr = r.paidAmount ?? r.payableAmount;
        summary.completed += 1;
        summary.paidIdr += idr;
        summary.creditedMicrocents += r.amount;
        day.completed += 1;
        day.paidIdr += idr;
        day.creditedMicrocents += r.amount;
        break;
      }
      case DepositStatus.FAILED:
        summary.failed += 1;
        day.failed += 1;
        break;
      case DepositStatus.EXPIRED:
        summary.expired += 1;
        day.failed += 1;
        break;
      case DepositStatus.CANCELLED:
        summary.cancelled += 1;
        day.failed += 1;
        break;
      default:
        summary.open += 1;
    }
  }
  summary.avgIdr = summary.completed ? Math.round(summary.paidIdr / summary.completed) : 0;
  summary.successRate = summary.total
    ? Math.round((summary.completed / summary.total) * 1000) / 10
    : 0;

  return jsonOk({
    range: { from: from.toISOString(), to: to.toISOString() },
    truncated: rows.length >= MAX_ROWS,
    summary,
    daily: [...daily.values()].sort((a, b) => (a.date < b.date ? 1 : -1)),
    deposits: deposits.map((d) => ({
      id: d.id,
      status: d.status,
      payableAmount: d.payableAmount,
      paidAmount: d.paidAmount,
      amount: d.amount,
      providerDepositId: d.providerDepositId,
      providerReference: d.providerReference,
      failReason: d.failReason,
      createdAt: d.createdAt,
      completedAt: d.completedAt,
      expiresAt: d.expiresAt,
      user: d.user,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}
