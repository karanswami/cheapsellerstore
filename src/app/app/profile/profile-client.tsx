"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Gift,
  ImageUp,
  KeyRound,
  LifeBuoy,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
  Vibrate,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { IconTile, SectionHeader, Surface, type Tone } from "@/components/app-kit";
import { BottomSheet } from "@/components/app-kit-client";
import { TierBadge } from "@/components/rank-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { copyToClipboard } from "@/lib/clipboard";
import { formatMoney } from "@/lib/currencies";
import {
  feedbackTap,
  getFeedbackPack,
  isHapticsEnabled,
  isSoundEnabled,
  setHapticsMuted,
  setSoundMuted,
} from "@/lib/feedback";
import { nextTierProgress, tierForSpend } from "@/lib/leaderboard-tiers";
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/types/user";

async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message ?? "Something went wrong.");
  return json.data as T;
}

const send = <T = unknown,>(url: string, body: object, method = "POST") =>
  api<T>(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const tap = () => feedbackTap({ impact: "selection", silent: true });

type Sheet = "name" | "photo" | "password" | "email" | null;

export function ProfileClient({
  user,
  stats,
  googleEnabled,
  activity,
}: {
  user: SafeUser;
  stats: { orders: number; spent: number };
  googleEnabled: boolean;
  /** Server-rendered recent sign-ins list. */
  activity: React.ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [sheet, setSheet] = useState<Sheet>(null);
  const close = () => setSheet(null);
  const open = (s: Sheet) => {
    tap();
    setSheet(s);
  };

  useEffect(() => {
    const g = params.get("google");
    if (!g) return;
    if (g === "linked") toast.success("Google account connected.");
    else if (g === "taken") toast.error("That Google account is linked to another user.");
    else toast.error("Could not connect Google. Try again.");
    router.replace("/app/profile");
  }, [params, router]);

  async function signOut() {
    tap();
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="min-w-0 space-y-6 lg:sticky lg:top-6">
        <IdentityCard user={user} stats={stats} onEditName={() => open("name")} onVerifyEmail={() => open("email")} onEditPhoto={() => open("photo")} />
        <div className="hidden lg:block">{activity}</div>
      </div>

      <div className="min-w-0 space-y-6">
        <SecurityCard user={user} googleEnabled={googleEnabled} onOpen={open} />
        <div className="lg:hidden">{activity}</div>
        <PreferencesCard />
        <section aria-label="More">
          <SectionHeader title="More" />
          <Surface className="p-1.5">
            <SettingRow href="/app/notifications" icon={Bell} tone="sky" title="Notifications" subtitle="Inbox and push alerts" />
            <SettingRow href="/app/referral" icon={Gift} tone="amber" title="Invite friends" subtitle="Earn spins when they deposit" />
            <SettingRow href="/app/reports" icon={LifeBuoy} tone="violet" title="Help & reports" subtitle="Report a problem with an order" />
            <SettingRow onClick={signOut} icon={LogOut} tone="rose" title="Sign out" subtitle={`Signed in as @${user.username}`} danger />
          </Surface>
        </section>
      </div>

      <NameSheet open={sheet === "name"} onClose={close} current={user.name} />
      <PhotoSheet open={sheet === "photo"} onClose={close} user={user} />
      <EmailSheet open={sheet === "email"} onClose={close} email={user.email} />
      <PasswordSheet open={sheet === "password"} onClose={close} hasPassword={user.hasPassword} />
    </div>
  );
}

/* ───────────────────────── identity ───────────────────────── */

function IdentityCard({
  user,
  stats,
  onEditName,
  onVerifyEmail,
  onEditPhoto,
}: {
  user: SafeUser;
  stats: { orders: number; spent: number };
  onEditName: () => void;
  onVerifyEmail: () => void;
  onEditPhoto: () => void;
}) {
  const tier = tierForSpend(stats.spent);
  const progress = nextTierProgress(stats.spent);
  const since = new Date(user.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

  async function copyHandle() {
    if (await copyToClipboard(`@${user.username}`)) {
      feedbackTap({ impact: "success", silent: true });
      toast.success("Username copied.");
    }
  }

  return (
    <section
      aria-label="Your profile"
      className="hero-card p-5 sm:p-6"
      style={{ "--hero-a": tier.mid, "--hero-b": "var(--primary)" } as React.CSSProperties}
    >
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />

      <div className="flex flex-col items-center text-center">
        <button type="button" onClick={onEditPhoto} className="tap group relative" aria-label="Change photo">
          <span
            aria-hidden
            className="absolute -inset-1.5 rounded-full opacity-90"
            style={{ background: `conic-gradient(from 200deg, ${tier.from}, ${tier.mid}, ${tier.to}, ${tier.from})` }}
          />
          <span aria-hidden className="absolute -inset-1.5 rounded-full blur-xl" style={{ background: `${tier.mid}66` }} />
          <UserAvatar src={user.avatarUrl} seed={user.username} className="relative size-24 ring-4 ring-[#0b1020]" />
          <span className="absolute -bottom-0.5 -right-0.5 grid size-8 place-items-center rounded-full bg-white text-[#0b1020] shadow-lg ring-4 ring-[#0b1020] transition-transform group-hover:scale-110">
            <Camera className="size-4" />
          </span>
        </button>

        <button type="button" onClick={onEditName} className="tap group mt-4 flex max-w-full items-center gap-2">
          <span className="truncate font-display text-2xl font-bold tracking-tight">{user.name}</span>
          <Pencil className="size-3.5 shrink-0 text-white/50 transition-colors group-hover:text-white" />
        </button>
        <button type="button" onClick={copyHandle} className="tap mt-0.5 max-w-full truncate font-mono text-sm text-white/60 hover:text-white">
          @{user.username}
        </button>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[11px] font-semibold">
          <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-inset ring-white/10">{roleLabel(user.role)}</span>
          {user.emailVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-emerald-300 ring-1 ring-inset ring-emerald-300/20">
              <BadgeCheck className="size-3.5" /> Verified
            </span>
          ) : (
            <button
              type="button"
              onClick={onVerifyEmail}
              className="tap rounded-full bg-amber-400/15 px-2.5 py-1 text-amber-300 ring-1 ring-inset ring-amber-300/20"
            >
              Unverified · Verify
            </button>
          )}
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/70 ring-1 ring-inset ring-white/10">Since {since}</span>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-white/[0.05] py-3 ring-1 ring-inset ring-white/10">
        <div className="px-2 text-center">
          <dt className="text-[10.5px] uppercase tracking-wider text-white/55">Orders</dt>
          <dd className="mt-1 font-display text-lg font-bold tabular-nums">{stats.orders}</dd>
        </div>
        <div className="px-2 text-center">
          <dt className="text-[10.5px] uppercase tracking-wider text-white/55">Spent</dt>
          <dd className="mt-1 truncate font-display text-lg font-bold tabular-nums">{formatMoney(stats.spent)}</dd>
        </div>
        <div className="px-2 text-center">
          <dt className="text-[10.5px] uppercase tracking-wider text-white/55">Tier</dt>
          <dd className="mt-1 font-display text-lg font-bold" style={{ color: tier.from }}>
            {tier.name}
          </dd>
        </div>
      </dl>

      <Link href="/app/leaderboard" onClick={tap} className="tap mt-4 flex items-center gap-3 rounded-2xl p-1 hover:bg-white/[0.04]">
        <TierBadge tier={tier} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold text-white/85">{progress ? `Next: ${progress.next.name}` : "Top tier reached"}</span>
            <span className="text-white/55">{progress ? `$${progress.remainingUsd.toFixed(2)} to go` : "Legend"}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress ? Math.max(4, progress.pct) : 100}%`,
                background: `linear-gradient(90deg, ${tier.from}, ${tier.mid}, ${progress?.next.mid ?? tier.to})`,
              }}
            />
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-white/40" />
      </Link>
    </section>
  );
}

/* ───────────────────────── security ───────────────────────── */

function SecurityCard({
  user,
  googleEnabled,
  onOpen,
}: {
  user: SafeUser;
  googleEnabled: boolean;
  onOpen: (s: Sheet) => void;
}) {
  const checks = [user.emailVerified, user.hasPassword, user.hasGoogle];
  const score = checks.filter(Boolean).length;
  const level =
    score >= 3
      ? { label: "Excellent", color: "#34d399" }
      : score === 2
        ? { label: "Good", color: "#a3e635" }
        : { label: "Weak", color: "#fb7185" };
  const tip = !user.emailVerified
    ? "Verify your email so you can always reset your password."
    : !user.hasPassword
      ? "Add a password so you can still sign in without Google."
      : !user.hasGoogle && googleEnabled
        ? "Connect Google for one-tap sign-in."
        : "Your account is well protected.";
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <section aria-label="Security">
      <SectionHeader title="Security" icon={ShieldCheck} />
      <Surface>
        <div className="flex items-center gap-4 border-b border-white/[0.06] p-4">
          <span className="relative grid size-16 shrink-0 place-items-center">
            <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="32" cy="32" r={R} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/[0.07]" />
              <circle
                cx="32"
                cy="32"
                r={R}
                fill="none"
                stroke={level.color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - score / checks.length)}
                className="transition-[stroke-dashoffset] duration-700"
              />
            </svg>
            <span className="font-display text-lg font-bold tabular-nums">
              {score}
              <span className="text-xs text-muted-foreground">/{checks.length}</span>
            </span>
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-bold" style={{ color: level.color }}>
              {level.label} protection
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{tip}</p>
          </div>
        </div>

        <div className="p-1.5">
          <SettingRow
            onClick={user.emailVerified ? undefined : () => onOpen("email")}
            icon={Mail}
            tone={user.emailVerified ? "emerald" : "amber"}
            title="Email"
            subtitle={user.emailVerified ? user.email : `${user.email} · Tap to verify`}
            trailing={<StatusPill ok={user.emailVerified} on="Verified" off="Unverified" />}
          />
          <SettingRow
            onClick={() => onOpen("password")}
            icon={Lock}
            tone="primary"
            title="Password"
            subtitle={user.hasPassword ? "Change your password" : "Add one to sign in with email too"}
            trailing={<StatusPill ok={user.hasPassword} on="Set" off="Not set" />}
          />
          <SettingRow
            href={!user.hasGoogle && googleEnabled ? "/api/auth/google?link=1" : undefined}
            external
            icon={GoogleIcon}
            tone="sky"
            title="Google"
            subtitle={user.hasGoogle ? "Sign in with one tap" : googleEnabled ? "Connect for one-tap sign-in" : "Not available right now"}
            trailing={user.hasGoogle ? <StatusPill ok on="Connected" off="" /> : undefined}
          />
        </div>
      </Surface>
    </section>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.3a12 12 0 0 0 0 11l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function StatusPill({ ok, on, off }: { ok: boolean; on: string; off: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider",
        ok ? "bg-emerald-400/15 text-emerald-300" : "bg-muted text-muted-foreground",
      )}
    >
      {ok ? on : off}
    </span>
  );
}

/** iOS-style settings row: link, button, or static. */
function SettingRow({
  icon,
  tone,
  title,
  subtitle,
  trailing,
  href,
  external,
  onClick,
  danger,
}: {
  icon: LucideIcon | ((p: { className?: string }) => React.ReactNode);
  tone: Tone;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  href?: string;
  /** Plain <a> (API redirects), not client navigation. */
  external?: boolean;
  onClick?: () => void;
  danger?: boolean;
}) {
  const interactive = Boolean(href || onClick);
  const body = (
    <>
      <IconTile icon={icon as LucideIcon} tone={tone} className="size-10 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-semibold", danger && "text-rose-300")}>{title}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {trailing}
      {interactive ? <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" /> : null}
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left";
  const hover = "tap transition-colors hover:bg-white/[0.03]";
  if (href && external) {
    return (
      <a href={href} onClick={tap} className={cn(cls, hover)}>
        {body}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} onClick={tap} className={cn(cls, hover)}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, hover)}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

/* ───────────────────────── preferences ───────────────────────── */

// Feedback prefs live in localStorage; this tiny store lets toggles re-render on change.
const prefListeners = new Set<() => void>();
const subscribePrefs = (fn: () => void) => {
  prefListeners.add(fn);
  return () => prefListeners.delete(fn);
};
const notifyPrefs = () => prefListeners.forEach((fn) => fn());

function PreferencesCard() {
  const sound = useSyncExternalStore(subscribePrefs, isSoundEnabled, () => true);
  const haptics = useSyncExternalStore(subscribePrefs, isHapticsEnabled, () => true);
  // Hidden when the admin switched the channel off site-wide.
  const showSound = useSyncExternalStore(subscribePrefs, () => getFeedbackPack().soundsEnabled !== false, () => true);
  const showHaptics = useSyncExternalStore(subscribePrefs, () => getFeedbackPack().hapticsEnabled !== false, () => true);
  if (!showSound && !showHaptics) return null;

  return (
    <section aria-label="App preferences">
      <SectionHeader title="App" />
      <Surface className="p-1.5">
        {showSound ? (
          <ToggleRow
            icon={Volume2}
            tone="violet"
            title="Sounds"
            subtitle="Chimes on purchases, wins and taps"
            checked={sound}
            onChange={(v) => {
              setSoundMuted(!v);
              notifyPrefs();
              if (v) feedbackTap({ impact: "selection" });
            }}
          />
        ) : null}
        {showHaptics ? (
          <ToggleRow
            icon={Vibrate}
            tone="primary"
            title="Vibration"
            subtitle="Haptic feedback on supported phones"
            checked={haptics}
            onChange={(v) => {
              setHapticsMuted(!v);
              notifyPrefs();
              if (v) feedbackTap({ impact: "medium", silent: true });
            }}
          />
        ) : null}
      </Surface>
    </section>
  );
}

function ToggleRow({
  icon,
  tone,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="tap flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
    >
      <IconTile icon={icon} tone={tone} className="size-10 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-emerald-500" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}

/* ───────────────────────── sheets ───────────────────────── */

function NameSheet({ open, onClose, current }: { open: boolean; onClose: () => void; current: string }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Display name" subtitle="Shown on your profile and receipts" icon={<IconTile icon={Pencil} tone="primary" />}>
      {/* remount per open so the field starts from the saved name */}
      {open ? <NameForm current={current} onDone={onClose} /> : null}
    </BottomSheet>
  );
}

function EmailSheet({ open, onClose, email }: { open: boolean; onClose: () => void; email: string }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Verify email" subtitle={email} icon={<IconTile icon={Mail} tone="amber" />}>
      {open ? <EmailVerifyForm onDone={onClose} /> : null}
    </BottomSheet>
  );
}

function EmailVerifyForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    try {
      const r = await send<{ message: string }>("/api/auth/verify-email/send", {});
      toast.success(r.message);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await send("/api/auth/verify-email/confirm", { code });
      feedbackTap({ impact: "success", silent: true });
      toast.success("Email verified.");
      router.refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not verify.");
    } finally {
      setBusy(false);
    }
  }

  if (!sent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">We will email you a 6-digit code to confirm this address.</p>
        <Button size="lg" className="w-full rounded-xl" onClick={sendCode} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Mail />} Send code
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="space-y-4">
      <Input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="000000"
        className="h-12 rounded-xl text-center font-mono text-xl tracking-[0.4em]"
        aria-label="Verification code"
      />
      <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy || code.length !== 6}>
        {busy ? <Loader2 className="animate-spin" /> : <Check />} Verify
      </Button>
      <button type="button" onClick={sendCode} disabled={busy} className="tap w-full text-center text-xs text-muted-foreground hover:text-foreground">
        Resend code
      </button>
    </form>
  );
}

function NameForm({ current, onDone }: { current: string; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const trimmed = name.trim();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || trimmed === current) return onDone();
    setBusy(true);
    try {
      await send("/api/auth/profile", { name: trimmed }, "PATCH");
      feedbackTap({ impact: "success", silent: true });
      toast.success("Name updated.");
      router.refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update name.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-12 rounded-xl text-base" aria-label="Display name" />
        <p className="mt-1.5 text-right text-[11px] text-muted-foreground tabular-nums">{name.length}/80</p>
      </div>
      <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy || !trimmed}>
        {busy ? <Loader2 className="animate-spin" /> : <Check />} Save
      </Button>
    </form>
  );
}

function PhotoSheet({ open, onClose, user }: { open: boolean; onClose: () => void; user: SafeUser }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  async function run(kind: "upload" | "remove", fn: () => Promise<unknown>, done: string) {
    setBusy(kind);
    try {
      await fn();
      feedbackTap({ impact: "success", silent: true });
      toast.success(done);
      router.refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const upload = (file: File) => {
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be 2 MB or smaller.");
    const form = new FormData();
    form.append("file", file);
    run("upload", () => api("/api/auth/avatar", { method: "POST", body: form }), "Photo updated.");
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Profile photo" subtitle="JPG, PNG, WebP or GIF · up to 2 MB" icon={<IconTile icon={Camera} tone="sky" />}>
      <div className="flex justify-center py-3">
        <UserAvatar src={user.avatarUrl} seed={user.username} className="size-28 ring-4 ring-white/10" />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
      <div className="mt-3 space-y-2">
        <Button size="lg" className="w-full rounded-xl" disabled={busy != null} onClick={() => fileRef.current?.click()}>
          {busy === "upload" ? <Loader2 className="animate-spin" /> : <ImageUp />} {user.avatarUrl ? "Upload a new photo" : "Upload a photo"}
        </Button>
        {user.avatarUrl ? (
          <Button
            size="lg"
            variant="secondary"
            className="w-full rounded-xl"
            disabled={busy != null}
            onClick={() => run("remove", () => send("/api/auth/profile", { avatarUrl: "" }, "PATCH"), "Back to your robot.")}
          >
            {busy === "remove" ? <Loader2 className="animate-spin" /> : <Trash2 />} Use my robot avatar
          </Button>
        ) : (
          <p className="pt-1 text-center text-xs text-muted-foreground">Until you upload one, you get a robot made just for you.</p>
        )}
      </div>
    </BottomSheet>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="relative block">
        <Input
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 rounded-xl pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH = [
  { label: "Too weak", cls: "bg-rose-400" },
  { label: "Weak", cls: "bg-rose-400" },
  { label: "Okay", cls: "bg-amber-400" },
  { label: "Good", cls: "bg-lime-400" },
  { label: "Strong", cls: "bg-emerald-400" },
];

function PasswordSheet({ open, onClose, hasPassword }: { open: boolean; onClose: () => void; hasPassword: boolean }) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={hasPassword ? "Change password" : "Set a password"}
      subtitle="At least 6 characters"
      icon={<IconTile icon={Lock} tone="primary" />}
    >
      {open ? <PasswordForm hasPassword={hasPassword} onDone={onClose} /> : null}
    </BottomSheet>
  );
}

function PasswordForm({ hasPassword, onDone }: { hasPassword: boolean; onDone: () => void }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const s = strength(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const valid = next.length >= 6 && next === confirm && (!hasPassword || current.length > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const r = await send<{ message: string }>("/api/auth/change-password", { currentPassword: current || undefined, newPassword: next });
      feedbackTap({ impact: "success", silent: true });
      toast.success(r.message);
      router.refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {hasPassword ? <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" autoFocus /> : null}
      <div>
        <PasswordField label="New password" value={next} onChange={setNext} autoComplete="new-password" autoFocus={!hasPassword} />
        {next ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < s ? STRENGTH[s].cls : "bg-white/10")} />
              ))}
            </div>
            <span className="w-16 text-right text-[11px] font-semibold text-muted-foreground">{next.length < 6 ? "Too short" : STRENGTH[s].label}</span>
          </div>
        ) : null}
      </div>
      <div>
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {mismatch ? <p className="mt-1.5 text-xs text-destructive">Passwords don&apos;t match.</p> : null}
      </div>
      <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy || !valid}>
        {busy ? <Loader2 className="animate-spin" /> : <KeyRound />} {hasPassword ? "Update password" : "Set password"}
      </Button>
    </form>
  );
}
