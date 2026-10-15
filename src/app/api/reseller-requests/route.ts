import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { usdToMicrocents } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import {
  getResellerApplyMinBalanceUsd,
  isResellerAutoApprove,
  isResellerProgramEnabled,
} from "@/lib/settings";
import { notifyTelegram } from "@/lib/telegram-notify";
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

const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(300, `${label} is too long.`)
    .refine((v) => v === "" || z.string().url().safeParse(v).success, {
      message: `${label} must be a valid link starting with https://`,
    })
    .optional();

const schema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .max(120, "Full name is too long."),
  phone: z
    .string()
    .trim()
    .min(6, "Phone number is too short.")
    .max(40, "Phone number is too long."),
  country: z
    .string()
    .trim()
    .min(1, "Country is required.")
    .max(80, "Country is too long."),
  facebookUrl: z
    .string()
    .trim()
    .min(1, "Facebook profile link is required.")
    .url("Facebook profile link must be a valid link starting with https://")
    .max(300, "Facebook profile link is too long."),
  telegram: z
    .string()
    .trim()
    .min(1, "Telegram username is required.")
    .max(80, "Telegram username is too long."),
  youtubeUrl: optionalUrl("YouTube channel"),
  telegramChannelUrl: optionalUrl("Telegram channel/group"),
  websiteUrl: optionalUrl("Website"),
  followerCount: z
    .string()
    .trim()
    .min(1, "Members / followers is required.")
    .max(40, "Members / followers is too long."),
  experience: z.string().trim().max(120, "Experience is too long.").optional(),
  sellingPlatform: z
    .string()
    .trim()
    .min(1, "Selling platform is required.")
    .max(120, "Selling platform is too long."),
  reason: z
    .string()
    .trim()
    .min(10, "Please explain in at least 10 characters why you want to join.")
    .max(2000, "Reason is too long (max 2000 characters)."),
});

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

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid form.",
      400
    );
  }

  const d = parsed.data;
  const auto = await isResellerAutoApprove();

  // Auto-approve: claim the role first (atomic, only succeeds once) so a
  // failed request insert can never leave an APPROVED request without a role.
  if (auto) {
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, role: UserRole.USER },
      data: { role: UserRole.SELLER },
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
        fullName: d.fullName,
        phone: d.phone,
        country: d.country,
        facebookUrl: d.facebookUrl,
        telegram: d.telegram.replace(/^@+/, ""),
        youtubeUrl: d.youtubeUrl || null,
        telegramChannelUrl: d.telegramChannelUrl || null,
        websiteUrl: d.websiteUrl || null,
        followerCount: d.followerCount,
        experience: d.experience || null,
        sellingPlatform: d.sellingPlatform,
        reason: d.reason,
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
