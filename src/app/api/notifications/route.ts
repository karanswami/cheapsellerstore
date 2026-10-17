import { jsonError, jsonOk } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/customer";
import {
  countUnreadNotifications,
  deleteNotifications,
  listNotifications,
  markNotificationsRead,
} from "@/lib/notifications";
import { z } from "zod";

async function viewer() {
  try {
    return await requireCustomer();
  } catch {
    return null;
  }
}

/** ?count=1 → just the unread count (cheap poll for the bell). Otherwise a page of notifications. */
export async function GET(request: Request) {
  const user = await viewer();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);

  const url = new URL(request.url);
  if (url.searchParams.get("count")) {
    return jsonOk({ unread: await countUnreadNotifications(user.id) });
  }
  const page = await listNotifications(user.id, {
    filter: url.searchParams.get("filter") ?? "all",
    cursor: url.searchParams.get("cursor"),
    limit: Number(url.searchParams.get("limit") || "20"),
  });
  return jsonOk(page);
}

const readSchema = z.object({ ids: z.array(z.string().regex(/^[0-9a-f]{24}$/i)).max(100).optional() });

/** Mark read: `{ ids }` for specific rows, `{}` for all. */
export async function PATCH(request: Request) {
  const user = await viewer();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);

  const parsed = readSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("VALIDATION", "Invalid payload.", 400);

  const updated = await markNotificationsRead(user.id, parsed.data.ids);
  return jsonOk({ updated, unread: await countUnreadNotifications(user.id) });
}

/** ?id=… deletes one; no id clears every read notification. */
export async function DELETE(request: Request) {
  const user = await viewer();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);

  const id = new URL(request.url).searchParams.get("id") ?? undefined;
  if (id && !/^[0-9a-f]{24}$/i.test(id)) return jsonError("VALIDATION", "Invalid id.", 400);

  const deleted = await deleteNotifications(user.id, id);
  return jsonOk({ deleted, unread: await countUnreadNotifications(user.id) });
}
