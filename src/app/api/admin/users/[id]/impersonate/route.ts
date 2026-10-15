import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { requireAdmin } from "@/lib/auth/admin";
import { startImpersonation } from "@/lib/auth/impersonation";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin login required.", 401);
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError("NOT_FOUND", "User not found.", 404);
  if (target.banned) return jsonError("BANNED", "Cannot login as a banned user.", 400);
  if (target.role === UserRole.ADMIN) {
    return jsonError("FORBIDDEN", "Cannot impersonate another admin.", 403);
  }
  if (target.id === admin.id) {
    return jsonError("FORBIDDEN", "Already yourself.", 400);
  }

  await startImpersonation({
    adminId: admin.id,
    adminRole: admin.role,
    targetId: target.id,
    targetRole: target.role,
    targetUsername: target.username,
  });

  logActivity({
    request,
    action: "IMPERSONATE",
    category: "ADMIN",
    message: `Admin @${admin.username} impersonating @${target.username}`,
    user: target,
    metadata: {
      byAdminId: admin.id,
      byAdmin: admin.username,
    },
  });

  return jsonOk({ ok: true, username: target.username });
}
