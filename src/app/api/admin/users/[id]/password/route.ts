import { randomInt } from "node:crypto";
import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { requireAdmin } from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  /** Omit to generate a random password. */
  password: z.string().min(6, "Password must be at least 6 characters").max(128).optional(),
});

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generatePassword(length = 14) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export async function POST(request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin login required.", 401);
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid.", 400);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError("NOT_FOUND", "User not found.", 404);
  if (target.id === admin.id) {
    return jsonError("FORBIDDEN", "Change your own password from Profile.", 400);
  }

  const generated = parsed.data.password === undefined;
  const password = parsed.data.password ?? generatePassword();
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });
  // Any pending email reset code is now stale.
  await prisma.passwordResetOtp.deleteMany({ where: { email: target.email } }).catch(() => undefined);

  logActivity({
    request,
    action: "USER_PASSWORD_RESET",
    category: "ADMIN",
    message: `Admin @${admin.username} ${generated ? "generated a new" : "set a"} password for @${target.username}`,
    user: target,
    metadata: { byAdminId: admin.id, byAdmin: admin.username, generated },
  });

  return jsonOk({ password, generated });
}
