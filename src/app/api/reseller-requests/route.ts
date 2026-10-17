import { jsonError, jsonOk } from "@/lib/api";
import { RESELLER_GATE_ON } from "@/lib/resellers";
import { getCurrentUser } from "@/lib/auth/customer";
import { usdToMicrocents } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import {
  getResellerApplyMinBalanceUsd,
  isResellerAutoApprove,
  isResellerProgramEnabled,
} from "@/lib/settings";
import { getSellerProgramConfig } from "@/lib/seller-program";
import { notifyTelegram } from "@/lib/telegram-notify";
import {
  reapplyAvailableAt,
  SELLER_FIELDS,
  type SellerProgramConfig,
} from "@/types/seller-program";
import { ResellerRequestStatus, UserRole } from "@prisma/client";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);

  const enabled = await isResellerProgramEnabled();
  const minUsd = await getResellerApplyMinBalanceUsd();
  const pending = await prisma.resellerRequest.findFirst({
    where: { userId: user.id, status: ResellerRequestStatus.PENDING },
    select: { id: true, status: true, createdAt: true },
  });
  const latest = await prisma.resellerRequest.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, createdAt: true },
  });

  return jsonOk({
    programEnabled: enabled,
    minBalanceUsd: minUsd,
    walletBalance: user.walletBalance,
    canApply:
      enabled &&
      user.role === UserRole.USER &&
      !pending &&
      user.walletBalance >= usdToMicrocents(minUsd),
    pending: pending
      ? {
          id: pending.id,
          status: pending.status,
          createdAt: pending.createdAt.toISOString(),
        }
      : null,
    latest: latest
      ? {
          id: latest.id,
          status: latest.status,
          createdAt: latest.createdAt.toISOString(),
        }
      : null,
    role: user.role,
  });
}

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} is required.` : `${label} is too short.`)
    .max(max, `${label} is too long.`);

const url = (label: string) =>
  z
    .string()
    .trim()
    .max(300, `${label} is too long.`)
    .refine((v) => v === "" || z.string().url().safeParse(v).success, {
      message: `${label} must be a valid link starting with https://`,
    });

const core = {
  fullName: text("Full name", 1, 120),
  phone: text("Phone number", 6, 40),
  country: text("Country", 1, 80),
  telegram: text("Telegram username", 1, 80),
  reason: z
    .string()
    .trim()
    .min(10, "Please explain in at least 10 characters why you want to join.")
    .max(2000, "Reason is too long (max 2000 characters)."),
};

/** Form schema shaped by the admin's field modes (required / optional / hidden). */
function buildSchema(fields: SellerProgramConfig["fields"]) {
  const shape: Record<string, z.ZodType<string | undefined>> = { ...core };
  for (const f of SELLER_FIELDS) {
    const mode = fields[f.key];
    if (mode === "hidden") continue;
    const base = f.url ? url(f.label) : text(f.label, 0, 120);
    shape[f.key] =
      mode === "required"
        ? base.refine((v) => v.length > 0, { message: `${f.label} is required.` })
        : base.optional();
  }
  return z.object(shape);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);

  if (user.role !== UserRole.USER) {
    return jsonError("FORBIDDEN", "Only customers can apply.", 403);
  }

  if (!(await isResellerProgramEnabled())) {
    return jsonError("DISABLED", "Seller applications are closed.", 403);
  }

  const minUsd = await getResellerApplyMinBalanceUsd();
  if (user.walletBalance < usdToMicrocents(minUsd)) {
    return jsonError(
      "MIN_BALANCE",
      `Wallet balance must be at least $${minUsd}.`,
      400
    );
  }

  const pending = await prisma.resellerRequest.findFirst({
    where: { userId: user.id, status: ResellerRequestStatus.PENDING },
  });
  if (pending) {
    return jsonError("CONFLICT", "You already have a pending request.", 409);
  }

  const config = await getSellerProgramConfig();
  const latest = await prisma.resellerRequest.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { status: true, reviewedAt: true },
  });
  const retryAt = reapplyAvailableAt(latest, config.reapplyCooldownDays);
  if (retryAt) {
    return jsonError(
      "COOLDOWN",
      `You can apply again on ${retryAt.toUTCString().slice(5, 16)}.`,
      429
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = buildSchema(config.fields).safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid form.",
      400
    );
  }

  const d = parsed.data as Record<string, string | undefined>;
  const opt = (k: string) => d[k] || null;
  const auto = await isResellerAutoApprove();

  // Auto-approve: claim the role first (atomic, only succeeds once) so a
  // failed request insert can never leave an APPROVED request without a role.
  if (auto) {
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, role: UserRole.USER },
      data: { role: UserRole.SELLER, ...RESELLER_GATE_ON },
    });
    if (claimed.count === 0) {
      return jsonError("CONFLICT", "Your account is already upgraded.", 409);
    }
  }

  const status = auto
    ? ResellerRequestStatus.APPROVED
    : ResellerRequestStatus.PENDING;

  let req;
  try {
    req = await prisma.resellerRequest.create({
      data: {
        userId: user.id,
        status,
        fullName: d.fullName!,
        phone: d.phone!,
        country: d.country!,
        telegram: d.telegram!.replace(/^@+/, ""),
        reason: d.reason!,
        // Required columns; empty when the admin hides the field.
        facebookUrl: d.facebookUrl ?? "",
        followerCount: d.followerCount ?? "",
        sellingPlatform: d.sellingPlatform ?? "",
        youtubeUrl: opt("youtubeUrl"),
        telegramChannelUrl: opt("telegramChannelUrl"),
        websiteUrl: opt("websiteUrl"),
        experience: opt("experience"),
        reviewedAt: auto ? new Date() : null,
      },
    });
  } catch (err) {
    if (auto) {
      await prisma.user.updateMany({
        where: { id: user.id, role: UserRole.SELLER },
        data: { role: UserRole.USER },
      });
    }
    throw err;
  }

  // Double-submit guard: if concurrent pending requests slipped past the
  // check above, only the oldest survives.
  if (!auto) {
    const oldest = await prisma.resellerRequest.findFirst({
      where: { userId: user.id, status: ResellerRequestStatus.PENDING },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    if (oldest && oldest.id !== req.id) {
      await prisma.resellerRequest.delete({ where: { id: req.id } });
      return jsonError("CONFLICT", "You already have a pending request.", 409);
    }
  }

  void notifyTelegram(
    "ownerReseller",
    [
      auto
        ? "✅ Seller application auto-approved"
        : "📝 Seller application submitted",
      `User: @${user.username} (${user.email})`,
      `Name: ${d.fullName}`,
      `Telegram: ${d.telegram}`,
      `Country: ${d.country}`,
      `Status: ${req.status}`,
      `Request: ${req.id}`,
    ].join("\n")
  );

  return jsonOk({
    request: {
      id: req.id,
      status: req.status,
      autoApproved: auto,
    },
  });
}
