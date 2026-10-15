/**
 * Client-side interaction + outcome feedback.
 * Tap: tiered UI clicks + Android-style haptic patterns.
 * Mute: `drip-feedback-mute` ("1" = all off). Granular sound/haptic keys.
 * Site pack: admin Settings custom audio URLs + haptics/sounds kill-switches.
 */

import { isNativeApp } from "@/lib/native-app";
import {
  defaultFeedbackSoundConfig,
  type FeedbackSoundConfig,
  type FeedbackSoundSlot,
} from "@/types/feedback-sounds";

export const FEEDBACK_MUTE_KEY = "drip-feedback-mute";
export const FEEDBACK_SOUND_MUTE_KEY = "drip-feedback-sound-mute";
export const FEEDBACK_HAPTIC_MUTE_KEY = "drip-feedback-haptic-mute";

export type HapticImpact =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "error"
  | "warning";

export type ClickSoundTier = "tap" | "toggle" | "primary" | "selection";

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export type FeedbackTapOptions = {
  /** Skip sound (haptic only). */
  silent?: boolean;
  /** Skip vibration (sound only). */
  noHaptic?: boolean;
  /** @deprecated Use `impact` instead. */
  hapticMs?: number;
  impact?: HapticImpact;
  sound?: ClickSoundTier;
};

const HAPTIC_PATTERNS: Record<HapticImpact, number | number[]> = {
  light: 10,
  medium: 14,
  heavy: [18, 30, 12],
  selection: 6,
  success: [10, 35, 14],
  error: [22, 60, 22, 60, 22],
  warning: [14, 40, 14],
};

type ClickSynthConfig = {
  duration: number;
  bodyFreq: number;
  bodyGain: number;
  tickHigh: number;
  tickLow: number;
  tickGain: number;
  masterGain: number;
};

const CLICK_SYNTH: Record<ClickSoundTier, ClickSynthConfig> = {
  tap: {
    duration: 0.028,
    bodyFreq: 420,
    bodyGain: 0.38,
    tickHigh: 1850,
    tickLow: 2650,
    tickGain: 0.42,
    masterGain: 0.48,
  },
  toggle: {
    duration: 0.022,
    bodyFreq: 520,
    bodyGain: 0.28,
    tickHigh: 2100,
    tickLow: 2900,
    tickGain: 0.5,
    masterGain: 0.44,
  },
  selection: {
    duration: 0.018,
    bodyFreq: 640,
    bodyGain: 0.22,
    tickHigh: 2400,
    tickLow: 3200,
    tickGain: 0.38,
    masterGain: 0.4,
  },
  primary: {
    duration: 0.034,
    bodyFreq: 320,
    bodyGain: 0.45,
    tickHigh: 1650,
    tickLow: 2450,
    tickGain: 0.36,
    masterGain: 0.52,
  },
};

let sharedCtx: AudioContext | null = null;
const clickBuffers = new Map<ClickSoundTier, AudioBuffer>();
const customAudioCache = new Map<string, HTMLAudioElement>();
let sitePack: FeedbackSoundConfig = defaultFeedbackSoundConfig();
let lastTapAt = 0;
const TAP_THROTTLE_MS = 28;

/** Apply admin Settings feedback pack (custom sounds + site kill-switches). */
export function configureFeedbackPack(config: FeedbackSoundConfig | null | undefined): void {
  sitePack = config ?? defaultFeedbackSoundConfig();
  customAudioCache.clear();
}

export function getFeedbackPack(): FeedbackSoundConfig {
  return sitePack;
}

export function isFeedbackMuted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(FEEDBACK_MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setFeedbackMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (muted) localStorage.setItem(FEEDBACK_MUTE_KEY, "1");
    else localStorage.removeItem(FEEDBACK_MUTE_KEY);
  } catch {
    /* ignore */
  }
}

