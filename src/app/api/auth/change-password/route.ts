import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { notifyUser } from "@/lib/notifications";
import {
  getSessionUserId,
  hashPassword,
  revokeUserSessions,
  setCustomerSessionCookie,
  verifyPassword,
} from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { rateLimitAll } from "@/lib/rate-limit";
import { changePasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to change your password.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      400,
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return jsonError("UNAUTHORIZED", "Sign in to change your password.", 401);
  }

  const limited = await rateLimitAll([
    { key: `chgpw:${user.id}`, limit: 8, windowMs: 15 * 60_000 },
  ]);
  if (limited) {
    return jsonError("RATE_LIMITED", "Too many attempts. Try again later.", 429, {
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  const { currentPassword, newPassword } = parsed.data;

  if (user.passwordHash) {
    if (!currentPassword) {
      return jsonError(
        "VALIDATION",
        "Current password is required.",
        400,
      );
    }
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return jsonError("UNAUTHORIZED", "Current password is incorrect.", 401);
    }
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  // Sign out every other device/session, keep this one alive.
  await revokeUserSessions(user.id);
  await setCustomerSessionCookie(user.id, user.role);

  logActivity({
    request,
    action: "PASSWORD_CHANGE",
    category: "AUTH",
    message: `Password ${user.passwordHash ? "changed" : "set"} (@${user.username})`,
    user,
  });

  void notifyUser({
    userId: user.id,
    type: "security",
    title: user.passwordHash ? "Your password was changed" : "Password set",
    message: "If this wasn't you, reset your password right away and contact support.",
    actionUrl: "/app/profile",
  }).catch(() => {});

  return jsonOk({
    message: user.passwordHash ? "Password updated." : "Password set.",
  });
}
