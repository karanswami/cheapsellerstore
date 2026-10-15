import "server-only";

import { cache } from "react";
import { formatMoney } from "@/lib/currencies";
import { getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import {
  defaultTelegramNotifyConfig,
  normalizeTelegramChatId,
  parseTelegramChatIdFromPostUrl,
  TELEGRAM_BOT_TOKEN_DEFAULT,
  TELEGRAM_NOTIFY_DEFAULTS,
  TELEGRAM_NOTIFY_EVENTS,
  type TelegramNotifyChannel,
  type TelegramNotifyConfig,
  type TelegramNotifyEvent,
} from "@/types/telegram-notify";

/** Group order lines for Telegram: product — duration ×qty · $total */
export function formatTelegramPurchaseLines(
  items: Array<{
    productTitle: string;
    durationLabel: string;
    unitPrice: number;
  }>,
): string[] {
  type Agg = {
    productTitle: string;
    durationLabel: string;
    qty: number;
    total: number;
  };
  const map = new Map<string, Agg>();
  for (const it of items) {
    const k = `${it.productTitle}\0${it.durationLabel}`;
    const cur = map.get(k);
    if (cur) {
      cur.qty += 1;
      cur.total += it.unitPrice;
    } else {
      map.set(k, {
        productTitle: it.productTitle,
        durationLabel: it.durationLabel,
        qty: 1,
        total: it.unitPrice,
      });
    }
  }
  return [...map.values()].map(
    (g) =>
      `• ${g.productTitle} — ${g.durationLabel} ×${g.qty} · ${formatMoney(g.total)}`,
  );
}

const TG_API = "https://api.telegram.org";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export { parseTelegramChatIdFromPostUrl, normalizeTelegramChatId };

function normalizeChannel(
  event: TelegramNotifyEvent,
  raw: unknown,
): TelegramNotifyChannel {
  const d = TELEGRAM_NOTIFY_DEFAULTS[event];
  const obj = asRecord(raw);
  if (!obj) {
    return {
      enabled: true,
      chatId: d.chatId,
      inviteLink: d.inviteLink,
      label: d.label,
    };
  }
  const chatRaw = String(obj.chatId ?? "").trim();
  return {
    enabled: obj.enabled !== false,
    chatId: chatRaw ? normalizeTelegramChatId(chatRaw) : d.chatId,
    inviteLink: String(obj.inviteLink ?? d.inviteLink).trim() || d.inviteLink,
    label: String(obj.label ?? d.label).trim() || d.label,
  };
}

export function normalizeTelegramNotifyConfig(
  raw: unknown,
): TelegramNotifyConfig {
  const base = defaultTelegramNotifyConfig();
  const obj = asRecord(raw);
  if (!obj) return base;

  const channelsRaw = asRecord(obj.channels);
  const channels = {} as Record<TelegramNotifyEvent, TelegramNotifyChannel>;
  for (const event of TELEGRAM_NOTIFY_EVENTS) {
    channels[event] = normalizeChannel(
      event,
      channelsRaw ? channelsRaw[event] : undefined,
    );
  }

  const tokenRaw = String(obj.botToken ?? "").trim();
  const envToken = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();

  return {
    enabled: obj.enabled === true,
    botToken: tokenRaw || envToken || TELEGRAM_BOT_TOKEN_DEFAULT,
    channels,
  };
}

async function loadTelegramNotifyConfig(): Promise<TelegramNotifyConfig> {
  try {
    const raw = await getSettingText(SETTING_KEYS.telegramNotifications, "");
    if (!raw.trim()) return defaultTelegramNotifyConfig();
    return normalizeTelegramNotifyConfig(JSON.parse(raw) as unknown);
  } catch {
    return defaultTelegramNotifyConfig();
  }
}

/** Request-scoped read for admin Settings / RSC. */
export const getTelegramNotifyConfig = cache(loadTelegramNotifyConfig);

export async function saveTelegramNotifyConfig(
  input: TelegramNotifyConfig,
): Promise<TelegramNotifyConfig> {
  const normalized = normalizeTelegramNotifyConfig(input);
  await upsertSetting({
    key: SETTING_KEYS.telegramNotifications,
    textValue: JSON.stringify(normalized),
  });
  return normalized;
}

type TgApiResult<T> = {
  ok: boolean;
  description?: string;
  result?: T;
};

async function telegramApi<T>(
  botToken: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<TgApiResult<T>> {
  const token = botToken.trim();
  if (!token) {
    return { ok: false, description: "Bot token is empty." };
  }
  try {
    const res = await fetch(`${TG_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json()) as TgApiResult<T>;
    return json;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Telegram API request failed.";
    return { ok: false, description: message };
  }
}

export async function assertBotIsChannelAdmin(
  botToken: string,
  chatId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const chat = normalizeTelegramChatId(chatId);
  if (!chat) {
    return { ok: false, message: "Channel chat ID is empty." };
  }

  const me = await telegramApi<{ id: number; username?: string }>(
    botToken,
    "getMe",
  );
  if (!me.ok || !me.result?.id) {
    return {
      ok: false,
      message: me.description || "Invalid bot token (getMe failed).",
    };
  }

  const member = await telegramApi<{ status: string }>(
    botToken,
    "getChatMember",
    { chat_id: chat, user_id: me.result.id },
  );
  if (!member.ok || !member.result) {
    return {
      ok: false,
      message:
        member.description ||
        "Cannot read channel membership. Add the bot to the channel first.",
    };
  }

  const status = member.result.status;
  if (status !== "administrator" && status !== "creator") {
    return {
      ok: false,
      message: `Bot must be channel admin (current status: ${status}).`,
    };
  }

  return { ok: true };
}

async function sendRawMessage(
  botToken: string,
  chatId: string,
  text: string,
  options?: { pin?: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const chat = normalizeTelegramChatId(chatId);
  const result = await telegramApi<{ message_id: number }>(
    botToken,
    "sendMessage",
    {
      chat_id: chat,
      text: text.slice(0, 4096),
      disable_web_page_preview: true,
    },
  );
  if (!result.ok) {
    return {
      ok: false,
      message: result.description || "sendMessage failed.",
    };
  }
  if (options?.pin && result.result?.message_id) {
    // Best-effort: needs the "Pin messages" admin right; never fails the send.
    await telegramApi(botToken, "pinChatMessage", {
      chat_id: chat,
      message_id: result.result.message_id,
      disable_notification: true,
    });
  }
  return { ok: true };
}

/** Verify bot is channel admin, then send a short test ping. */
export async function verifyAndNotifyChannel(options: {
  botToken: string;
  chatId: string;
  label?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = await assertBotIsChannelAdmin(
    options.botToken,
    options.chatId,
  );
  if (!admin.ok) return admin;

  const label = (options.label || "channel").trim();
  return sendRawMessage(
    options.botToken,
    options.chatId,
    `✅ Cheap Seller notify OK\nChannel: ${label}\nBot is admin and can post.`,
  );
}

/**
 * Fire-and-forget channel push for a configured event.
 * Never throws to callers.
 */
export async function notifyTelegram(
  event: TelegramNotifyEvent,
  text: string,
  options?: { pin?: boolean; fallbackEvent?: TelegramNotifyEvent },
): Promise<void> {
  try {
    const config = await loadTelegramNotifyConfig();
    if (!config.enabled) return;

    let channel = config.channels[event];
    if (options?.fallbackEvent && !channel?.chatId?.trim()) {
      channel = config.channels[options.fallbackEvent];
    }
    if (!channel?.enabled) return;

    const token = config.botToken.trim();
    const chatId = channel.chatId.trim();
    if (!token || !chatId) return;

    const body = text.trim();
    if (!body) return;

    await sendRawMessage(token, chatId, body, { pin: options?.pin });
  } catch {
    // ignore notify failures
  }
}

export type {
  TelegramNotifyChannel,
  TelegramNotifyConfig,
  TelegramNotifyEvent,
};
