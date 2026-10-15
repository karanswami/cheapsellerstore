import { prisma } from "@/lib/prisma";
import type { BroadcastAudience, UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { notifyTelegram } from "@/lib/telegram-notify";

export type BroadcastRow = {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  audience: BroadcastAudience;
  active: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

function serialize(
  row: {
    id: string;
    title: string;
    message: string;
    actionUrl: string | null;
    audience: BroadcastAudience;
    active: boolean;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
): BroadcastRow {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    actionUrl: row.actionUrl,
    audience: row.audience,
    active: row.active,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Map session role → audiences that should see the broadcast. */
export function audiencesForRole(role: UserRole): BroadcastAudience[] {
  if (role === "ADMIN") return ["ALL", "ADMIN", "USER", "SELLER"];
  if (role === "SELLER" || role === "RESELLER") return ["ALL", "SELLER"];
  return ["ALL", "USER"];
}

export async function listActiveBroadcastsForRole(role: UserRole) {
  const rows = await prisma.broadcast.findMany({
    where: {
      active: true,
      audience: { in: audiencesForRole(role) },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(serialize);
}

export async function listBroadcastsAdmin(opts?: {
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, opts?.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts?.limit ?? 20));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.broadcast.count(),
  ]);

  return {
    broadcasts: rows.map(serialize),
    page,
    limit,
    total,
    hasMore: skip + rows.length < total,
  };
}

export async function createBroadcast(input: {
  title: string;
  message: string;
  actionUrl?: string | null;
  audience: BroadcastAudience;
  createdById?: string | null;
  active?: boolean;
}) {
  const row = await prisma.broadcast.create({
    data: {
      title: input.title.slice(0, 120),
      message: input.message.slice(0, 2000),
      actionUrl: input.actionUrl?.trim() || null,
      audience: input.audience,
      active: input.active ?? true,
      createdById: input.createdById ?? null,
    },
  });

  void notifyTelegram(
    "adminUpdate",
    [
      "📢 Admin broadcast",
      `Title: ${row.title}`,
      `Audience: ${row.audience}`,
      `Active: ${row.active ? "yes" : "no"}`,
      row.message.slice(0, 500),
      `ID: ${row.id}`,
    ].join("\n"),
  );

  return serialize(row);
}

export async function setBroadcastActive(id: string, active: boolean) {
  try {
    const row = await prisma.broadcast.update({
      where: { id },
      data: { active },
    });
    return { ok: true as const, broadcast: serialize(row) };
  } catch {
    return {
      ok: false as const,
      code: "NOT_FOUND",
      message: "Broadcast not found.",
    };
  }
}

export function audienceUserWhere(
  audience: BroadcastAudience,
): Prisma.UserWhereInput {
  if (audience === "ALL") return { banned: false };
  if (audience === "SELLER") {
    return { banned: false, role: { in: ["SELLER", "RESELLER"] } };
  }
  return { banned: false, role: audience };
}
