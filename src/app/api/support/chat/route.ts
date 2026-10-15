import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { answerSupportChat, loadEntrySupportReply } from "@/lib/support-chat";
import { supportChatSchema } from "@/lib/validations";

export async function GET() {
  try {
    const entry = await loadEntrySupportReply();
    return jsonOk(entry);
  } catch (err) {
    console.error("[support/chat GET]", err);
    return jsonError(
      "INTERNAL",
      err instanceof Error ? err.message : "Support is unavailable.",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
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
    return jsonError(
      "INTERNAL",
      err instanceof Error ? err.message : "Support is unavailable.",
      500,
    );
  }
}
