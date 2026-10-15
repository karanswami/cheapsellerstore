import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { createReseller, sellerHasSellerPanel } from "@/lib/resellers";
import { getResellerCreateMinFundingUsd } from "@/lib/settings";
import { UserRole } from "@prisma/client";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);
  if (!sellerHasSellerPanel(user)) {
    return jsonError("FORBIDDEN", "Not allowed.", 403);
  }

  const [resellers, createMinFundingUsd] = await Promise.all([
    prisma.user.findMany({
      where: {
        referredById: user.id,
        role: UserRole.RESELLER,
        NOT: { username: { startsWith: "del_" } },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        walletBalance: true,
        banned: true,
        createdAt: true,
      },
    }),
    getResellerCreateMinFundingUsd(),
  ]);

  return jsonOk({
    resellers,
    count: resellers.length,
    createMinFundingUsd,
    capabilities: {
      canCreate: user.canCreateResellers,
      canManage: user.canManageResellers,
      canFund: user.canFundResellers,
    },
  });
}

const createSchema = z.object({
  username: z.string().trim().min(3).max(32),
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(128),
  name: z.string().trim().max(80).optional(),
  initialUsd: z.number().min(0),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);
  if (user.role !== UserRole.SELLER || !user.canCreateResellers) {
    return jsonError("FORBIDDEN", "Not allowed.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid.", 400);
  }

  const minUsd = await getResellerCreateMinFundingUsd();
  if (parsed.data.initialUsd < minUsd) {
    return jsonError(
      "MIN_BALANCE",
      `Initial funding must be at least $${minUsd}.`,
      400,
    );
  }

  try {
    const created = await createReseller({
      creatorId: user.id,
      adminFunded: false,
      username: parsed.data.username,
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      initialUsd: parsed.data.initialUsd,
    });
    return jsonOk({
      user: {
        id: created.id,
        username: created.username,
        email: created.email,
        role: created.role,
      },
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    const messages: Record<string, string> = {
      USERNAME_OR_EMAIL_TAKEN: "Username or email already taken.",
      INVALID_USERNAME: "Username must be 3–32 chars (a-z, 0-9, _).",
      INVALID_EMAIL: "Invalid email.",
      WEAK_PASSWORD: "Password must be at least 6 characters.",
      MIN_BALANCE: `Initial funding must be at least $${minUsd}.`,
      INSUFFICIENT_BALANCE: "Insufficient wallet balance.",
      FORBIDDEN: "Not allowed.",
    };
    return jsonError(code, messages[code] ?? "Failed to create reseller.", 400);
  }
}
