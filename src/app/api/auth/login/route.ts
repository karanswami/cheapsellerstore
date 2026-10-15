import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import {
  clearTwoFactorChallengeCookie,
  setTwoFactorChallengeCookie,
} from "@/lib/auth/challenge";
import {
  setCustomerSessionCookie,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth/customer";
import { maintenanceLoginBlock } from "@/lib/maintenance";
import { homePathForRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      400,
    );
  }

  const identifier = parsed.data.identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
  });

  if (!user) {
    logActivity({
      request,
      action: "LOGIN_FAILED",
      category: "SECURITY",
      message: `Failed login for ${identifier}`,
      username: identifier,
      success: false,
      metadata: { reason: "not_found", identifier },
    });
    return jsonError("UNAUTHORIZED", "Invalid username/email or password.", 401);
  }

  if (!user.passwordHash) {
    logActivity({
      request,
      action: "LOGIN_FAILED",
      category: "SECURITY",
      message: `Google-only account login attempt (@${user.username})`,
      user,
      success: false,
      metadata: { reason: "google_only" },
    });
    return jsonError(
      "GOOGLE_ONLY",
      "This account uses Google sign-in. Continue with Google.",
      401,
    );
  }

  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    logActivity({
      request,
      action: "LOGIN_FAILED",
      category: "SECURITY",
      message: `Failed login (@${user.username}) — bad password`,
      user,
      success: false,
      metadata: { reason: "bad_password" },
    });
    return jsonError("UNAUTHORIZED", "Invalid username/email or password.", 401);
  }

  if (user.banned) {
    logActivity({
      request,
      action: "LOGIN_FAILED",
      category: "SECURITY",
      message: `Banned account login attempt (@${user.username})`,
      user,
      success: false,
      metadata: { reason: "banned" },
    });
    return jsonError("BANNED", "This account has been suspended.", 403);
  }

  const role = user.role ?? "USER";
  const maint = await maintenanceLoginBlock(role);
  if (maint) return maint;

  if (user.twoFactorEnabled) {
    await setTwoFactorChallengeCookie(user.id);
    logActivity({
      request,
      action: "LOGIN_2FA",
      category: "AUTH",
      message: `2FA challenge started (@${user.username})`,
      user,
      metadata: { stage: "challenge" },
    });
    return jsonOk({
      requires2fa: true as const,
      message: "Enter the code from your authenticator app.",
    });
  }

  await clearTwoFactorChallengeCookie();
  await setCustomerSessionCookie(user.id, role);

  logActivity({
    request,
    action: "LOGIN_SUCCESS",
    category: "AUTH",
    message: `Logged in (@${user.username})`,
    user,
    metadata: { method: "password" },
  });

  return jsonOk({
    requires2fa: false as const,
    user: toSafeUser(user),
    redirectTo: homePathForRole(role),
  });
}
