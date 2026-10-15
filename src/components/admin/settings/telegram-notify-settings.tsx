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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  countEnabledTelegramChannels,
  defaultTelegramNotifyConfig,
  normalizeTelegramChatId,
  parseTelegramChatIdFromPostUrl,
  TELEGRAM_NOTIFY_DEFAULTS,
  TELEGRAM_NOTIFY_EVENTS,
  telegramNotifyEventLabel,
  type TelegramNotifyChannel,
  type TelegramNotifyConfig,
  type TelegramNotifyEvent,
} from "@/types/telegram-notify";
import { Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function TelegramNotifySettingsDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: TelegramNotifyConfig;
  onSave: (next: TelegramNotifyConfig) => Promise<boolean>;
  pending: boolean;
}) {
  const [draft, setDraft] = useState<TelegramNotifyConfig>(initial);
  const [testing, setTesting] = useState<TelegramNotifyEvent | null>(null);

  useEffect(() => {
    if (open) {
      const defaults = defaultTelegramNotifyConfig();
      const channels = { ...defaults.channels };
      if (initial?.channels) {
        for (const ev of TELEGRAM_NOTIFY_EVENTS) {
          if (initial.channels[ev]) {
            channels[ev] = { ...channels[ev], ...initial.channels[ev] };
          }
        }
      }
      setDraft({
        enabled: initial?.enabled ?? false,
        botToken: initial?.botToken ?? defaults.botToken,
        channels,
      });
    }
  }, [open, initial]);

  function patchChannel(
    event: TelegramNotifyEvent,
    patch: Partial<TelegramNotifyChannel>,
  ) {
    setDraft((prev) => {
      const defaults = defaultTelegramNotifyConfig();
      const current = prev.channels[event] ?? defaults.channels[event];
      return {
        ...prev,
        channels: {
          ...prev.channels,
          [event]: { ...current, ...patch },
        },
      };
    });
  }

  function onChatIdBlur(event: TelegramNotifyEvent, value: string) {
    const normalized = normalizeTelegramChatId(value);
    if (normalized !== value.trim()) {
      patchChannel(event, { chatId: normalized });
    }
  }

  function onPostOrInviteChange(event: TelegramNotifyEvent, value: string) {
    const chatFromPost = parseTelegramChatIdFromPostUrl(value);
    if (chatFromPost) {
      patchChannel(event, { chatId: chatFromPost, inviteLink: value.trim() });
      return;
    }
    // Invite link or free text — keep as inviteLink only
    if (value.includes("t.me/+") || value.includes("telegram.me/+")) {
      patchChannel(event, { inviteLink: value.trim() });
      return;
    }
    patchChannel(event, { inviteLink: value.trim() });
  }

  async function testChannel(event: TelegramNotifyEvent) {
    const defaults = defaultTelegramNotifyConfig();
    const channel = draft.channels[event] ?? defaults.channels[event];
    const chatId = normalizeTelegramChatId(channel.chatId ?? "");
    if (!draft.botToken.trim()) {
      toast.error("Bot token is required");
      return;
    }
    if (!chatId) {
      toast.error("Chat ID is required");
      return;
    }
    setTesting(event);
    try {
      const res = await fetch("/api/admin/settings/telegram-test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: draft.botToken.trim(),
          chatId,
          label: channel.label || telegramNotifyEventLabel(event),
        }),
      });
      const json = (await res.json()) as {
        error?: { message?: string };
        data?: { ok?: boolean };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Verify failed");
        return;
      }
      toast.success("Bot is admin — test message sent");
      if (chatId !== channel.chatId) {
        patchChannel(event, { chatId });
      }
    } finally {
      setTesting(null);
    }
  }

  async function handleSave() {
    const defaults = defaultTelegramNotifyConfig();
    const next: TelegramNotifyConfig = {
      enabled: draft.enabled,
      botToken: draft.botToken.trim(),
      channels: { ...defaults.channels, ...draft.channels },
    };
    for (const event of TELEGRAM_NOTIFY_EVENTS) {
      const ch = draft.channels[event] ?? defaults.channels[event];
      next.channels[event] = {
        enabled: Boolean(ch?.enabled),
        chatId: normalizeTelegramChatId(ch?.chatId ?? ""),
        inviteLink: (ch?.inviteLink ?? "").trim(),
        label:
          (ch?.label ?? "").trim() ||
          telegramNotifyEventLabel(event),
      };
    }
    const ok = await onSave(next);
    if (ok) onOpenChange(false);
  }

  const enabledCount = countEnabledTelegramChannels(draft);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Send className="size-5" />
            </div>
            <DialogTitle>Telegram notifications</DialogTitle>
            <DialogDescription>
              Push event alerts to Telegram channels via Bot API. Bot must be a
              channel admin. Use Test to verify.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="tg-master" className="text-sm font-medium">
                Enable notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Master kill-switch for all channel pushes
              </p>
            </div>
            <Switch
              id="tg-master"
              checked={draft.enabled}
              onCheckedChange={(enabled) => setDraft({ ...draft, enabled })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tg-token">Bot API token</Label>
            <Input
              id="tg-token"
              type="password"
              autoComplete="off"
              value={draft.botToken}
              onChange={(e) =>
                setDraft({ ...draft, botToken: e.target.value })
              }
              placeholder="123456:ABC..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Channels
              </p>
              <p className="text-xs text-muted-foreground">
                {enabledCount} active · paste post link to fill chat ID
              </p>
            </div>

            <ul className="overflow-hidden rounded-xl border border-border">
              {TELEGRAM_NOTIFY_EVENTS.map((event, index) => {
                const d = TELEGRAM_NOTIFY_DEFAULTS[event];
                const ch = draft.channels[event] ?? {
                  enabled: true,
                  chatId: d.chatId,
                  inviteLink: d.inviteLink,
                  label: d.label,
                };
                const isTesting = testing === event;
                return (
                  <li
                    key={event}
                    className={cn(
                      "space-y-2.5 px-3 py-3",
                      index > 0 && "border-t border-border/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {ch.label || telegramNotifyEventLabel(event)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {event}
                        </p>
                      </div>
                      <Switch
                        checked={ch.enabled}
                        onCheckedChange={(enabled) =>
                          patchChannel(event, { enabled })
                        }
                        aria-label={`Enable ${ch.label}`}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Input
                        value={ch.chatId}
                        onChange={(e) =>
                          patchChannel(event, { chatId: e.target.value })
                        }
                        onBlur={(e) => onChatIdBlur(event, e.target.value)}
                        placeholder="-100…"
                        className="font-mono text-xs"
                        aria-label={`${ch.label} chat ID`}
                      />
                      <Input
                        value={ch.inviteLink}
                        onChange={(e) =>
                          onPostOrInviteChange(event, e.target.value)
                        }
                        placeholder="Invite or post link (t.me/c/…)"
                        className="text-xs"
                        aria-label={`${ch.label} invite or post link`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={isTesting || pending}
                        onClick={() => void testChannel(event)}
                      >
                        {isTesting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        Test / verify admin
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/40 bg-muted/20 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function telegramNotifyRowSummary(config: TelegramNotifyConfig): {
  enabled: boolean;
  activeCount: number;
  description: string;
} {
  const activeCount = countEnabledTelegramChannels(config);
  return {
    enabled: config.enabled,
    activeCount,
    description: config.enabled
      ? `${activeCount} channel${activeCount === 1 ? "" : "s"} active`
      : "Master off — no channel pushes",
  };
}

export { defaultTelegramNotifyConfig };