/** Master mute OR per-channel sound mute OR site sounds kill-switch. */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined" || isFeedbackMuted()) return false;
  if (!sitePack.soundsEnabled) return false;
  try {
    return localStorage.getItem(FEEDBACK_SOUND_MUTE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (muted) localStorage.setItem(FEEDBACK_SOUND_MUTE_KEY, "1");
    else localStorage.removeItem(FEEDBACK_SOUND_MUTE_KEY);
  } catch {
    /* ignore */
  }
}

/** Master mute OR per-channel haptic mute OR site haptics kill-switch. */
export function isHapticsEnabled(): boolean {
  if (typeof window === "undefined" || isFeedbackMuted()) return false;
  if (!sitePack.hapticsEnabled) return false;
  try {
    return localStorage.getItem(FEEDBACK_HAPTIC_MUTE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function setHapticsMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (muted) localStorage.setItem(FEEDBACK_HAPTIC_MUTE_KEY, "1");
    else localStorage.removeItem(FEEDBACK_HAPTIC_MUTE_KEY);
  } catch {
    /* ignore */
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function shouldUseHaptics(): boolean {
  if (typeof window === "undefined") return false;
  if (!isHapticsEnabled()) return false;
  if (prefersReducedMotion()) return false;
  // Native Capacitor Haptics does not need navigator.vibrate.
  if (isNativeApp()) return true;
  try {
    if (typeof navigator === "undefined") return false;
    if (typeof navigator.vibrate !== "function") return false;
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const hasTouch =
      "maxTouchPoints" in navigator && navigator.maxTouchPoints > 0;
    return isAndroid || hasTouch;
  } catch {
    return false;
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AC();
  }
  return sharedCtx;
}

async function ensureAudioContext(): Promise<AudioContext | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }
  return ctx;
}

function buildClickBuffer(
  ctx: AudioContext,
  tier: ClickSoundTier,
): AudioBuffer {
  const cfg = CLICK_SYNTH[tier];
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * cfg.duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 160) * (1 - t / cfg.duration);
    const body =
      Math.sin(2 * Math.PI * cfg.bodyFreq * t) *
      cfg.bodyGain *
      Math.exp(-t * 90);
    const tick =
      Math.sin(2 * Math.PI * cfg.tickHigh * t) * cfg.tickGain +
      Math.sin(2 * Math.PI * cfg.tickLow * t) * (cfg.tickGain * 0.42);
    const transient =
      Math.sin(2 * Math.PI * 5400 * t) * 0.14 * Math.exp(-t * 420);
    data[i] = (body + tick * env + transient) * cfg.masterGain;
  }

  return buffer;
}

function ensureClickBuffer(
  ctx: AudioContext,
  tier: ClickSoundTier,
): AudioBuffer {
  let buffer = clickBuffers.get(tier);
  if (!buffer) {
    buffer = buildClickBuffer(ctx, tier);
    clickBuffers.set(tier, buffer);
  }
  return buffer;
}

async function getClickBuffer(tier: ClickSoundTier): Promise<AudioBuffer | null> {
  const ctx = await ensureAudioContext();
  if (!ctx) return null;
  try {
    return ensureClickBuffer(ctx, tier);
  } catch {
    return null;
  }
}

/** Warm AudioContext + prebuild click buffers (call on first user gesture). */
export function preloadInteractionFeedback(): void {
  if (typeof window === "undefined") return;
  void getClickBuffer("tap");
  void getClickBuffer("primary");
}

function vibrate(impact: HapticImpact): void {
  if (!shouldUseHaptics()) return;
  void nativeHaptic(impact);
}

async function nativeHaptic(impact: HapticImpact): Promise<void> {
  if (isNativeApp()) {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import(
        "@capacitor/haptics"
      );
      switch (impact) {
        case "selection":
          await Haptics.selectionChanged();
          return;
        case "success":
          await Haptics.notification({ type: NotificationType.Success });
          return;
        case "error":
          await Haptics.notification({ type: NotificationType.Error });
          return;
        case "warning":
          await Haptics.notification({ type: NotificationType.Warning });
          return;
        case "light":
          await Haptics.impact({ style: ImpactStyle.Light });
          return;
        case "medium":
          await Haptics.impact({ style: ImpactStyle.Medium });
          return;
        case "heavy":
          await Haptics.impact({ style: ImpactStyle.Heavy });
          return;
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
          return;
      }
    } catch {
      /* fall through to vibration API */
    }
  }
  try {
    navigator.vibrate(HAPTIC_PATTERNS[impact]);
  } catch {
    /* iOS Safari and unsupported browsers */
  }
}

