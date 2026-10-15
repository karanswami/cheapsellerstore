import { getEnv } from "@/lib/env";

/** Fire-and-forget Discord webhook. Never throws to callers. */
export async function notifyDiscordWebhook(payload: {
  title: string;
  description: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}): Promise<void> {
  const url = getEnv().discordWebhookUrl.trim();
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: payload.title.slice(0, 256),
            description: payload.description.slice(0, 4000),
            color: 0xd600ff,
            fields: (payload.fields ?? []).slice(0, 25).map((f) => ({
              name: f.name.slice(0, 256),
              value: f.value.slice(0, 1024),
              inline: Boolean(f.inline),
            })),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch {
    // ignore webhook failures
  }
}
