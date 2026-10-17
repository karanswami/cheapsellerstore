import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { clientIpFromHeaders, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import { getSecurityConfig } from "@/lib/security-config";
import { answerSupportChat, loadEntrySupportReply } from "@/lib/support-chat";
import { supportChatSchema } from "@/lib/validations";

export async function GET() {
  try {
    const entry = await loadEntrySupportReply();
    return jsonOk(entry);
  } catch (err) {
    console.error("[support/chat GET]", err);
    return jsonError("INTERNAL", "Support is unavailable.", 500);
  }
}

export async function POST(request: Request) {
  try {
    // Open endpoint that can trigger a paid AI fallback: cap it per client.
    const { supportChatPerMinute } = await getSecurityConfig();
    const limited = await rateLimitAll([
      { key: `support-chat:${clientIpFromHeaders(request.headers)}`, limit: supportChatPerMinute, windowMs: 60_000 },
    ]);
    if (limited) return tooManyRequests(limited, "You're sending messages too fast. Please wait a moment.");

    const body = await request.json().catch(() => null);
    const parsed = supportChatSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        "VALIDATION",
        parsed.error.issues[0]?.message ?? "Invalid message.",
        400,
      );
    }

    const user = await getCurrentUser();
    const result = await answerSupportChat({
      message: parsed.data.message?.trim() || "",
      userId: user?.id ?? null,
      stepId: parsed.data.stepId,
      buttonId: parsed.data.buttonId,
      buttonAction: parsed.data.buttonAction,
    });

    return jsonOk(result);
  } catch (err) {
    console.error("[support/chat]", err);
    return jsonError("INTERNAL", "Support is unavailable.", 500);
  }
}
