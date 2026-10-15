import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import {
  hashPassword,
  setCustomerSessionCookie,
  toSafeUser,
} from "@/lib/auth/customer";
import { isMaintenanceMode } from "@/lib/maintenance";
import { prisma } from "@/lib/prisma";
import { ensureReferralCode } from "@/lib/referral-code";
import {
  normalizeReferralCode,
  resolveReferrerByCode,
} from "@/lib/referrals";
import { isReservedProfileUsername } from "@/lib/profile";
import { registerSchema } from "@/lib/validations";
import { notifyTelegram } from "@/lib/telegram-notify";

export async function POST(request: Request) {
  if (await isMaintenanceMode()) {
    return jsonError(
      "MAINTENANCE",
      "The store is temporarily unavailable. Please try again later.",
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      400,
    );
  }

  const { name, username, email, password } = parsed.data;
  const referralCode = normalizeReferralCode(parsed.data.referralCode);
  const emailLower = email.toLowerCase();
  const usernameLower = username.toLowerCase();

  if (isReservedProfileUsername(usernameLower)) {
    return jsonError(
      "VALIDATION",
      "That username is reserved. Choose another.",
      400,
    );
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailLower }, { username: usernameLower }],
    },
  });

  if (existing) {
    return jsonError(
      "CONFLICT",
      existing.email === emailLower
        ? "Email already registered."
        : "Username already taken.",
      409,
    );
  }

  const referrer = referralCode
    ? await resolveReferrerByCode(referralCode)
    : null;

  if (referralCode && !referrer) {
    return jsonError("INVALID_REFERRAL", "Invalid referral code.", 400);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      username: usernameLower,
      email: emailLower,
      passwordHash,
      emailVerified: true,
      currency: "USD",
      role: "USER",
      referredById: referrer?.id ?? null,
    },
  });

  await ensureReferralCode(user.id);

  if (referrer) {
    await prisma.notification
      .create({
        data: {
          userId: referrer.id,
          type: "REFERRAL",
          title: "New recruit joined",
          message: `@${user.username} registered using your referral code.`,
          actionUrl: "/app/referral",
        },
      })
      .catch(() => {
        // Non-fatal
      });
  }

  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  await setCustomerSessionCookie(fresh.id, "USER");

  logActivity({
    request,
    action: "REGISTER",
    category: "AUTH",
    message: `Registered (@${fresh.username})`,
    user: fresh,
    metadata: {
      method: "email",
      referral: referrer?.username ?? null,
    },
  });

  void notifyTelegram(
    "register",
    [
      "🆕 New registration",
      `User: @${fresh.username}`,
      `Email: ${fresh.email}`,
      `Name: ${fresh.name}`,
      referrer ? `Referral: @${referrer.username}` : "Referral: —",
      `ID: ${fresh.id}`,
    ].join("\n"),
  );

  return jsonOk({ user: toSafeUser(fresh), redirectTo: "/app" });
}
