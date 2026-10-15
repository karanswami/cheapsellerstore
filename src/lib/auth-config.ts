import { getSettingText, SETTING_KEYS } from "@/lib/settings";
import { cache } from "react";

/** Google OAuth + Resend email — DB (admin Settings) first, env fallback. */

export const getGoogleClientId = cache(async (): Promise<string> => {
  const fromDb = (await getSettingText(SETTING_KEYS.googleClientId, "")).trim();
  if (fromDb) return fromDb;
  return process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
});

export const getGoogleClientSecret = cache(async (): Promise<string> => {
  const fromDb = (
    await getSettingText(SETTING_KEYS.googleClientSecret, "")
  ).trim();
  if (fromDb) return fromDb;
  return process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
});

export async function isGoogleAuthConfigured(): Promise<boolean> {
  const [clientId, clientSecret] = await Promise.all([
    getGoogleClientId(),
    getGoogleClientSecret(),
  ]);
  return Boolean(clientId && clientSecret);
}

export const getResendApiKey = cache(async (): Promise<string> => {
  const fromDb = (await getSettingText(SETTING_KEYS.resendApiKey, "")).trim();
  if (fromDb) return fromDb;
  return process.env.RESEND_API_KEY?.trim() ?? "";
});

export const getResendFromEmail = cache(async (): Promise<string> => {
  const fromDb = (await getSettingText(SETTING_KEYS.resendFromEmail, "")).trim();
  if (fromDb) return fromDb;
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ?? "Cheap Seller <onboarding@resend.dev>"
  );
});

export async function isResendConfigured(): Promise<boolean> {
  return Boolean(await getResendApiKey());
}
