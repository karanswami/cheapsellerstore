import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/currencies";
import { DepositStatus } from "@prisma/client";
import type {
  IssueReportKind,
  IssueReportStatus,
  Prisma,
} from "@prisma/client";
import { notifyTelegram } from "@/lib/telegram-notify";
import { notifyUser } from "@/lib/notifications";

const ELIGIBLE_DEPOSIT_STATUSES: DepositStatus[] = [
  DepositStatus.FAILED,
  DepositStatus.EXPIRED,
];

export type IssueReportUser = {
  id: string;
  name: string;
  email: string;
  username: string;
};

export type IssueReportDeposit = {
  id: string;
  amount: number;
  payCurrency: string;
  requestedAmount: number;
  payableAmount: number;
  status: string;
  method: string;
  manualMethodKey?: string | null;
  failReason?: string | null;
  proofImage?: string | null;
  createdAt: string;
};

export type IssueReportKeyDetails = {
  keyId: string;
  code: string;
  maskedCode?: string;
  productTitle: string;
  durationLabel: string;
  orderId: string | null;
  purchasedAt: string | null;
};

export type IssueReportRow = {
  id: string;
  userId: string;
  kind: IssueReportKind;
  status: IssueReportStatus;
  subject: string;
  explanation: string;
  screenshotUrl: string | null;
  depositId: string | null;
  orderId: string | null;
  keyId: string | null;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: IssueReportUser;
  deposit?: IssueReportDeposit | null;
  keyDetails?: IssueReportKeyDetails | null;
};

function maskKeyCode(code: string): string {
  if (!code) return "••••";
  if (code.length <= 4) return "••••";
  return `${"•".repeat(Math.min(8, code.length - 4))}${code.slice(-4)}`;
}

function formatDateTimeUtc(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function serialize(row: {
  id: string;
  userId: string;
  kind: IssueReportKind;
  status: IssueReportStatus;
  subject: string;
  explanation: string;
  screenshotUrl: string | null;
  depositId: string | null;
  orderId: string | null;
  keyId: string | null;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
    username: string;
    };
  deposit?: IssueReportDeposit | null;
  keyDetails?: IssueReportKeyDetails | null;
}): IssueReportRow {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    status: row.status,
    subject: row.subject,
    explanation: row.explanation,
    screenshotUrl: row.screenshotUrl,
    depositId: row.depositId,
    orderId: row.orderId,
    keyId: row.keyId,
    adminNote: row.adminNote,
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user: row.user
      ? {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
          username: row.user.username,
        }
      : undefined,
    deposit: row.deposit ?? null,
    keyDetails: row.keyDetails ?? null,
  };
}

async function fetchDepositDetailsMap(depositIds: string[]) {
  const map = new Map<string, IssueReportDeposit>();
  if (depositIds.length === 0) return map;

  const deposits = await prisma.deposit.findMany({
    where: { id: { in: depositIds } },
    select: {
      id: true,
      amount: true,
      payCurrency: true,
      requestedAmount: true,
      payableAmount: true,
      status: true,
      method: true,
      manualMethodKey: true,
      failReason: true,
      proofImage: true,
      createdAt: true,
    },
  });

  for (const d of deposits) {
    map.set(d.id, {
      id: d.id,
      amount: d.amount,
      payCurrency: d.payCurrency ?? "USD",
      requestedAmount: d.requestedAmount ?? 0,
      payableAmount: d.payableAmount ?? 0,
      status: d.status,
      method: d.method,
      manualMethodKey: d.manualMethodKey ?? null,
      failReason: d.failReason ?? null,
      proofImage: d.proofImage ?? null,
      createdAt: d.createdAt.toISOString(),
    });
  }

  return map;
}

