import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications";
import { notifyTelegram } from "@/lib/telegram-notify";
import { ResellerRequestStatus, UserRole } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNote: z.string().trim().max(500).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid payload.", 400);

  const existing = await prisma.resellerRequest.findUnique({ where: { id } });
  if (!existing) return jsonError("NOT_FOUND", "Request not found.", 404);

  if (parsed.data.action === "approve") {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { role: UserRole.SELLER },
    });
    const req = await prisma.resellerRequest.update({
      where: { id },
      data: {
        status: ResellerRequestStatus.APPROVED,
        adminNote: parsed.data.adminNote ?? null,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
    const applicant = await prisma.user.findUnique({
      where: { id: existing.userId },
      select: { username: true, email: true },
    });
    void notifyUser({
      userId: existing.userId,
      type: "seller_approved",
      title: "You're a Seller now!",
      message: parsed.data.adminNote
        ? `Your seller application was approved. ${parsed.data.adminNote}`
        : "Your seller application was approved. Wholesale prices and the seller panel are unlocked.",
      actionUrl: "/app/seller",
    }).catch(() => {});
    void notifyTelegram(
      "ownerReseller",
      [
        "✅ Seller application approved",
        `User: @${applicant?.username ?? "?"} (${applicant?.email ?? existing.userId})`,
        `Request: ${req.id}`,
        `Admin: ${admin.id}`,
      ].join("\n"),
    );
    return jsonOk({ request: req });
  }

  // reject / disapprove — works on PENDING and APPROVED
  const targetUser = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { id: true, role: true },
  });

  if (
    targetUser &&
    targetUser.role === UserRole.SELLER &&
    (existing.status === ResellerRequestStatus.APPROVED ||
      existing.status === ResellerRequestStatus.PENDING)
  ) {
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        role: UserRole.USER,
        canCreateResellers: false,
        canManageResellers: false,
        canFundResellers: false,
      },
    });
  }

  const req = await prisma.resellerRequest.update({
    where: { id },
    data: {
      status: ResellerRequestStatus.REJECTED,
      adminNote: parsed.data.adminNote ?? null,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  const applicant = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { username: true, email: true },
  });

  void notifyUser({
    userId: existing.userId,
    type: "seller_rejected",
    title: existing.status === ResellerRequestStatus.APPROVED ? "Seller access removed" : "Seller application not approved",
    message: parsed.data.adminNote
      ? `Reason: ${parsed.data.adminNote}`
      : "Your seller application was not approved this time. Contact support if you have questions.",
    actionUrl: "/app/become-seller",
  }).catch(() => {});

  void notifyTelegram(
    "ownerReseller",
    [
      "❌ Seller application rejected",
      `User: @${applicant?.username ?? "?"} (${applicant?.email ?? existing.userId})`,
      ...(parsed.data.adminNote ? [`Reason: ${parsed.data.adminNote}`] : []),
      `Request: ${req.id}`,
      `Admin: ${admin.id}`,
    ].join("\n"),
  );

  return jsonOk({ request: req });
}
