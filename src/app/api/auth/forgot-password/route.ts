import { clientIpFromHeaders, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/api";
import { createPasswordResetOtp } from "@/lib/auth/password-reset";
import { sendPasswordResetOtpEmail } from "@/lib/email";
import { isResendConfigured } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";

/** Generic success copy — never reveal whether the email exists. */
const SUCCESS_MESSAGE =
  "If an account exists for that email, check your inbox for a 6-digit reset code.";
const REUSED_MESSAGE =
  "If an account exists for that email, use the 6-digit code already sent (valid until it expires).";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      400,
    );
  }

  const email = parsed.data.email.toLowerCase();
  const limited = await rateLimitAll([
    { key: `forgot-ip:${clientIpFromHeaders(request.headers)}`, limit: 8, windowMs: 15 * 60_000 },
    { key: `forgot-email:${email}`, limit: 3, windowMs: 60 * 60_000 },
  ]);
  if (limited) return tooManyRequests(limited, "Too many reset requests. Try again later.");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return jsonOk({ message: SUCCESS_MESSAGE, reused: false });
  }

  if (!(await isResendConfigured())) {
    return jsonError(
      "EMAIL_NOT_CONFIGURED",
      "Password reset email is not configured. Contact support.",
      503,
    );
  }

  const created = await createPasswordResetOtp(email);

  // Reuse path: never send mail (plaintext OTP is not stored).
  if (created.status === "reused") {
    return jsonOk({ message: REUSED_MESSAGE, reused: true });
  }

  const code = created.code;
  if (!/^\d{6}$/.test(code)) {
    await prisma.passwordResetOtp.deleteMany({ where: { email } });
    return jsonError(
      "EMAIL_FAILED",
      "Could not send reset email. Try again shortly.",
      502,
    );
  }

  try {
    await sendPasswordResetOtpEmail({
      to: email,
      code,
      name: user.name,
    });
  } catch {
    await prisma.passwordResetOtp.deleteMany({ where: { email } });
    return jsonError(
      "EMAIL_FAILED",
      "Could not send reset email. Try again shortly.",
      502,
    );
  }

  return jsonOk({ message: SUCCESS_MESSAGE, reused: false });
}
