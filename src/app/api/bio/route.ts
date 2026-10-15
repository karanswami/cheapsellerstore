import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { getSessionUserId, toSafeUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { bioConfigSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to access your bio configuration.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orders: {
        where: { status: { in: ["PAID", "FULFILLED"] } },
        select: { id: true, total: true },
      },
      reviews: {
        where: { status: "APPROVED" },
        select: { rating: true },
      },
    },
  });

  if (!user || user.banned) {
    return jsonError("NOT_FOUND", "Account not found.", 404);
  }

  // Fetch all products for the catalog showcase picker
  const activeProducts = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      category: { select: { name: true } },
    },
    orderBy: [{ isPinned: "desc" }, { isBestSeller: "desc" }, { createdAt: "desc" }],
  });

  const totalSpent = user.orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const avgRating =
    user.reviews.length > 0
      ? user.reviews.reduce((sum, r) => sum + r.rating, 0) / user.reviews.length
      : null;

  return jsonOk({
    user: toSafeUser(user),
    catalogProducts: activeProducts,
    orderCount: user.orders.length,
    totalSpent,
    averageRating: avgRating,
    vouchCount: user.reviews.length,
  });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to update your bio configuration.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = bioConfigSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid bio input.",
      400,
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, isPremium: true },
  });
  if (!existing) {
    return jsonError("NOT_FOUND", "Account not found.", 404);
  }

  const isVip = Boolean(existing.isPremium) || existing.role === "ADMIN";
  if (!isVip) {
    return jsonError(
      "FORBIDDEN",
      "VIP Lifetime membership required to customize your bio storefront.",
      403,
    );
  }

  const data: Prisma.UserUpdateInput = {};

  if (parsed.data.bioTheme !== undefined) {
    data.bioTheme = parsed.data.bioTheme;
  }
  if (parsed.data.bioTagline !== undefined) {
    data.bioTagline = parsed.data.bioTagline === "" ? null : parsed.data.bioTagline;
  }
  if (parsed.data.bioBannerUrl !== undefined) {
    data.bioBannerUrl = parsed.data.bioBannerUrl === "" ? null : parsed.data.bioBannerUrl;
  }
  if (parsed.data.bioPromoCode !== undefined) {
    data.bioPromoCode = parsed.data.bioPromoCode === "" ? null : parsed.data.bioPromoCode?.toUpperCase();
  }
  if (parsed.data.bioLinks !== undefined) {
    data.bioLinks = parsed.data.bioLinks as Prisma.InputJsonValue;
  }
  if (parsed.data.showVouches !== undefined) {
    data.showVouches = parsed.data.showVouches;
  }
  if (parsed.data.discordInvite !== undefined) {
    data.discordInvite = parsed.data.discordInvite === "" ? null : parsed.data.discordInvite;
  }
  if (parsed.data.telegramChannel !== undefined) {
    data.telegramChannel = parsed.data.telegramChannel === "" ? null : parsed.data.telegramChannel;
  }
  if (parsed.data.youtubeVideoUrl !== undefined) {
    data.youtubeVideoUrl = parsed.data.youtubeVideoUrl === "" ? null : parsed.data.youtubeVideoUrl;
  }
  if (parsed.data.bio !== undefined) {
    data.bio = parsed.data.bio === "" ? null : parsed.data.bio;
  }
  if (parsed.data.isProfilePublic !== undefined) {
    data.isProfilePublic = parsed.data.isProfilePublic;
  }
  if (parsed.data.featuredProducts !== undefined) {
    data.featuredProducts = parsed.data.featuredProducts;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });

    logActivity({
      request,
      action: "PROFILE_UPDATE",
      category: "ACCOUNT",
      message: `Updated bio storefront hub (@${updated.username})`,
      user: updated,
      metadata: { fields: Object.keys(data) },
    });

    return jsonOk({ user: toSafeUser(updated) });
  } catch (err) {
    console.error("[bio/patch]", err);
    return jsonError("INTERNAL_ERROR", "Could not update bio settings.", 500);
  }
}
