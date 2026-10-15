import "server-only";
import { prisma } from "@/lib/prisma";
import { Currency, formatMoney } from "@/lib/currencies";
import { adjustWallet } from "@/lib/wallet";
import { logActivity } from "@/lib/activity-log";
import { GiftCodeStatus, TransactionType, type Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeGiftCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Human-readable chunked code e.g. CHEAP-XXXX-XXXX */
export function generateGiftCode(prefix = "CHEAP"): string {
  let body = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    body += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4, 8)}`;
}

function withoutClaimedBy(): Prisma.GiftCodeWhereInput {
  return {
    OR: [{ claimedById: null }, { claimedById: { isSet: false } }],
  };
}

function openOrAssignedTo(userId: string): Prisma.GiftCodeWhereInput {
  return {
    OR: [
      { assignedUserId: null },
      { assignedUserId: { isSet: false } },
      { assignedUserId: userId },
    ],
  };
}

export type GiftCodeListFilters = {
  page?: number;
  limit?: number;
  status?: "AVAILABLE" | "CLAIMED" | "DISABLED" | "all";
  q?: string;
};

export async function listGiftCodesForAdmin(filters: GiftCodeListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(48, Math.max(1, filters.limit ?? 20));
  const q = (filters.q ?? "").trim();
  const status = filters.status ?? "all";

  const where: Prisma.GiftCodeWhereInput = {};
  if (status !== "all") {
    where.status = status;
  }

  if (q) {
    const matchingUserIds = (
      await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 40,
        select: { id: true },
      })
    ).map((u) => u.id);

    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
      ...(matchingUserIds.length
        ? [
            { assignedUserId: { in: matchingUserIds } },
            { claimedById: { in: matchingUserIds } },
          ]
        : []),
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.giftCode.count({ where }),
    prisma.giftCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        assignedUser: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
            banned: true,
          },
        },
        claimedBy: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
            banned: true,
          },
        },
        createdBy: {
          select: { id: true, username: true, name: true },
        },
      },
    }),
  ]);

  return {
    giftCodes: rows.map(serializeGiftCodeAdmin),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}

function serializeGiftCodeAdmin(
  row: Prisma.GiftCodeGetPayload<{
    include: {
      assignedUser: {
        select: {
          id: true;
          username: true;
          name: true;
          email: true;
          role: true;
          banned: true;
        };
      };
      claimedBy: {
        select: {
          id: true;
          username: true;
          name: true;
          email: true;
          role: true;
          banned: true;
        };
      };
      createdBy: { select: { id: true; username: true; name: true } };
    };
  }>,
) {
  return {
    id: row.id,
    code: row.code,
    amount: row.amount,
    status: row.status,
    note: row.note,
    assignedUser: row.assignedUser
      ? {
          id: row.assignedUser.id,
          username: row.assignedUser.username,
          name: row.assignedUser.name,
          email: row.assignedUser.email,
          role: row.assignedUser.role,
          banned: row.assignedUser.banned,
        }
      : null,
    claimedBy: row.claimedBy
      ? {
          id: row.claimedBy.id,
          username: row.claimedBy.username,
          name: row.claimedBy.name,
          email: row.claimedBy.email,
          role: row.claimedBy.role,
          banned: row.claimedBy.banned,
        }
      : null,
    claimedAt: row.claimedAt?.toISOString() ?? null,
    transactionId: row.transactionId,
    createdBy: {
      id: row.createdBy.id,
      username: row.createdBy.username,
      name: row.createdBy.name,
    },
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createGiftCode(input: {
  amountMicrocents: number;
  createdById: string;
  code?: string | null;
  assignedUserId?: string | null;
  note?: string | null;
  expiresAt?: Date | null;
}) {
  if (
    !Number.isInteger(input.amountMicrocents) ||
    input.amountMicrocents <= 0
  ) {
    throw new Error("INVALID_AMOUNT");
  }

  let assignedUserId: string | null = null;
  if (input.assignedUserId) {
    const user = await prisma.user.findUnique({
      where: { id: input.assignedUserId },
      select: { id: true, banned: true },
    });
    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.banned) throw new Error("USER_BANNED");
    assignedUserId = user.id;
  }

  const rawCode = input.code?.trim()
    ? normalizeGiftCode(input.code)
    : generateGiftCode();
  if (rawCode.length < 4 || rawCode.length > 64) {
    throw new Error("INVALID_CODE");
  }

  const exists = await prisma.giftCode.findUnique({ where: { code: rawCode } });
  if (exists) throw new Error("CODE_EXISTS");

  const gift = await prisma.giftCode.create({
    data: {
      code: rawCode,
      amount: input.amountMicrocents,
      assignedUserId,
      note: input.note?.trim() || null,
      createdById: input.createdById,
      expiresAt: input.expiresAt ?? null,
      status: GiftCodeStatus.AVAILABLE,
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          banned: true,
        },
      },
      claimedBy: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          banned: true,
        },
      },
      createdBy: {
        select: { id: true, username: true, name: true },
      },
    },
  });

  await logActivity({
    category: "ADMIN",
    action: "gift_code_create",
    userId: input.createdById,
    message: `Created gift code ${gift.code} · ${formatMoney(gift.amount)}`,
    metadata: {
      giftCodeId: gift.id,
      code: gift.code,
      amount: gift.amount,
      assignedUserId,
    },
  });

  return serializeGiftCodeAdmin(gift);
}

export async function disableGiftCode(id: string, adminId: string) {
  const existing = await prisma.giftCode.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.status === GiftCodeStatus.CLAIMED) {
    throw new Error("ALREADY_CLAIMED");
  }
  if (existing.status === GiftCodeStatus.DISABLED) {
    return existing;
  }

  const updated = await prisma.giftCode.updateMany({
    where: {
      id,
      status: GiftCodeStatus.AVAILABLE,
      AND: [withoutClaimedBy()],
    },
    data: { status: GiftCodeStatus.DISABLED },
  });
  if (updated.count === 0) throw new Error("ALREADY_CLAIMED");

  await logActivity({
    category: "ADMIN",
    action: "gift_code_disable",
    userId: adminId,
    message: `Disabled gift code ${existing.code}`,
    metadata: { giftCodeId: id, code: existing.code },
  });

  return prisma.giftCode.findUniqueOrThrow({ where: { id } });
}

/**
 * Race-safe claim: lock AVAILABLE row → credit wallet → attach transactionId.
 * Assigned codes only redeemable by that user; open codes = first claimer.
 */
export async function claimGiftCode(input: {
  code: string;
  userId: string;
}) {
  const code = normalizeGiftCode(input.code);
  if (!code) throw new Error("INVALID_CODE");

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, banned: true, username: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.banned) throw new Error("USER_BANNED");

  const gift = await prisma.giftCode.findUnique({ where: { code } });
  if (!gift) throw new Error("NOT_FOUND");
  if (gift.status === GiftCodeStatus.DISABLED) throw new Error("DISABLED");
  if (gift.status === GiftCodeStatus.CLAIMED || gift.claimedById) {
    throw new Error("ALREADY_CLAIMED");
  }
  if (gift.expiresAt && gift.expiresAt.getTime() < Date.now()) {
    throw new Error("EXPIRED");
  }
  if (gift.assignedUserId && gift.assignedUserId !== input.userId) {
    throw new Error("NOT_ASSIGNED");
  }

  const locked = await prisma.giftCode.updateMany({
    where: {
      id: gift.id,
      status: GiftCodeStatus.AVAILABLE,
      AND: [withoutClaimedBy(), openOrAssignedTo(input.userId)],
      OR: [
        { expiresAt: null },
        { expiresAt: { isSet: false } },
        { expiresAt: { gt: new Date() } },
      ],
    },
    data: {
      status: GiftCodeStatus.CLAIMED,
      claimedById: input.userId,
      claimedAt: new Date(),
    },
  });

  if (locked.count === 0) {
    const again = await prisma.giftCode.findUnique({ where: { id: gift.id } });
    if (again?.status === GiftCodeStatus.CLAIMED) throw new Error("ALREADY_CLAIMED");
    if (again?.status === GiftCodeStatus.DISABLED) throw new Error("DISABLED");
    if (again?.expiresAt && again.expiresAt.getTime() < Date.now()) {
      throw new Error("EXPIRED");
    }
    if (again?.assignedUserId && again.assignedUserId !== input.userId) {
      throw new Error("NOT_ASSIGNED");
    }
    throw new Error("CLAIM_FAILED");
  }

  try {
    const updatedUser = await adjustWallet({
      userId: input.userId,
      amount: Math.round(gift.amount),
      type: TransactionType.GIFT_CODE,
      note: `Gift code ${gift.code}`,
      reference: `gift:${gift.id}`,
    });

    const tx = await prisma.transaction.findFirst({
      where: {
        userId: input.userId,
        reference: `gift:${gift.id}`,
        type: TransactionType.GIFT_CODE,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (tx) {
      await prisma.giftCode.update({
        where: { id: gift.id },
        data: { transactionId: tx.id },
      });
    }

    await logActivity({
      category: "WALLET",
      action: "gift_code_claim",
      userId: input.userId,
      message: `Claimed gift code ${gift.code} · ${formatMoney(gift.amount)}`,
      metadata: {
        giftCodeId: gift.id,
        code: gift.code,
        amount: gift.amount,
      },
    });

    return {
      amount: gift.amount,
      code: gift.code,
      balance: updatedUser.walletBalance,
      currency: Currency.USD,
    };
  } catch (err) {
    // Best-effort unlock if wallet credit failed after lock
    await prisma.giftCode.updateMany({
      where: {
        id: gift.id,
        status: GiftCodeStatus.CLAIMED,
        claimedById: input.userId,
        OR: [{ transactionId: null }, { transactionId: { isSet: false } }],
      },
      data: {
        status: GiftCodeStatus.AVAILABLE,
        claimedById: null,
        claimedAt: null,
      },
    });
    throw err;
  }
}

export async function listMyGiftClaims(userId: string, options?: {
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(48, Math.max(1, options?.limit ?? 20));

  const where = { claimedById: userId };
  const [total, rows] = await Promise.all([
    prisma.giftCode.count({ where }),
    prisma.giftCode.findMany({
      where,
      orderBy: { claimedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        code: true,
        amount: true,
        claimedAt: true,
        note: true,
      },
    }),
  ]);

  return {
    claims: rows.map((r) => ({
      id: r.id,
      code: r.code,
      amount: r.amount,
      claimedAt: r.claimedAt?.toISOString() ?? null,
      note: r.note,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
}
