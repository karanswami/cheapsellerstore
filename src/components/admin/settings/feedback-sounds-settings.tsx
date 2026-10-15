"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  configureFeedbackPack,
  previewFeedbackSound,
} from "@/lib/feedback";
import { cn } from "@/lib/utils";
import {
  countCustomFeedbackSounds,
  defaultFeedbackSoundConfig,
  emptyFeedbackSoundsMap,
  FEEDBACK_SOUND_SLOTS,
  feedbackSoundSlotHint,
  feedbackSoundSlotLabel,
  type FeedbackSoundConfig,
  type FeedbackSoundSlot,
} from "@/types/feedback-sounds";
import { Play, RotateCcw, Upload, Vibrate, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const ACCEPT_AUDIO = "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4,audio/aac,.mp3,.wav,.ogg,.webm,.m4a,.aac";

export function FeedbackSoundsSettingsDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: FeedbackSoundConfig;
  onSave: (next: FeedbackSoundConfig) => Promise<boolean>;
  pending: boolean;
}) {
  const [draft, setDraft] = useState<FeedbackSoundConfig>(initial);
  const [uploading, setUploading] = useState<FeedbackSoundSlot | null>(null);
  const fileRefs = useRef<Partial<Record<FeedbackSoundSlot, HTMLInputElement | null>>>(
    {},
  );

  useEffect(() => {
    if (open) {
      const merged: FeedbackSoundConfig = {
        hapticsEnabled: initial?.hapticsEnabled !== false,
        soundsEnabled: initial?.soundsEnabled !== false,
        sounds: { ...emptyFeedbackSoundsMap(), ...(initial?.sounds ?? {}) },
      };
      setDraft(merged);
      configureFeedbackPack(merged);
    }
  }, [open, initial]);

  function updateDraft(next: FeedbackSoundConfig) {
    setDraft(next);
    configureFeedbackPack(next);
  }

  async function uploadSlot(slot: FeedbackSoundSlot, file: File) {
    setUploading(slot);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/settings/feedback-sound", {
        method: "POST",
        credentials: "include",
        body,
      });
      const json = (await res.json()) as {
        error?: { message?: string };
        data?: { upload?: { url?: string } };
      };
      if (!res.ok || !json.data?.upload?.url) {
        toast.error(json.error?.message ?? "Upload failed");
        return;
      }
      const url = json.data.upload.url;
      updateDraft({
        ...draft,
        sounds: { ...draft.sounds, [slot]: url },
      });
      toast.success("Sound uploaded");
      // brief delay so configure applies, then preview
      queueMicrotask(() => previewFeedbackSound(slot));
    } finally {
      setUploading(null);
    }
  }

  function clearSlot(slot: FeedbackSoundSlot) {
    updateDraft({
      ...draft,
      sounds: { ...draft.sounds, [slot]: "" },
    });
  }

  async function handleSave() {
    const ok = await onSave(draft);
    if (ok) onOpenChange(false);
  }

  const customCount = countCustomFeedbackSounds(draft.sounds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Vibrate className="size-5" />
            </div>
            <DialogTitle className="text-lg">Sound & haptics</DialogTitle>
            <DialogDescription>
              Site-wide vibration and custom UI / toast sounds. Empty slots use
              the built-in synth.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="site-haptics" className="text-sm font-medium">
                Haptic feedback
              </Label>
              <p className="text-xs text-muted-foreground">
                Vibration / Capacitor Haptics across the store and app
              </p>
            </div>
            <Switch
              id="site-haptics"
              checked={draft.hapticsEnabled}
              onCheckedChange={(hapticsEnabled) =>
                updateDraft({ ...draft, hapticsEnabled })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="site-sounds" className="text-sm font-medium">
                UI sounds
              </Label>
              <p className="text-xs text-muted-foreground">
                Clicks, toggles, and success / error / warning chimes
              </p>
            </div>
            <Switch
              id="site-sounds"
              checked={draft.soundsEnabled}
              onCheckedChange={(soundsEnabled) =>
                updateDraft({ ...draft, soundsEnabled })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Custom sounds
              </p>
              <p className="text-xs text-muted-foreground">
                {customCount} custom · MP3/WAV ≤ 1 MB
              </p>
            </div>

            <ul className="overflow-hidden rounded-xl border border-border">
              {FEEDBACK_SOUND_SLOTS.map((slot, index) => {
                const url = draft.sounds[slot];
                const hasCustom = Boolean(url.trim());
                return (
                  <li
                    key={slot}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5",
                      index > 0 && "border-t border-border/60",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Volume2 className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {feedbackSoundSlotLabel(slot)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {hasCustom
                          ? url.split("/").pop()
                          : feedbackSoundSlotHint(slot)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8"
                        aria-label={`Preview ${feedbackSoundSlotLabel(slot)}`}
                        onClick={() => previewFeedbackSound(slot)}
                      >
                        <Play className="size-3.5" />
                      </Button>
                      {hasCustom ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-8"
                          aria-label={`Reset ${feedbackSoundSlotLabel(slot)}`}
                          onClick={() => clearSlot(slot)}
                        >
                          <RotateCcw className="size-3.5" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 px-2.5"
                        disabled={uploading === slot}
                        onClick={() => fileRefs.current[slot]?.click()}
                      >
                        <Upload className="size-3.5" />
                        {uploading === slot ? "…" : hasCustom ? "Replace" : "Upload"}
                      </Button>
                      <input
                        ref={(el) => {
                          fileRefs.current[slot] = el;
                        }}
                        type="file"
                        accept={ACCEPT_AUDIO}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void uploadSlot(slot, file);
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-5 py-4 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              updateDraft(defaultFeedbackSoundConfig());
            }}
            disabled={pending}
          >
            Reset all
          </Button>
          <div className="flex flex-1 justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function feedbackSoundsRowSummary(config: FeedbackSoundConfig): {
  description: string;
  hapticsOn: boolean;
  soundsOn: boolean;
  customCount: number;
} {
  const customCount = countCustomFeedbackSounds(config.sounds);
  const parts: string[] = [];
  parts.push(config.hapticsEnabled ? "Haptics on" : "Haptics off");
  parts.push(config.soundsEnabled ? "Sounds on" : "Sounds off");
  if (customCount > 0) parts.push(`${customCount} custom`);
  return {
    description: parts.join(" · "),
    hapticsOn: config.hapticsEnabled,
    soundsOn: config.soundsEnabled,
    customCount,
  };
}
