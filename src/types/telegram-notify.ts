/** Admin Settings — Telegram Bot API channel push notifications. */

export const TELEGRAM_NOTIFY_EVENTS = [
  "deposit",
  "register",
  "purchase",
  "ownerReseller",
  "subReseller",
  "manualDeposit",
  "report",
  "referral",
  "apiKey",
  "apiKeyTf",
  "binanceDeposit",
  "qrisDeposit",
  "adminUpdate",
] as const;

export type TelegramNotifyEvent = (typeof TELEGRAM_NOTIFY_EVENTS)[number];

export type TelegramNotifyChannel = {
  enabled: boolean;
  chatId: string;
  inviteLink: string;
  label: string;
};

export type TelegramNotifyConfig = {
  /** Master kill-switch for all Telegram channel pushes. */
  enabled: boolean;
  botToken: string;
  channels: Record<TelegramNotifyEvent, TelegramNotifyChannel>;
};

export const TELEGRAM_NOTIFY_DEFAULTS: Record<
  TelegramNotifyEvent,
  { label: string; chatId: string; inviteLink: string }
> = {
  deposit: {
    label: "Deposit",
    chatId: "-1003599571769",
    inviteLink: "https://t.me/+XWsGexqEvGYwZTg1",
  },
  register: {
    label: "Register",
    chatId: "-1003324248601",
    inviteLink: "https://t.me/+YMOPUV7PDR1iZGQ1",
  },
  purchase: {
    label: "Purchase",
    chatId: "-1004443071170",
    inviteLink: "https://t.me/+pcSHFP1SeBEyNjY1",
  },
  ownerReseller: {
    label: "Owner Reseller",
    chatId: "-1004436540776",
    inviteLink: "https://t.me/+eHYM4MsA611jMjBl",
  },
  subReseller: {
    label: "Sub-Reseller",
    chatId: "-1004326950971",
    inviteLink: "https://t.me/+BoAieUd-GVVkNzNl",
  },
  manualDeposit: {
    label: "Manual Deposit",
    chatId: "-1004307400448",
    inviteLink: "https://t.me/+6BSnJuRX20s4NWNl",
  },
  report: {
    label: "Report",
    chatId: "-1003738690131",
    inviteLink: "https://t.me/+TGNi7lC4DxQzZjI1",
  },
  referral: {
    label: "Referral",
    chatId: "-1004367372837",
    inviteLink: "https://t.me/+0oba5O6AD88yNjY1",
  },
  apiKey: {
    label: "Api Key",
    chatId: "-1004439305681",
    inviteLink: "https://t.me/+bMgMfNpGw44xN2E1",
  },
  apiKeyTf: {
    label: "Api Key TF",
    chatId: "-1004385916106",
    inviteLink: "https://t.me/+snODww9VM24zNTVl",
  },
  binanceDeposit: {
    label: "Binance Deposit",
    chatId: "-1004445695957",
    inviteLink: "https://t.me/+ms30UF1BMZs4MzVl",
  },
  qrisDeposit: {
    label: "QRIS Deposit",
    chatId: "",
    inviteLink: "",
  },
  adminUpdate: {
    label: "Admin Update",
    chatId: "-1004352410676",
    inviteLink: "https://t.me/+WRY26Y-JbDo0ODdl",
  },
};

/** Prefill when DB/env empty (server-only normalize). Prefer rotating after first setup. */
export const TELEGRAM_BOT_TOKEN_DEFAULT =
  "8923340837:AAEm3DuC1OL-XOm_jB4vaTa-siD0BDLQ1gY";

export function defaultTelegramNotifyConfig(): TelegramNotifyConfig {
  const channels = {} as Record<TelegramNotifyEvent, TelegramNotifyChannel>;
  for (const event of TELEGRAM_NOTIFY_EVENTS) {
    const d = TELEGRAM_NOTIFY_DEFAULTS[event];
    channels[event] = {
      enabled: true,
      chatId: d.chatId,
      inviteLink: d.inviteLink,
      label: d.label,
    };
  }
  return {
    enabled: false,
    botToken: TELEGRAM_BOT_TOKEN_DEFAULT,
    channels,
  };
}

export function telegramNotifyEventLabel(event: TelegramNotifyEvent): string {
  return TELEGRAM_NOTIFY_DEFAULTS[event].label;
}

export function countEnabledTelegramChannels(
  config?: TelegramNotifyConfig | null,
): number {
  if (!config?.channels) return 0;
  return TELEGRAM_NOTIFY_EVENTS.filter(
    (e) => Boolean(config.channels[e]?.enabled && config.channels[e]?.chatId?.trim()),
  ).length;
}

/**
 * Extract Bot API chat_id from a private-channel post URL.
 * `https://t.me/c/3599571769/3` → `-1003599571769`
 */
export function parseTelegramChatIdFromPostUrl(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  const m = raw.match(
    /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/c\/(\d{5,20})(?:\/\d+)?/i,
  );
  if (!m?.[1]) return null;
  return `-100${m[1]}`;
}

/** Normalize pasted chat id / post URL to Bot API chat_id. */
export function normalizeTelegramChatId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const fromUrl = parseTelegramChatIdFromPostUrl(trimmed);
  if (fromUrl) return fromUrl;
  if (/^-?\d+$/.test(trimmed)) {
    if (trimmed.startsWith("-100")) return trimmed;
    if (trimmed.startsWith("-")) return trimmed;
    if (/^\d{5,20}$/.test(trimmed)) return `-100${trimmed}`;
    return trimmed;
  }
  return trimmed;
}
