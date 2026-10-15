import { appendSupportInboxMessage } from "@/lib/support-inbox";
import { navigateSupportBot } from "@/lib/support-bot";
import type { SupportChatReply } from "@/types/support";

export async function answerSupportChat(input: {
  message?: string | null;
  userId?: string | null;
  stepId?: string | null;
  buttonId?: string | null;
  buttonAction?: string | null;
}): Promise<SupportChatReply> {
  const result = await navigateSupportBot({
    message: input.message,
    stepId: input.stepId,
    buttonId: input.buttonId,
    buttonAction: input.buttonAction,
  });

  if (input.userId) {
    if (result.userEcho) {
      await appendSupportInboxMessage({
        userId: input.userId,
        role: "user",
        content: result.userEcho,
      });
    } else if (input.message?.trim()) {
      await appendSupportInboxMessage({
        userId: input.userId,
        role: "user",
        content: input.message.trim(),
      });
    }

    await appendSupportInboxMessage({
      userId: input.userId,
      role: "assistant",
      content: result.reply,
      buttons: result.buttons,
    });
  }

  return result;
}

export async function loadEntrySupportReply(): Promise<SupportChatReply> {
  return navigateSupportBot({});
}