async function fetchKeyDetailsMap(keyIds: string[]) {
  const map = new Map<string, IssueReportKeyDetails>();
  if (keyIds.length === 0) return map;

  const orderItems = await prisma.orderItem.findMany({
    where: { keyId: { in: keyIds } },
    select: {
      keyId: true,
      orderId: true,
      productTitle: true,
      durationLabel: true,
      createdAt: true,
      key: {
        select: {
          code: true,
          soldAt: true,
          createdAt: true,
        },
      },
    },
  });

  for (const oi of orderItems) {
    if (oi.keyId) {
      const fullCode = oi.key?.code ?? "";
      map.set(oi.keyId, {
        keyId: oi.keyId,
        code: fullCode,
        maskedCode: maskKeyCode(fullCode),
        productTitle: oi.productTitle,
        durationLabel: oi.durationLabel,
        orderId: oi.orderId,
        purchasedAt: (oi.key?.soldAt ?? oi.createdAt)?.toISOString() ?? null,
      });
    }
  }

  const missingIds = keyIds.filter((id) => !map.has(id));
  if (missingIds.length > 0) {
    const keys = await prisma.key.findMany({
      where: { id: { in: missingIds } },
      select: {
        id: true,
        code: true,
        soldAt: true,
        createdAt: true,
        orderId: true,
        duration: {
          select: {
            label: true,
            product: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    for (const k of keys) {
      map.set(k.id, {
        keyId: k.id,
        code: k.code,
        maskedCode: maskKeyCode(k.code),
        productTitle: k.duration?.product?.title ?? "Product Key",
        durationLabel: k.duration?.label ?? "",
        orderId: k.orderId ?? null,
        purchasedAt: (k.soldAt ?? k.createdAt)?.toISOString() ?? null,
      });
    }
  }

  return map;
}

const includeUser = {
  id: true,
  name: true,
  email: true,
  username: true,
} as const;

export async function listEligibleDepositsForReport(userId: string) {
  const deposits = await prisma.deposit.findMany({
    where: {
      userId,
      status: { in: ELIGIBLE_DEPOSIT_STATUSES },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      amount: true,
      payCurrency: true,
      requestedAmount: true,
      status: true,
      method: true,
      createdAt: true,
      failReason: true,
    },
  });
  return deposits.map((d) => ({
    id: d.id,
    amount: d.amount,
    payCurrency: d.payCurrency ?? "USD",
    requestedAmount: d.requestedAmount ?? 0,
    status: d.status,
    method: d.method,
    failReason: d.failReason,
    createdAt: d.createdAt.toISOString(),
  }));
}

/** Purchased (FULFILLED) keys the user can attach to a KEY report. */
export async function listEligibleKeysForReport(userId: string) {
  const items = await prisma.orderItem.findMany({
    where: {
      order: { userId, status: "FULFILLED" },
      keyId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      keyId: true,
      orderId: true,
      productTitle: true,
      durationLabel: true,
      createdAt: true,
      key: { select: { code: true, soldAt: true } },
    },
  });

  return items
    .filter((i): i is typeof i & { keyId: string } => Boolean(i.keyId))
    .map((i) => {
      const code = i.key?.code ?? "";
      return {
        keyId: i.keyId,
        orderId: i.orderId,
        orderItemId: i.id,
        productTitle: i.productTitle,
        durationLabel: i.durationLabel,
        maskedCode: maskKeyCode(code),
        createdAt: (i.key?.soldAt ?? i.createdAt).toISOString(),
      };
    });
}

export async function createIssueReport(input: {
  userId: string;
  kind: IssueReportKind;
  explanation: string;
  screenshotUrl?: string | null;
  depositId?: string | null;
  orderId?: string | null;
  keyId?: string | null;
  subject?: string | null;
}) {
  const explanation = input.explanation.trim().slice(0, 4000);
  if (explanation.length < 10) {
    return {
      ok: false as const,
      code: "VALIDATION",
      message: "Please explain the issue (at least 10 characters).",
    };
  }

  const screenshotUrl = input.screenshotUrl?.trim() || null;

  if (input.kind === "DEPOSIT") {
    if (!screenshotUrl) {
      return {
        ok: false as const,
        code: "VALIDATION",
        message: "A screenshot is required for deposit reports.",
      };
    }
    if (!input.depositId) {
      return {
        ok: false as const,
        code: "VALIDATION",
        message: "Select a failed or expired deposit.",
      };
    }
    const deposit = await prisma.deposit.findFirst({
      where: {
        id: input.depositId,
        userId: input.userId,
        status: { in: ELIGIBLE_DEPOSIT_STATUSES },
      },
    });
    if (!deposit) {
      return {
        ok: false as const,
        code: "NOT_FOUND",
        message: "Eligible deposit not found.",
      };
    }

    const openExisting = await prisma.issueReport.findFirst({
      where: {
        userId: input.userId,
        depositId: deposit.id,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      select: { id: true },
    });
    if (openExisting) {
      return {
        ok: false as const,
        code: "CONFLICT",
        message: "You already have an open report for this deposit.",
      };
    }

    const row = await prisma.issueReport.create({
      data: {
        userId: input.userId,
        kind: "DEPOSIT",
        subject: (input.subject?.trim() || "Deposit issue").slice(0, 120),
        explanation,
        screenshotUrl,
        depositId: deposit.id,
        status: "OPEN",
      },
      include: {
        user: { select: includeUser },
      },
    });

    // Mark deposit for legacy KPI continuity until overview uses IssueReport.
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        adminAction: "reported",
        adminNote: explanation.slice(0, 500),
      },
    });

    const depositSnap: IssueReportDeposit = {
      id: deposit.id,
      amount: deposit.amount,
      payCurrency: deposit.payCurrency ?? "USD",
      requestedAmount: deposit.requestedAmount ?? 0,
      payableAmount: deposit.payableAmount ?? 0,
      status: deposit.status,
      method: deposit.method,
      manualMethodKey: deposit.manualMethodKey ?? null,
      failReason: deposit.failReason ?? null,
      proofImage: deposit.proofImage ?? null,
      createdAt: deposit.createdAt.toISOString(),
    };

    const depositAmountStr =
      deposit.payCurrency && deposit.payCurrency !== "USD" && deposit.requestedAmount > 0
        ? `${deposit.requestedAmount} ${deposit.payCurrency} (${formatMoney(deposit.amount)})`
        : `${formatMoney(deposit.amount)}`;

    void notifyTelegram(
      "report",
      [
        "🚨 Issue report (DEPOSIT)",
        `User: @${row.user.username} (${row.user.email})`,
        `Deposit ID: ${deposit.id}`,
        `Amount: ${depositAmountStr}`,
        `Method: ${deposit.method}${deposit.manualMethodKey ? ` (${deposit.manualMethodKey})` : ""}`,
        `Deposit Status: ${deposit.status}${deposit.failReason ? ` (${deposit.failReason})` : ""}`,
        `Deposit Date: ${formatDateTimeUtc(deposit.createdAt)}`,
        `Subject: ${row.subject}`,
        `Explanation: ${explanation}`,
        ...(screenshotUrl ? [`Screenshot: ${screenshotUrl}`] : []),
        `Report ID: ${row.id}`,
        `Reported At: ${formatDateTimeUtc(row.createdAt)}`,
      ].join("\n"),
    );

    return {
      ok: true as const,
      report: serialize({ ...row, deposit: depositSnap, keyDetails: null }),
    };
  }

  // KEY — must select a purchased key
  if (!input.keyId?.trim()) {
    return {
      ok: false as const,
      code: "VALIDATION",
      message: "Select a purchased key to report.",
    };
  }

  const orderItem = await prisma.orderItem.findFirst({
    where: {
      keyId: input.keyId.trim(),
      order: { userId: input.userId, status: "FULFILLED" },
    },
    select: {
      keyId: true,
      orderId: true,
      productTitle: true,
      durationLabel: true,
      createdAt: true,
      key: {
        select: {
          code: true,
          soldAt: true,
          createdAt: true,
        },
      },
    },
  });
  if (!orderItem?.keyId) {
    return {
      ok: false as const,
      code: "NOT_FOUND",
      message: "Purchased key not found.",
    };
  }

  const openExisting = await prisma.issueReport.findFirst({
    where: {
      userId: input.userId,
      keyId: orderItem.keyId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    select: { id: true },
  });
  if (openExisting) {
    return {
      ok: false as const,
      code: "CONFLICT",
      message: "You already have an open report for this key.",
    };
  }

  const autoSubject =
    `${orderItem.productTitle} · ${orderItem.durationLabel}`.slice(0, 120);

  const row = await prisma.issueReport.create({
    data: {
      userId: input.userId,
      kind: "KEY",
      subject: (input.subject?.trim() || autoSubject || "Key issue").slice(
        0,
        120,
      ),
      explanation,
      screenshotUrl,
      orderId: orderItem.orderId,
      keyId: orderItem.keyId,
      status: "OPEN",
    },
    include: { user: { select: includeUser } },
  });

  const fullCode = orderItem.key?.code ?? "";
  const purchasedAt = orderItem.key?.soldAt ?? orderItem.createdAt;

  const keySnap: IssueReportKeyDetails = {
    keyId: orderItem.keyId,
    code: fullCode,
    maskedCode: maskKeyCode(fullCode),
    productTitle: orderItem.productTitle,
    durationLabel: orderItem.durationLabel,
    orderId: orderItem.orderId,
    purchasedAt: purchasedAt.toISOString(),
  };

  void notifyTelegram(
    "report",
    [
      "🚨 Issue report (KEY)",
      `User: @${row.user.username} (${row.user.email})`,
      `Product: ${orderItem.productTitle} — ${orderItem.durationLabel}`,
      `Key Code: ${fullCode || "N/A"}`,
      `Key ID: ${orderItem.keyId}`,
      `Order ID: ${orderItem.orderId}`,
      `Purchased At: ${formatDateTimeUtc(purchasedAt)}`,
      `Subject: ${row.subject}`,
      `Explanation: ${explanation}`,
      ...(screenshotUrl ? [`Screenshot: ${screenshotUrl}`] : []),
      `Report ID: ${row.id}`,
      `Reported At: ${formatDateTimeUtc(row.createdAt)}`,
    ].join("\n"),
  );

  return {
    ok: true as const,
    report: serialize({ ...row, deposit: null, keyDetails: keySnap }),
  };
}

export async function listUserIssueReports(
  userId: string,
  opts?: { page?: number; limit?: number },
) {
  const page = Math.max(1, opts?.page ?? 1);
  const limit = Math.min(40, Math.max(1, opts?.limit ?? 15));
  const skip = (page - 1) * limit;

  const where: Prisma.IssueReportWhereInput = { userId };
  const [rows, total] = await Promise.all([
    prisma.issueReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.issueReport.count({ where }),
  ]);

  const depositIds = rows
    .map((r) => r.depositId)
    .filter((id): id is string => Boolean(id));
  const keyIds = rows
    .map((r) => r.keyId)
    .filter((id): id is string => Boolean(id));

  const [depositMap, keyMap] = await Promise.all([
    fetchDepositDetailsMap(depositIds),
    fetchKeyDetailsMap(keyIds),
  ]);

  return {
    reports: rows.map((r) =>
      serialize({
        ...r,
        deposit: r.depositId ? depositMap.get(r.depositId) ?? null : null,
        keyDetails: r.keyId ? keyMap.get(r.keyId) ?? null : null,
      }),
    ),
    page,
    limit,
    total,
    hasMore: skip + rows.length < total,
  };
}

export async function getUserIssueReport(userId: string, id: string) {
  const row = await prisma.issueReport.findFirst({
    where: { id, userId },
  });
  if (!row) return null;

  const depositMap = row.depositId
    ? await fetchDepositDetailsMap([row.depositId])
    : new Map<string, IssueReportDeposit>();
  const keyMap = row.keyId
    ? await fetchKeyDetailsMap([row.keyId])
    : new Map<string, IssueReportKeyDetails>();

  return serialize({
    ...row,
    deposit: row.depositId ? depositMap.get(row.depositId) ?? null : null,
    keyDetails: row.keyId ? keyMap.get(row.keyId) ?? null : null,
  });
}

export async function listAdminIssueReports(opts?: {
  page?: number;
  limit?: number;
  status?: IssueReportStatus | "open" | "ALL";
  kind?: IssueReportKind | "ALL";
  q?: string;
}) {
  const page = Math.max(1, opts?.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts?.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.IssueReportWhereInput = {};
  if (opts?.status === "open") {
    where.status = { in: ["OPEN", "IN_PROGRESS"] };
  } else if (opts?.status && opts.status !== "ALL") {
    where.status = opts.status;
  }
  if (opts?.kind && opts.kind !== "ALL") {
    where.kind = opts.kind;
  }
  const q = opts?.q?.trim();
  if (q) {
    where.OR = [
      { subject: { contains: q } },
      { explanation: { contains: q } },
      { user: { email: { contains: q } } },
      { user: { username: { contains: q } } },
      { user: { name: { contains: q } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.issueReport.findMany({
      where,
      include: { user: { select: includeUser } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.issueReport.count({ where }),
  ]);

  const depositIds = rows
    .map((r) => r.depositId)
    .filter((id): id is string => Boolean(id));
  const keyIds = rows
    .map((r) => r.keyId)
    .filter((id): id is string => Boolean(id));

  const [depositMap, keyMap] = await Promise.all([
    fetchDepositDetailsMap(depositIds),
    fetchKeyDetailsMap(keyIds),
  ]);

  return {
    reports: rows.map((r) =>
      serialize({
        ...r,
        deposit: r.depositId ? depositMap.get(r.depositId) ?? null : null,
        keyDetails: r.keyId ? keyMap.get(r.keyId) ?? null : null,
      }),
    ),
    page,
    limit,
    total,
    hasMore: skip + rows.length < total,
  };
}

export async function updateIssueReportStatus(
  id: string,
  input: {
    status: IssueReportStatus;
    adminNote?: string | null;
    reviewedById?: string | null;
  },
) {
  try {
    const row = await prisma.issueReport.update({
      where: { id },
      data: {
        status: input.status,
        adminNote:
          input.adminNote !== undefined
            ? input.adminNote?.trim().slice(0, 500) || null
            : undefined,
        reviewedById: input.reviewedById ?? undefined,
        reviewedAt: new Date(),
      },
      include: { user: { select: includeUser } },
    });

    let deposit: IssueReportDeposit | null = null;
    if (row.depositId) {
      const depositMap = await fetchDepositDetailsMap([row.depositId]);
      deposit = depositMap.get(row.depositId) ?? null;
      if (
        input.status === "RESOLVED" ||
        input.status === "CLOSED"
      ) {
        await prisma.deposit.update({
          where: { id: row.depositId },
          data: {
            adminAction: "dismissed",
            adminNote: input.adminNote?.trim().slice(0, 500) || row.adminNote,
            reviewedAt: new Date(),
          },
        });
      }
    }

    const keyMap = row.keyId
      ? await fetchKeyDetailsMap([row.keyId])
      : new Map<string, IssueReportKeyDetails>();
    const keyDetails = row.keyId ? keyMap.get(row.keyId) ?? null : null;

    const statusEmoji =
      input.status === "RESOLVED"
        ? "✅"
        : input.status === "IN_PROGRESS"
          ? "🔄"
          : input.status === "CLOSED"
            ? "📁"
            : "📋";

    void notifyTelegram(
      "report",
      [
        `${statusEmoji} Issue report status updated: ${input.status}`,
        `User: @${row.user?.username ?? "?"} (${row.user?.email ?? row.userId})`,
        `Kind: ${row.kind}`,
        `Subject: ${row.subject}`,
        `Status: ${input.status}`,
        ...(input.adminNote ? [`Admin Note: ${input.adminNote}`] : []),
        `Report ID: ${row.id}`,
      ].join("\n"),
    );

    void notifyUser({
      userId: row.userId,
      type: "issue_report_update",
      title: input.status === "RESOLVED" ? "✅ Support Report Resolved" : "📋 Support Report Update",
      message: input.adminNote
        ? `Admin response: ${input.adminNote}`
        : `Your support report "${row.subject}" is now ${input.status.toLowerCase().replace("_", " ")}.`,
      actionUrl: "/app/reports",
    }).catch((err) => {
      console.warn("[issue-reports] Failed to notify user:", err);
    });

    return {
      ok: true as const,
      report: serialize({ ...row, deposit, keyDetails }),
    };
  } catch {
    return {
      ok: false as const,
      code: "NOT_FOUND",
      message: "Report not found.",
    };
  }
}

export async function countOpenIssueReports() {
  return prisma.issueReport.count({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
}