function tone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = "sine",
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

async function playChime(
  notes: { freq: number; offset: number; dur: number; peak: number }[],
): Promise<void> {
  if (!isSoundEnabled()) return;
  const ctx = await ensureAudioContext();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (const n of notes) {
    tone(ctx, n.freq, t0 + n.offset, n.dur, n.peak);
  }
}

function customSoundUrl(slot: FeedbackSoundSlot): string {
  return sitePack.sounds[slot]?.trim() ?? "";
}

function playCustomUrl(url: string, volume = 0.72): boolean {
  if (typeof window === "undefined" || !url) return false;
  try {
    let audio = customAudioCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      audio.preload = "auto";
      customAudioCache.set(url, audio);
    }
    audio.volume = volume;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* autoplay / decode errors */
    });
    return true;
  } catch {
    return false;
  }
}

function playSlotSound(
  slot: FeedbackSoundSlot,
  fallback: () => void,
): void {
  if (!isSoundEnabled()) return;
  const url = customSoundUrl(slot);
  if (url && playCustomUrl(url)) return;
  fallback();
}

function playSuccessSound(): void {
  playSlotSound("success", () => {
    void playChime([
      { freq: 523.25, offset: 0, dur: 0.09, peak: 0.09 },
      { freq: 659.25, offset: 0.07, dur: 0.11, peak: 0.1 },
      { freq: 783.99, offset: 0.14, dur: 0.18, peak: 0.085 },
      { freq: 1046.5, offset: 0.22, dur: 0.14, peak: 0.06 },
    ]);
  });
}

function playErrorSound(): void {
  playSlotSound("error", () => {
    void playChime([
      { freq: 196, offset: 0, dur: 0.12, peak: 0.1 },
      { freq: 147, offset: 0.1, dur: 0.16, peak: 0.09 },
      { freq: 110, offset: 0.2, dur: 0.22, peak: 0.075 },
    ]);
  });
}

function playWarningSound(): void {
  playSlotSound("warning", () => {
    void playChime([
      { freq: 440, offset: 0, dur: 0.1, peak: 0.09 },
      { freq: 349.23, offset: 0.09, dur: 0.14, peak: 0.08 },
    ]);
  });
}

function playBufferedClick(
  ctx: AudioContext,
  buffer: AudioBuffer,
  volume = 0.72,
): void {
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.value = volume;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(0);
}

function playClickSound(tier: ClickSoundTier = "tap"): void {
  if (!isSoundEnabled()) return;

  const url = customSoundUrl(tier);
  if (url && playCustomUrl(url)) return;

  const ctx = getAudioContext();
  if (ctx?.state === "running") {
    try {
      playBufferedClick(ctx, ensureClickBuffer(ctx, tier));
      return;
    } catch {
      /* fall through */
    }
  }

  void (async () => {
    const ready = await ensureAudioContext();
    if (!ready) return;
    try {
      playBufferedClick(ready, ensureClickBuffer(ready, tier));
    } catch {
      /* ignore */
    }
  })();
}

/** Map interactive element → haptic + sound tier for delegation. */
export function resolveTapFeedbackFromElement(el: Element): {
  impact: HapticImpact;
  sound: ClickSoundTier;
} {
  if (!(el instanceof HTMLElement)) {
    return { impact: "light", sound: "tap" };
  }

  const slot = el.getAttribute("data-slot");
  const variant = el.getAttribute("data-variant");

  if (
    slot === "switch" ||
    slot === "filter-chip" ||
    slot === "tabs-trigger" ||
    slot === "select-item"
  ) {
    return { impact: "selection", sound: "selection" };
  }

  if (variant === "default") {
    return { impact: "medium", sound: "primary" };
  }

  if (variant === "destructive" || variant === "success") {
    return { impact: "medium", sound: "tap" };
  }

  if (slot === "button" && (variant === "outline" || variant === "secondary")) {
    return { impact: "light", sound: "toggle" };
  }

  return { impact: "light", sound: "tap" };
}

