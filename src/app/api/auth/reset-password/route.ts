import { clientIpFromHeaders, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { hashPassword, revokeUserSessions } from "@/lib/auth/customer";
import { consumePasswordResetLink } from "@/lib/auth/password-reset-link";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      400,
    );
  }

  const email = parsed.data.email.toLowerCase();
  const limited = await rateLimitAll([
    { key: `reset-ip:${clientIpFromHeaders(request.headers)}`, limit: 20, windowMs: 15 * 60_000 },
    { key: `reset-email:${email}`, limit: 12, windowMs: 60 * 60_000 },
  ]);
  if (limited) return tooManyRequests(limited, "Too many attempts. Try again later.");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return jsonError("INVALID_CODE", "Invalid or expired reset link.", 400);
  }

  const result = await consumePasswordResetLink(email, parsed.data.token);
  if (!result.ok) {
    const message =
      result.reason === "EXPIRED"
        ? "This reset link has expired. Request a new one."
        : "Invalid or expired reset link.";
    return jsonError("INVALID_CODE", message, 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: user.id },
    // Opening the emailed link proves the mailbox, so the address counts as verified from now on.
    data: { passwordHash, emailVerified: true },
  });
  // A reset must kill every session an attacker may already hold.
  await revokeUserSessions(user.id);

  logActivity({
    request,
    action: "PASSWORD_RESET",
    category: "AUTH",
    message: `Password reset via OTP (@${user.username})`,
    user,
  });

  return jsonOk({ message: "Password updated. You can sign in now." });
}
