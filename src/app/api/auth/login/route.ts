import { clientIpFromHeaders, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import {
  setCustomerSessionCookie,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth/customer";
import { maintenanceLoginBlock } from "@/lib/maintenance";
import { homePathForRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

// bcrypt hash of a random string; only used to equalise timing for unknown accounts.
const DUMMY_HASH = "$2b$10$l1GycZLMq6Saa5aiqUGZ.eMjxC2cMCvZ6npkU1hd.23SEFplJ5cRe";

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
  const ip = clientIpFromHeaders(request.headers);
  const limited = await rateLimitAll([
    { key: `login-ip:${ip}`, limit: 30, windowMs: 10 * 60_000 },
    { key: `login-id:${identifier}`, limit: 8, windowMs: 15 * 60_000 },
  ]);
  if (limited) return tooManyRequests(limited, "Too many login attempts. Try again in a few minutes.");
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
  });

  if (!user) {
    // Burn the same bcrypt time as a real check so response timing doesn't reveal valid accounts.
    await verifyPassword(parsed.data.password, DUMMY_HASH).catch(() => false);
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
    user: toSafeUser(user),
    redirectTo: homePathForRole(role),
  });
}
