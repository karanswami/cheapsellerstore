import { getSettingText, SETTING_KEYS } from "@/lib/settings";

export type SupportChannels = {
  telegram: string;
  whatsapp: string;
  telegramHref: string | null;
  whatsappHref: string | null;
  primaryHref: string | null;
};

export function normalizeTelegramUrl(val: string): string | null {
  const v = val.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^t\.me\//i.test(v) || /^telegram\.me\//i.test(v)) return `https://${v}`;
  if (v.startsWith("@")) return `https://t.me/${v.slice(1)}`;
  if (/^[a-zA-Z0-9_]{4,}$/.test(v)) return `https://t.me/${v}`;
  return `https://t.me/${v.replace(/^@+/, "")}`;
}

export function normalizeWhatsappUrl(val: string): string | null {
  const v = val.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^wa\.me\//i.test(v) || /^api\.whatsapp\.com\//i.test(v)) return `https://${v}`;
  // Clean phone digits
  const digits = v.replace(/[^\d]/g, "");
  if (digits.length >= 7) {
    return `https://wa.me/${digits}`;
  }
  return v;
}

export async function getSupportChannels(): Promise<SupportChannels> {
  const [telegramRaw, whatsappRaw, contactRaw] = await Promise.all([
    getSettingText(SETTING_KEYS.supportTelegram, ""),
    getSettingText(SETTING_KEYS.supportWhatsapp, ""),
    getSettingText(SETTING_KEYS.supportContact, ""),
  ]);

  const telegramHref = normalizeTelegramUrl(telegramRaw);
  const whatsappHref = normalizeWhatsappUrl(whatsappRaw);

  let primaryHref: string | null = telegramHref || whatsappHref || null;
  if (!primaryHref && contactRaw.trim()) {
    const c = contactRaw.trim();
    if (/^@|^t\.me/i.test(c)) {
      primaryHref = normalizeTelegramUrl(c);
    } else if (/^wa\.me|^\+?[\d\s-]{7,}$/.test(c)) {
      primaryHref = normalizeWhatsappUrl(c);
    } else if (/^https?:\/\//i.test(c)) {
      primaryHref = c;
    }
  }

  return {
    telegram: telegramRaw.trim(),
    whatsapp: whatsappRaw.trim(),
    telegramHref,
    whatsappHref,
    primaryHref,
  };
}
