import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { hashPassword } from "@/lib/auth/customer";
import { consumePasswordResetOtp } from "@/lib/auth/password-reset";
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
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return jsonError("INVALID_CODE", "Invalid or expired reset code.", 400);
  }

  const result = await consumePasswordResetOtp(email, parsed.data.code);
  if (!result.ok) {
    const message =
      result.reason === "EXPIRED"
        ? "Reset code expired. Request a new one."
        : result.reason === "LOCKED"
          ? "Too many attempts. Request a new code."
          : "Invalid or expired reset code.";
    return jsonError("INVALID_CODE", message, 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  logActivity({
    request,
    action: "PASSWORD_RESET",
    category: "AUTH",
    message: `Password reset via OTP (@${user.username})`,
    user,
  });

  return jsonOk({ message: "Password updated. You can sign in now." });
}
