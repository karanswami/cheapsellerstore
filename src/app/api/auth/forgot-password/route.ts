import { clientIpFromHeaders, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/api";
import { createPasswordResetLink, discardPasswordResetLink } from "@/lib/auth/password-reset-link";
import { sendPasswordResetLinkEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { isResendConfigured } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";

/** Generic success copy — never reveal whether the email exists. */
const SUCCESS_MESSAGE =
  "If an account exists for that email, we sent a password reset link to it.";

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

  const token = await createPasswordResetLink(email);
  // Built from the configured site URL, never the Host header, so a forged Host can't poison the link.
  const base = getEnv().appUrl.replace(/\/$/, "");
  const link = `${base}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;

  try {
    await sendPasswordResetLinkEmail({ to: email, link, name: user.name });
  } catch {
    await discardPasswordResetLink(email);
    return jsonError("EMAIL_FAILED", "Could not send reset email. Try again shortly.", 502);
  }

  return jsonOk({ message: SUCCESS_MESSAGE });
}
