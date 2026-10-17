import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { createPasswordResetOtp } from "@/lib/auth/password-reset";
import { isResendConfigured } from "@/lib/auth-config";
import { sendEmailVerificationOtpEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";

/** OTP rows are shared with password reset; the `verify:` prefix keeps the two flows apart. */
const verifyOtpKey = (email: string) => `verify:${email.toLowerCase().trim()}`;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Please sign in.", 401);
  if (user.emailVerified) return jsonError("ALREADY_VERIFIED", "Your email is already verified.", 400);

  const limited = await rateLimitAll([
    { key: `verify-send-ip:${clientIpFromHeaders(request.headers)}`, limit: 10, windowMs: 15 * 60_000 },
    { key: `verify-send-user:${user.id}`, limit: 4, windowMs: 60 * 60_000 },
  ]);
  if (limited) return tooManyRequests(limited, "Too many requests. Try again later.");

  if (!(await isResendConfigured())) {
    return jsonError("EMAIL_NOT_CONFIGURED", "Email verification is not configured. Contact support.", 503);
  }

  const key = verifyOtpKey(user.email);
  const created = await createPasswordResetOtp(key);
  if (created.status === "reused") {
    return jsonOk({ message: "A code was already sent. Enter it below (valid for 10 minutes).", reused: true });
  }

  try {
    await sendEmailVerificationOtpEmail({ to: user.email, code: created.code, name: user.name });
  } catch {
    await prisma.passwordResetOtp.deleteMany({ where: { email: key } });
    return jsonError("EMAIL_FAILED", "Could not send the email. Try again shortly.", 502);
  }

  return jsonOk({ message: `We sent a 6-digit code to ${user.email}.`, reused: false });
}
