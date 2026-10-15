import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserId, toSafeUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { canChangeUsername, hasPremiumAccess } from "@/lib/premium-utils";
import {
  isReservedProfileUsername,
  normalizeProfileUsername,
} from "@/lib/profile";
import { z } from "zod";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be 3–32 characters.")
    .max(32, "Username must be 3–32 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username must be a-z, 0-9, or _."),
});

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to change username.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid username.",
      400,
    );
  }

  const username = normalizeProfileUsername(parsed.data.username);
  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    return jsonError(
      "VALIDATION",
      "Username must be 3–32 chars (a-z, 0-9, _).",
      400,
    );
  }
  if (isReservedProfileUsername(username)) {
    return jsonError(
      "VALIDATION",
      "That username is reserved. Choose another.",
      400,
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      username: true,
      usernameChangedAt: true,
    },
  });
  if (!existing) {
    return jsonError("NOT_FOUND", "Account not found.", 404);
  }
  if (!hasPremiumAccess(existing)) {
    return jsonError("FORBIDDEN", "Premium required to change username.", 403);
  }
  if (existing.username === username) {
    return jsonError("VALIDATION", "That is already your username.", 400);
  }

  const cooldown = canChangeUsername(existing.usernameChangedAt);
  if (!cooldown.ok) {
    return jsonError(
      "COOLDOWN",
      `You can change username again after ${cooldown.nextAt?.toISOString() ?? "30 days"}.`,
      429,
    );
  }

  const clash = await prisma.user.findFirst({
    where: { username, NOT: { id: userId } },
    select: { id: true },
  });
  if (clash) {
    return jsonError("USERNAME_TAKEN", "Username is already taken.", 409);
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        usernameChangedAt: new Date(),
      },
    });
    return jsonOk({ user: toSafeUser(user) });
  } catch {
    return jsonError("USERNAME_TAKEN", "Username is already taken.", 409);
  }
}
