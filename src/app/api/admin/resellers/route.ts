import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const requests = await prisma.resellerRequest.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          walletBalance: true,
          banned: true,
          canCreateResellers: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ requests });
}
