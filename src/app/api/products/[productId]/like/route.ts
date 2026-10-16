import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { toggleLike } from "@/lib/likes";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in to like products.", 401);

  const { productId } = await params;
  if (!/^[a-f0-9]{24}$/i.test(productId)) {
    return jsonError("VALIDATION", "Invalid product.", 400);
  }

  try {
    const exists = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!exists) return jsonError("NOT_FOUND", "Product not found.", 404);
    return jsonOk(await toggleLike(productId, user.id));
  } catch (error) {
    console.error("PRODUCT_LIKE_FAILED", error);
    return jsonError("LIKE_FAILED", "Could not update like.", 500);
  }
}
