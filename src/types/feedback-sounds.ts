/** Site-wide interaction feedback pack (admin Settings). */

export const FEEDBACK_SOUND_SLOTS = [
  "tap",
  "toggle",
  "primary",
  "selection",
  "success",
  "error",
  "warning",
] as const;

export type FeedbackSoundSlot = (typeof FEEDBACK_SOUND_SLOTS)[number];

export type FeedbackSoundsMap = Record<FeedbackSoundSlot, string>;

export type FeedbackSoundConfig = {
  /** Site kill-switch for vibration / Capacitor Haptics. */
  hapticsEnabled: boolean;
  /** Site kill-switch for UI / outcome sounds. */
  soundsEnabled: boolean;
  /** Custom audio URLs per slot (empty = built-in synth). */
  sounds: FeedbackSoundsMap;
};

export function emptyFeedbackSoundsMap(): FeedbackSoundsMap {
  return {
    tap: "",
    toggle: "",
    primary: "",
    selection: "",
    success: "",
    error: "",
    warning: "",
  };
}

export function defaultFeedbackSoundConfig(): FeedbackSoundConfig {
  return {
    hapticsEnabled: true,
    soundsEnabled: true,
    sounds: emptyFeedbackSoundsMap(),
  };
}

export function countCustomFeedbackSounds(sounds?: FeedbackSoundsMap | null): number {
  if (!sounds) return 0;
  return FEEDBACK_SOUND_SLOTS.filter((slot) => Boolean(sounds[slot]?.trim())).length;
}

export function feedbackSoundSlotLabel(slot: FeedbackSoundSlot): string {
  switch (slot) {
    case "tap":
      return "Normal click";
    case "toggle":
      return "Toggle / outline";
    case "primary":
      return "Primary CTA";
    case "selection":
      return "Selection / chip";
    case "success":
      return "Success";
    case "error":
      return "Error";
    case "warning":
      return "Warning";
    default:
      return slot;
  }
}

export function feedbackSoundSlotHint(slot: FeedbackSoundSlot): string {
  switch (slot) {
    case "tap":
      return "Default taps and secondary actions";
    case "toggle":
      return "Outline / secondary buttons";
    case "primary":
      return "Filled primary buttons";
    case "selection":
      return "Switches, tabs, filter chips";
    case "success":
      return "Success toasts and confirmations";
    case "error":
      return "Error toasts and failures";
    case "warning":
      return "Warning toasts";
    default:
      return "";
  }
}
