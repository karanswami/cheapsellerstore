import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { getCurrentUser } from "@/lib/auth/customer";
import { consumePasswordResetOtp } from "@/lib/auth/password-reset";
import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code.") });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Please sign in.", 401);
  if (user.emailVerified) return jsonOk({ message: "Your email is already verified." });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const limited = await rateLimitAll([
    { key: `verify-confirm-ip:${clientIpFromHeaders(request.headers)}`, limit: 20, windowMs: 15 * 60_000 },
    { key: `verify-confirm-user:${user.id}`, limit: 12, windowMs: 60 * 60_000 },
  ]);
  if (limited) return tooManyRequests(limited, "Too many attempts. Try again later.");

  const result = await consumePasswordResetOtp(`verify:${user.email.toLowerCase().trim()}`, parsed.data.code);
  if (!result.ok) {
    const message =
      result.reason === "EXPIRED"
        ? "Code expired. Request a new one."
        : result.reason === "LOCKED"
          ? "Too many attempts. Try again in an hour."
          : "Invalid or expired code.";
    return jsonError("INVALID_CODE", message, 400);
  }

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });

  logActivity({
    request,
    action: "EMAIL_VERIFIED",
    category: "AUTH",
    message: `Email verified (@${user.username})`,
    user,
  });

  return jsonOk({ message: "Email verified." });
}
