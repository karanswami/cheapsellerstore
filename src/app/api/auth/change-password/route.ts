import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import {
  getSessionUserId,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
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

  logActivity({
    request,
    action: "PASSWORD_CHANGE",
    category: "AUTH",
    message: `Password ${user.passwordHash ? "changed" : "set"} (@${user.username})`,
    user,
  });

  return jsonOk({
    message: user.passwordHash ? "Password updated." : "Password set.",
  });
}
