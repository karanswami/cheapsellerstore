import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { verifyAndNotifyChannel } from "@/lib/telegram-notify";
import { z } from "zod";

const schema = z.object({
  botToken: z.string().trim().min(10).max(200),
  chatId: z.string().trim().min(1).max(64),
  label: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid payload.", 400);
  }

  const result = await verifyAndNotifyChannel({
    botToken: parsed.data.botToken,
    chatId: parsed.data.chatId,
    label: parsed.data.label,
  });

  if (!result.ok) {
    return jsonError("TELEGRAM", result.message, 400);
  }

  return jsonOk({ ok: true });
}
