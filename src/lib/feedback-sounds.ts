import { cache } from "react";
import { getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import { isFeedbackSoundUrl } from "@/lib/public-uploads";
import {
  defaultFeedbackSoundConfig,
  emptyFeedbackSoundsMap,
  FEEDBACK_SOUND_SLOTS,
  type FeedbackSoundConfig,
  type FeedbackSoundsMap,
} from "@/types/feedback-sounds";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function normalizeFeedbackSoundConfig(
  raw: unknown,
): FeedbackSoundConfig {
  const base = defaultFeedbackSoundConfig();
  const obj = asRecord(raw);
  if (!obj) return base;

  const soundsRaw = asRecord(obj.sounds) ?? obj;
  const sounds = emptyFeedbackSoundsMap();
  for (const slot of FEEDBACK_SOUND_SLOTS) {
    const url = String(soundsRaw[slot] ?? "").trim();
    sounds[slot] = isFeedbackSoundUrl(url) ? url : "";
  }

  return {
    hapticsEnabled: obj.hapticsEnabled !== false,
    soundsEnabled: obj.soundsEnabled !== false,
    sounds,
  };
}

export const getFeedbackSoundConfig = cache(
  async (): Promise<FeedbackSoundConfig> => {
    try {
      const raw = await getSettingText(SETTING_KEYS.feedbackSounds, "");
      if (!raw.trim()) return defaultFeedbackSoundConfig();
      return normalizeFeedbackSoundConfig(JSON.parse(raw) as unknown);
    } catch {
      return defaultFeedbackSoundConfig();
    }
  },
);

export async function saveFeedbackSoundConfig(
  input: FeedbackSoundConfig,
): Promise<FeedbackSoundConfig> {
  const normalized = normalizeFeedbackSoundConfig(input);
  await upsertSetting({
    key: SETTING_KEYS.feedbackSounds,
    textValue: JSON.stringify(normalized),
  });
  return normalized;
}

export type { FeedbackSoundConfig, FeedbackSoundsMap };
