import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { getSessionUserId, toSafeUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations";
import { Prisma, type ProfileBorder } from "@prisma/client";

function canUseBorder(
  role: string,
  border: ProfileBorder,
): boolean {
  if (border === "NONE") return true;
  if (border === "PREMIUM") {
    return role === "SELLER" || role === "RESELLER" || role === "ADMIN";
  }
  if (border === "VIP") return role === "ADMIN";
  return false;
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to update your profile.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      400,
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!existing) {
    return jsonError("NOT_FOUND", "Account not found.", 404);
  }

  const customizationRequested =
    parsed.data.bio !== undefined ||
    parsed.data.socialLinks !== undefined ||
    parsed.data.emojiStatus !== undefined ||
    parsed.data.featuredProducts !== undefined;

  if (customizationRequested) {
    return jsonError(
      "FORBIDDEN",
      "Profile customization is not available.",
      403,
    );
  }

  if (
    parsed.data.profileBorder !== undefined &&
    !canUseBorder(existing.role, parsed.data.profileBorder)
  ) {
    return jsonError(
      "FORBIDDEN",
      "That profile border is not available for your account.",
      403,
    );
  }

  const data: Prisma.UserUpdateInput = {};

  if (parsed.data.name !== undefined) {
    data.name = parsed.data.name;
  }
  if (parsed.data.avatarUrl !== undefined) {
    data.avatarUrl =
      parsed.data.avatarUrl === "" ? null : parsed.data.avatarUrl;
  }
  if (parsed.data.bio !== undefined) {
    data.bio =
      parsed.data.bio === "" || parsed.data.bio === null
        ? null
        : parsed.data.bio;
  }
  if (parsed.data.isProfilePublic !== undefined) {
    data.isProfilePublic = parsed.data.isProfilePublic;
  }
  if (parsed.data.socialLinks !== undefined) {
    data.socialLinks =
      parsed.data.socialLinks === null
        ? null
        : (parsed.data.socialLinks as Prisma.InputJsonValue);
  }
  if (parsed.data.featuredProducts !== undefined) {
    if (parsed.data.featuredProducts.length > 0) {
      const userOrders = await prisma.order.findMany({
        where: {
          userId,
          status: { in: ["PAID", "FULFILLED"] },
        },
        select: {
          items: {
            select: {
              duration: {
                select: { productId: true },
              },
            },
          },
        },
      });

      const purchasedProductIds = new Set(
        userOrders.flatMap((order) =>
          order.items.map((item) => item.duration.productId),
        ),
      );

      data.featuredProducts = parsed.data.featuredProducts.filter((productId) =>
        purchasedProductIds.has(productId),
      );
    } else {
      data.featuredProducts = [];
    }
  }
  if (parsed.data.profileBorder !== undefined) {
    data.profileBorder = parsed.data.profileBorder;
  }
  if (parsed.data.emojiStatus !== undefined) {
    data.emojiStatus =
      parsed.data.emojiStatus === "" || parsed.data.emojiStatus === null
        ? null
        : parsed.data.emojiStatus;
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });
    logActivity({
      request,
      action: "PROFILE_UPDATE",
      category: "ACCOUNT",
      message: `Profile updated (@${user.username})`,
      user,
      metadata: { fields: Object.keys(data) },
    });
    return jsonOk({ user: toSafeUser(user) });
  } catch (err) {
    console.error("[auth/profile]", err);
    return jsonError("INTERNAL_ERROR", "Could not update profile.", 500);
  }
}
