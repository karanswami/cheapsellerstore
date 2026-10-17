"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bot, LogIn, Mail, Send, Smartphone, Volume2, Vibrate } from "lucide-react";
import { Field, SubmitButton, adminFetch, errMsg } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TELEGRAM_NOTIFY_EVENTS } from "@/types/telegram-notify";
import { FEEDBACK_SOUND_SLOTS } from "@/types/feedback-sounds";
import { CopyValue, EditDialog, SettingRow, SetupGuide, appOrigin, SettingsGroup, useModalKey, useSettingsState, type AdminSettings } from "./settings-kit";

function Secret({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <Input type="password" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="font-mono text-xs" />
    </Field>
  );
}

function Status({ on }: { on: boolean }) {
  return <Badge variant={on ? "success" : "muted"}>{on ? "Connected" : "Not set up"}</Badge>;
}

export function IntegrationsSection({ s }: { s: AdminSettings }) {
  const { v, apply } = useSettingsState({
    googleClientId: s.googleClientId,
    googleClientSecret: s.googleClientSecret,
    resendApiKey: s.resendApiKey,
    resendFromEmail: s.resendFromEmail,
  });
  const m = useModalKey();
  const googleOn = Boolean(v.googleClientId.trim() && v.googleClientSecret.trim());
  const emailOn = Boolean(v.resendApiKey.trim());

  return (
    <>
      <SettingsGroup title="Sign-in & email" description="Google OAuth for login and Resend for transactional email.">
        <SettingRow icon={LogIn} title="Google sign-in" description="Let customers sign in with Google." value={<Status on={googleOn} />} onEdit={() => m.open("google")} />
        <SettingRow icon={Mail} title="Email (Resend)" description="Receipts, verification and password-reset emails." value={<Status on={emailOn} />} onEdit={() => m.open("email")} />
      </SettingsGroup>

      <EditDialog
        {...m.bind("google")}
        title="Google sign-in"
        description="OAuth credentials from Google Cloud Console."
        initial={{ id: v.googleClientId, secret: v.googleClientSecret }}
        onSave={(d) => apply({ googleClientId: d.id.trim(), googleClientSecret: d.secret.trim() })}
      >
        {(d, set) => (
          <>
            <SetupGuide
              steps={[
                <>Open <b>console.cloud.google.com</b> → APIs &amp; Services → <b>OAuth consent screen</b> and set it up (External; add your support email). Publish it to “In production” so everyone can sign in.</>,
                <>Go to <b>Credentials → Create credentials → OAuth client ID</b>, type <b>Web application</b>.</>,
                <>Paste the two values below into <b>Authorized JavaScript origins</b> and <b>Authorized redirect URIs</b>. They must match exactly (https, no trailing slash).</>,
                <>Create, then copy the Client ID and Client secret into the fields below.</>,
              ]}
            >
              <CopyValue label="Authorized JavaScript origin" value={appOrigin()} />
              <CopyValue label="Authorized redirect URI" value={`${appOrigin()}/api/auth/google/callback`} />
            </SetupGuide>
            <Field label="Client ID">
              <Input value={d.id} onChange={(e) => set("id", e.target.value)} className="font-mono text-xs" />
            </Field>
            <Secret label="Client secret" value={d.secret} onChange={(x) => set("secret", x)} />
          </>
        )}
      </EditDialog>

      <EditDialog
        {...m.bind("email")}
        title="Email (Resend)"
        initial={{ key: v.resendApiKey, from: v.resendFromEmail }}
        onSave={(d) => apply({ resendApiKey: d.key.trim(), resendFromEmail: d.from.trim() })}
      >
        {(d, set) => (
          <>
            <SetupGuide
              steps={[
                <>Sign up at <b>resend.com</b> and open <b>Domains → Add domain</b> for your store’s domain.</>,
                <>Add the DNS records Resend shows (SPF, DKIM, optional DMARC) at your DNS provider and wait until the domain shows <b>Verified</b>. Until then, mail only goes to your own Resend account email.</>,
                <>Go to <b>API Keys → Create API key</b> (Sending access) and paste it below.</>,
                <>The From address must use the verified domain, e.g. <code>Store &lt;noreply@yourdomain.com&gt;</code>.</>,
              ]}
            />
            <Secret label="API key" value={d.key} onChange={(x) => set("key", x)} />
            <Field label="From address" hint='e.g. "Store <noreply@domain.com>"'>
              <Input value={d.from} onChange={(e) => set("from", e.target.value)} />
            </Field>
          </>
        )}
      </EditDialog>
    </>
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
  const { v, apply, busy } = useSettingsState({ telegramNotifications: s.telegramNotifications });
  const cfg = v.telegramNotifications;
  const m = useModalKey();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const save = (next: typeof cfg, okMsg?: string) => apply({ telegramNotifications: next }, okMsg);
  async function toggleChannel(ev: string, on: boolean) {
    setTogglingKey(ev);
    try {
      await save({ ...cfg, channels: { ...cfg.channels, [ev]: { ...cfg.channels[ev], enabled: on } } }, on ? "Channel on." : "Channel off.");
    } finally {
      setTogglingKey(null);
    }
  }

  async function sendTest(chatId: string, label: string) {
    try {
      await adminFetch("/api/admin/settings/telegram-test", { method: "POST", json: { botToken: cfg.botToken, chatId, label } });
      toast.success(`Test sent to ${label || chatId}.`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <>
      <SettingsGroup title="Telegram alerts" description="Push admin events to Telegram channels via a bot.">
        <SettingRow
          icon={Bot}
          title="Telegram notifications"
          description="Master switch for all channels."
          checked={cfg.enabled}
          switchDisabled={busy}
          onCheckedChange={(on) => save({ ...cfg, enabled: on }, on ? "Telegram alerts on." : "Telegram alerts off.")}
        />
        <SettingRow icon={Send} title="Bot token" description="Create one with @BotFather." value={cfg.botToken ? "Set" : "Not set"} onEdit={() => m.open("token")} editLabel="Edit" />
      </SettingsGroup>

      <SettingsGroup title="Alert channels" description="Each event can post to its own chat.">
        {TELEGRAM_NOTIFY_EVENTS.map((ev) => {
          const ch = cfg.channels[ev];
          if (!ch) return null;
          return (
            <SettingRow
              key={ev}
              title={ch.label || ev}
              description={ch.chatId ? `Chat ${ch.chatId}` : "No chat ID yet"}
              checked={ch.enabled}
              switchDisabled={busy || togglingKey === ev || !cfg.enabled}
              onCheckedChange={(on) => toggleChannel(ev, on)}
              onEdit={() => m.open(`ch:${ev}`)}
              editLabel="Edit"
            />
          );
        })}
      </SettingsGroup>

      <EditDialog {...m.bind("token")} title="Bot token" initial={{ token: cfg.botToken }} onSave={(d) => save({ ...cfg, botToken: d.token.trim() })}>
        {(d, set) => (
          <>
            <SetupGuide
              steps={[
                <>In Telegram open <b>@BotFather</b> → send <code>/newbot</code>, pick a name and username.</>,
                <>Copy the token BotFather gives you and paste it below.</>,
                <>Add the bot to each channel/group you want alerts in (channels: make it an <b>admin</b> with permission to post).</>,
              ]}
            />
            <Secret label="Bot token" value={d.token} onChange={(x) => set("token", x)} />
          </>
        )}
      </EditDialog>

      {TELEGRAM_NOTIFY_EVENTS.map((ev) => {
        const ch = cfg.channels[ev];
        if (!ch) return null;
        return (
          <EditDialog
            key={ev}
            {...m.bind(`ch:${ev}`)}
            title={ch.label || ev}
            description={`Event: ${ev}`}
            initial={{ label: ch.label, chatId: ch.chatId }}
            onSave={(d) => save({ ...cfg, channels: { ...cfg.channels, [ev]: { ...ch, label: d.label, chatId: d.chatId.trim() } } })}
          >
            {(d, set) => (
              <>
                <SetupGuide
                  title="How to get the Chat ID"
                  steps={[
                    <>Add your bot to the channel/group first (admin for channels).</>,
                    <>Post any message there, then open <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> and look for <code>chat.id</code> (starts with <code>-100</code> for channels/supergroups).</>,
                    <>For a private chat, message the bot once, then use your numeric user id from the same page. Use Test below to confirm.</>,
                  ]}
                />
                <Field label="Label">
                  <Input value={d.label} onChange={(e) => set("label", e.target.value)} maxLength={80} />
                </Field>
                <Field label="Chat ID" hint={cfg.botToken ? "Save first if you changed the bot token." : "Add a bot token to send a test."}>
                  <div className="flex gap-2">
                    <Input value={d.chatId} onChange={(e) => set("chatId", e.target.value)} placeholder="-100123456789" className="font-mono text-xs" />
                    <TestButton disabled={!cfg.botToken || !d.chatId.trim()} onClick={() => sendTest(d.chatId.trim(), d.label)} />
                  </div>
                </Field>
              </>
            )}
          </EditDialog>
        );
      })}
    </>
  );
}

function TestButton({ disabled, onClick }: { disabled: boolean; onClick: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <SubmitButton
      type="button"
      variant="secondary"
      busy={busy}
      disabled={disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } finally {
          setBusy(false);
        }
      }}
    >
      <Send /> Test
    </SubmitButton>
  );
}

function Feedback({ s }: { s: AdminSettings }) {
  const { v, apply, busy } = useSettingsState({ feedbackSounds: s.feedbackSounds });
  const cfg = v.feedbackSounds;
  const m = useModalKey();
  const customCount = FEEDBACK_SOUND_SLOTS.filter((slot) => cfg.sounds[slot]).length;
  const save = (next: typeof cfg, okMsg?: string) => apply({ feedbackSounds: next }, okMsg);

  return (
    <>
      <SettingsGroup title="Haptics & sounds" description="Interaction feedback across the store and app.">
        <SettingRow
          icon={Smartphone}
          title="Haptics"
          description="Vibration feedback on supported devices."
          checked={cfg.hapticsEnabled}
          switchDisabled={busy}
          onCheckedChange={(on) => save({ ...cfg, hapticsEnabled: on }, on ? "Haptics on." : "Haptics off.")}
        />
        <SettingRow
          icon={Vibrate}
          title="Sounds"
          description="Play interaction sounds."
          checked={cfg.soundsEnabled}
          switchDisabled={busy}
          onCheckedChange={(on) => save({ ...cfg, soundsEnabled: on }, on ? "Sounds on." : "Sounds off.")}
        />
        <SettingRow
          icon={Volume2}
          title="Custom sounds"
          description="Replace the built-in sounds with your own files."
          value={customCount ? `${customCount} custom` : "Built-in"}
          onEdit={() => m.open("sounds")}
        />
      </SettingsGroup>

      <EditDialog
        {...m.bind("sounds")}
        size="lg"
        title="Custom sounds"
        description="Leave a slot empty to use the built-in sound."
        initial={{ sounds: cfg.sounds }}
        onSave={(d) => save({ ...cfg, sounds: d.sounds }, "Sounds saved.")}
      >
        {(d, set) => (
          <div className="grid gap-3 sm:grid-cols-2">
            {FEEDBACK_SOUND_SLOTS.map((slot) => (
              <Field key={slot} label={`${slot} sound URL`}>
                <Input value={d.sounds[slot] ?? ""} onChange={(e) => set("sounds", { ...d.sounds, [slot]: e.target.value })} placeholder="/uploads/…" />
              </Field>
            ))}
          </div>
        )}
      </EditDialog>
    </>
  );
}
