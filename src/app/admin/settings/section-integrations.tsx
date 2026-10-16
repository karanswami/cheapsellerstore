"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Field, ToggleRow, adminFetch, errMsg } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TELEGRAM_NOTIFY_EVENTS } from "@/types/telegram-notify";
import { FEEDBACK_SOUND_SLOTS } from "@/types/feedback-sounds";
import { SettingsCard, useSettingsSave, type AdminSettings } from "./settings-kit";

function Secret({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <Input type="password" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="font-mono text-xs" />
    </Field>
  );
}

export function IntegrationsSection({ s }: { s: AdminSettings }) {
  return (
    <>
      <GoogleAndEmail s={s} />
    </>
  );
}

function GoogleAndEmail({ s }: { s: AdminSettings }) {
  const { save, busy } = useSettingsSave();
  const [gId, setGId] = useState(s.googleClientId);
  const [gSecret, setGSecret] = useState(s.googleClientSecret);
  const [rKey, setRKey] = useState(s.resendApiKey);
  const [rFrom, setRFrom] = useState(s.resendFromEmail);
  return (
    <SettingsCard
      title="Sign-in & email"
      description="Google OAuth for login and Resend for transactional email."
      busy={busy}
      onSave={() => save({ googleClientId: gId.trim(), googleClientSecret: gSecret.trim(), resendApiKey: rKey.trim(), resendFromEmail: rFrom.trim() })}
    >
      <div className="flex gap-2">
        <Badge variant={s.googleAuthEnabled ? "success" : "muted"}>Google {s.googleAuthEnabled ? "on" : "off"}</Badge>
        <Badge variant={s.resendEnabled ? "success" : "muted"}>Email {s.resendEnabled ? "on" : "off"}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Google client ID">
          <Input value={gId} onChange={(e) => setGId(e.target.value)} className="font-mono text-xs" />
        </Field>
        <Secret label="Google client secret" value={gSecret} onChange={setGSecret} />
        <Secret label="Resend API key" value={rKey} onChange={setRKey} />
        <Field label="From address" hint='e.g. "Store <noreply@domain.com>"'>
          <Input value={rFrom} onChange={(e) => setRFrom(e.target.value)} />
        </Field>
      </div>
    </SettingsCard>
  );
}

export function NotificationsSection({ s }: { s: AdminSettings }) {
  return (
    <>
      <Telegram s={s} />
      <Feedback s={s} />
    </>
  );
}

function Telegram({ s }: { s: AdminSettings }) {
  const { save, busy } = useSettingsSave();
  const [cfg, setCfg] = useState(s.telegramNotifications);
  const [testing, setTesting] = useState<string | null>(null);

  async function test(ev: string) {
    const ch = cfg.channels[ev];
    setTesting(ev);
    try {
      await adminFetch("/api/admin/settings/telegram-test", { method: "POST", json: { botToken: cfg.botToken, chatId: ch.chatId, label: ch.label } });
      toast.success(`Test sent to ${ch.label || ev}.`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setTesting(null);
    }
  }

  return (
    <SettingsCard title="Telegram alerts" description="Push admin events to Telegram channels via a bot." busy={busy} onSave={() => save({ telegramNotifications: cfg })}>
      <ToggleRow label="Telegram notifications" hint="Master switch for all channels." checked={cfg.enabled} onChange={(v) => setCfg({ ...cfg, enabled: v })} />
      <Secret label="Bot token" value={cfg.botToken} onChange={(v) => setCfg({ ...cfg, botToken: v })} />
      <div className="grid gap-3">
        {TELEGRAM_NOTIFY_EVENTS.map((ev) => {
          const ch = cfg.channels[ev];
          if (!ch) return null;
          const set = (patch: Partial<typeof ch>) => setCfg({ ...cfg, channels: { ...cfg.channels, [ev]: { ...ch, ...patch } } });
          return (
            <div key={ev} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_12rem_auto_auto] sm:items-center">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={ch.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="size-4 accent-[var(--primary)]" aria-label={`Enable ${ev}`} />
                <Input value={ch.label} onChange={(e) => set({ label: e.target.value })} maxLength={80} />
              </div>
              <Input value={ch.chatId} onChange={(e) => set({ chatId: e.target.value })} placeholder="Chat ID" className="font-mono text-xs" />
              <Button variant="secondary" size="sm" disabled={testing === ev || !cfg.botToken || !ch.chatId} onClick={() => test(ev)}>
                <Send /> Test
              </Button>
              <span className="text-xs text-muted-foreground">{ev}</span>
            </div>
          );
        })}
      </div>
    </SettingsCard>
  );
}

function Feedback({ s }: { s: AdminSettings }) {
  const { save, busy } = useSettingsSave();
  const [cfg, setCfg] = useState(s.feedbackSounds);
  return (
    <SettingsCard title="Haptics & sounds" description="Interaction feedback across the store and app." busy={busy} onSave={() => save({ feedbackSounds: cfg })}>
      <ToggleRow label="Haptics" checked={cfg.hapticsEnabled} onChange={(v) => setCfg({ ...cfg, hapticsEnabled: v })} />
      <ToggleRow label="Sounds" checked={cfg.soundsEnabled} onChange={(v) => setCfg({ ...cfg, soundsEnabled: v })} />
      <div className="grid gap-3 sm:grid-cols-2">
        {FEEDBACK_SOUND_SLOTS.map((slot) => (
          <Field key={slot} label={`${slot} sound URL`} hint="Empty = built-in sound.">
            <Input value={cfg.sounds[slot] ?? ""} onChange={(e) => setCfg({ ...cfg, sounds: { ...cfg.sounds, [slot]: e.target.value } })} placeholder="/uploads/…" />
          </Field>
        ))}
      </div>
    </SettingsCard>
  );
}