export function feedbackImpact(
  impact: HapticImpact,
  options: Pick<FeedbackTapOptions, "silent" | "noHaptic" | "sound"> = {},
): void {
  if (typeof window === "undefined" || isFeedbackMuted()) return;

  const now = performance.now();
  if (now - lastTapAt < TAP_THROTTLE_MS) return;
  lastTapAt = now;

  if (!options.silent) {
    const sound =
      options.sound ??
      (impact === "selection"
        ? "selection"
        : impact === "medium" || impact === "heavy"
          ? "primary"
          : "tap");
    playClickSound(sound);
  }

  if (!options.noHaptic) {
    vibrate(impact);
  }
}

/**
 * Premium tap: tiered click + Android-style haptic.
 * Throttled to avoid double-fire from nested handlers.
 */
export function feedbackTap(options: FeedbackTapOptions = {}): void {
  if (typeof window === "undefined" || isFeedbackMuted()) return;

  const impact: HapticImpact =
    options.impact ??
    (options.hapticMs != null && options.hapticMs > 14 ? "medium" : "light");

  feedbackImpact(impact, {
    silent: options.silent,
    noHaptic: options.noHaptic,
    sound: options.sound,
  });
}

/** Light haptic + ascending chime — paired with toast.success. */
export function feedbackSuccess(): void {
  if (typeof window === "undefined" || isFeedbackMuted()) return;
  vibrate("success");
  playSuccessSound();
}

/** Stronger haptic + descending buzz — paired with toast.error. */
export function feedbackError(): void {
  if (typeof window === "undefined" || isFeedbackMuted()) return;
  vibrate("error");
  playErrorSound();
}

/** Soft warning haptic + two-tone chime — paired with toast.warning. */
export function feedbackWarning(): void {
  if (typeof window === "undefined" || isFeedbackMuted()) return;
  vibrate("warning");
  playWarningSound();
}

async function playChimeForced(
  notes: { freq: number; offset: number; dur: number; peak: number }[],
): Promise<void> {
  const ctx = await ensureAudioContext();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (const n of notes) {
    tone(ctx, n.freq, t0 + n.offset, n.dur, n.peak);
  }
}

/**
 * Preview a feedback slot in admin UI (bypasses user mute).
 * Plays custom URL when set, otherwise built-in synth/chime.
 */
export function previewFeedbackSound(slot: FeedbackSoundSlot): void {
  if (typeof window === "undefined") return;

  const url = customSoundUrl(slot);
  if (url && playCustomUrl(url, 0.8)) return;

  if (slot === "success") {
    void playChimeForced([
      { freq: 523.25, offset: 0, dur: 0.09, peak: 0.09 },
      { freq: 659.25, offset: 0.07, dur: 0.11, peak: 0.1 },
      { freq: 783.99, offset: 0.14, dur: 0.18, peak: 0.085 },
    ]);
    return;
  }
  if (slot === "error") {
    void playChimeForced([
      { freq: 196, offset: 0, dur: 0.12, peak: 0.1 },
      { freq: 147, offset: 0.1, dur: 0.16, peak: 0.09 },
    ]);
    return;
  }
  if (slot === "warning") {
    void playChimeForced([
      { freq: 440, offset: 0, dur: 0.1, peak: 0.09 },
      { freq: 349.23, offset: 0.09, dur: 0.14, peak: 0.08 },
    ]);
    return;
  }

  void (async () => {
    const ctx = await ensureAudioContext();
    if (!ctx) return;
    try {
      playBufferedClick(ctx, ensureClickBuffer(ctx, slot), 0.8);
    } catch {
      /* ignore */
    }
  })();
}
