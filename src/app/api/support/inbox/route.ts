import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser, requireCustomer } from "@/lib/auth/customer";
import {
  appendSupportInboxMessage,
  clearSupportInbox,
  countSupportInboxUnread,
  listSupportInbox,
  markSupportInboxRead,
} from "@/lib/support-inbox";
import { z } from "zod";

const buttonActionEnum = z.enum(["focus_input", "back", "menu"]);

const appendSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().trim().min(1).max(4000),
  buttons: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        href: z.string().optional(),
        action: buttonActionEnum.optional(),
        meta: z.string().optional(),
      }),
    )
    .max(8)
    .optional(),
  ticketId: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return jsonOk({ messages: [] as const, unread: 0 });
  }
  const [messages, unread] = await Promise.all([
    listSupportInbox(user.id),
    countSupportInboxUnread(user.id),
  ]);
  return jsonOk({ messages, unread });
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  if (action === "read") {
    await markSupportInboxRead(user.id);
    return jsonOk({ ok: true });
  }

  if (action === "clear") {
    await clearSupportInbox(user.id);
    return jsonOk({ ok: true });
  }

  const parsed = appendSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid message.",
      400,
    );
  }

  const message = await appendSupportInboxMessage({
    userId: user.id,
    role: parsed.data.role,
    content: parsed.data.content,
    buttons: parsed.data.buttons,
    ticketId: parsed.data.ticketId,
    attachmentUrl: parsed.data.attachmentUrl,
    read: true,
  });

  return jsonOk({ message });
}
