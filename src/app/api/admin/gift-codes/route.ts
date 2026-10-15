import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { usdToMicrocents } from "@/lib/currencies";
import {
  createGiftCode,
  listGiftCodesForAdmin,
} from "@/lib/gift-codes";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  /** USD dollars (e.g. 10.5) — stored as microcents. */
  amountUsd: z.number().finite().positive().max(100_000),
  /** Optional custom code; auto-generated when blank. */
  code: z.string().trim().max(64).optional().nullable(),
  /** Optional assigned user id — only that user may claim. */
  assignedUserId: z.string().trim().min(1).optional().nullable(),
  /** Optional username lookup when assignedUserId not sent. */
  assignedUsername: z.string().trim().min(1).max(64).optional().nullable(),
  note: z.string().trim().max(200).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? 1) || 1;
  const limit = Number(searchParams.get("limit") ?? 20) || 20;
  const q = searchParams.get("q")?.trim() ?? "";
  const statusRaw = searchParams.get("status")?.trim() ?? "all";
  const status =
    statusRaw === "AVAILABLE" ||
    statusRaw === "CLAIMED" ||
    statusRaw === "DISABLED" ||
    statusRaw === "all"
      ? statusRaw
      : "all";

  const data = await listGiftCodesForAdmin({ page, limit, q, status });
  return jsonOk(data);
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid.",
      400,
    );
  }

  const data = parsed.data;
  let assignedUserId = data.assignedUserId?.trim() || null;

  if (!assignedUserId && data.assignedUsername?.trim()) {
    const username = data.assignedUsername.trim().replace(/^@/, "");
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: { id: true, banned: true },
    });
    if (!user) {
      return jsonError("USER_NOT_FOUND", "Assigned user not found.", 404);
    }
    if (user.banned) {
      return jsonError("USER_BANNED", "Assigned user is banned.", 400);
    }
    assignedUserId = user.id;
  }

  let expiresAt: Date | null = null;
  if (data.expiresAt?.trim()) {
    const d = new Date(data.expiresAt);
    if (Number.isNaN(d.getTime())) {
      return jsonError("VALIDATION", "Invalid expiry date.", 400);
    }
    expiresAt = d;
  }

  try {
    const gift = await createGiftCode({
      amountMicrocents: usdToMicrocents(data.amountUsd),
      createdById: admin.id,
      code: data.code,
      assignedUserId,
      note: data.note,
      expiresAt,
    });
    return jsonOk({ giftCode: gift });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CREATE_FAILED";
    if (msg === "CODE_EXISTS") {
      return jsonError("CONFLICT", "Gift code already exists.", 409);
    }
    if (msg === "USER_NOT_FOUND") {
      return jsonError("USER_NOT_FOUND", "Assigned user not found.", 404);
    }
    if (msg === "USER_BANNED") {
      return jsonError("USER_BANNED", "Assigned user is banned.", 400);
    }
    if (msg === "INVALID_AMOUNT") {
      return jsonError("VALIDATION", "Amount must be greater than 0.", 400);
    }
    if (msg === "INVALID_CODE") {
      return jsonError(
        "VALIDATION",
        "Code must be 4–64 letters or numbers.",
        400,
      );
    }
    console.error("[admin/gift-codes] create", e);
    return jsonError("SERVER", "Could not create gift code.", 500);
  }
}
