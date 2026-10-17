"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  Clock,
  Code2,
  Crown,
  Gem,
  Headphones,
  Loader2,
  Lock,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Tags,
  Trophy,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { IconTile, SectionHeader, Surface, type Tone } from "@/components/app-kit";
import { SuccessScreen } from "@/components/app-kit-client";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import type { SELLER_FIELDS } from "@/types/seller-program";

export type BecomeSellerState = "seller" | "pending" | "closed" | "cooldown" | "locked" | "apply";

type FieldDef = (typeof SELLER_FIELDS)[number] & { required: boolean };

type Props = {
  state: BecomeSellerState;
  headline: string;
  closedMessage: string;
  perks: string[];
  fields: FieldDef[];
  autoApprove: boolean;
  minBalance: number;
  walletBalance: number;
  sellerCount: number;
  supportHref: string | null;
  pendingSince: string | null;
  lastRejection: { note: string | null; retryAt: string | null } | null;
  hasSellerPanel: boolean;
};

const PERK_ICONS: { icon: LucideIcon; tone: Tone }[] = [
  { icon: Tags, tone: "emerald" },
  { icon: Code2, tone: "violet" },
  { icon: UsersRound, tone: "sky" },
  { icon: Trophy, tone: "amber" },
  { icon: Gem, tone: "rose" },
  { icon: Rocket, tone: "primary" },
  { icon: Headphones, tone: "highlight" },
  { icon: Sparkles, tone: "emerald" },
];

const STATUS: Record<BecomeSellerState, { label: string; dot: string }> = {
  seller: { label: "Seller account", dot: "bg-amber-300" },
  pending: { label: "Under review", dot: "bg-sky-300 animate-pulse" },
  closed: { label: "Applications closed", dot: "bg-white/40" },
  cooldown: { label: "Re-apply soon", dot: "bg-amber-300" },
  locked: { label: "Applications open", dot: "bg-emerald-300" },
  apply: { label: "Applications open", dot: "bg-emerald-300" },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function BecomeSellerClient(p: Props) {
  const [done, setDone] = useState<"auto" | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Hero {...p} onApply={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div ref={formRef} className="scroll-mt-24 space-y-6">
          {p.state === "seller" ? <SellerShortcuts hasSellerPanel={p.hasSellerPanel} /> : null}
          {p.state === "pending" && p.pendingSince ? <PendingCard since={p.pendingSince} /> : null}
          {p.state === "closed" ? <ClosedCard message={p.closedMessage} supportHref={p.supportHref} /> : null}
          {p.lastRejection && (p.state === "cooldown" || p.state === "apply" || p.state === "locked") ? <RejectedCard {...p.lastRejection} /> : null}
          {p.state === "locked" ? <LockedCard min={p.minBalance} balance={p.walletBalance} /> : null}
          {p.state === "apply" ? <ApplyWizard fields={p.fields} autoApprove={p.autoApprove} onAutoApproved={() => setDone("auto")} /> : null}
        </div>

        <aside className="space-y-6">
          <Perks perks={p.perks} />
          {p.state !== "seller" ? <Eligibility {...p} /> : null}
        </aside>
      </div>

      <SuccessScreen open={done === "auto"} title="You're a Seller!" subtitle="Wholesale prices, the Platform API and the seller board are unlocked.">
        <Button asChild size="lg" className="w-full">
          <Link href="/app">Start selling</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href="/app/development">Open Platform API</Link>
        </Button>
      </SuccessScreen>
    </div>
  );
}

function Hero({ state, headline, sellerCount, minBalance, onApply }: Props & { onApply: () => void }) {
  const s = STATUS[state];
  const isSeller = state === "seller";
  return (
    <section className="hero-card p-5 [--hero-a:#10b981] [--hero-b:#f59e0b] sm:p-7">
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />
      <Store aria-hidden className="anim-float absolute -right-6 -top-6 -z-10 size-40 text-white/[0.07]" strokeWidth={1.25} />

      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          <Store className="size-3.5" /> Seller program
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-inset ring-white/10">
          <span className={cn("size-1.5 rounded-full", s.dot)} /> {s.label}
        </span>
      </div>

      <h1 className="mt-4 max-w-md font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
        {isSeller ? "You're already a seller" : headline}
      </h1>
      <p className="mt-2 max-w-md text-sm text-white/65">
        {isSeller
          ? "Your account has wholesale access. Jump into your tools below."
          : "Unlock wholesale prices, the Platform API and your own seller tools."}
      </p>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex gap-6">
          {sellerCount >= 10 ? (
            <div>
              <p className="font-display text-xl font-bold leading-none tabular-nums">{sellerCount.toLocaleString()}+</p>
              <p className="mt-1 text-[10.5px] uppercase tracking-wider text-white/55">Active sellers</p>
            </div>
          ) : null}
          {!isSeller ? (
            <div>
              <p className="font-display text-xl font-bold leading-none tabular-nums">{minBalance > 0 ? formatMoney(minBalance) : "Free"}</p>
              <p className="mt-1 text-[10.5px] uppercase tracking-wider text-white/55">Wallet to apply</p>
            </div>
          ) : null}
        </div>
        {state === "apply" ? (
          <button
            type="button"
            onClick={onApply}
            className="tap flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#0b1020] shadow-lg shadow-black/30"
          >
            Apply now <ArrowRight className="size-4" strokeWidth={2.75} />
          </button>
        ) : isSeller ? (
          <Crown className="size-9 text-amber-300 drop-shadow-[0_4px_12px_rgb(251_191_36/0.45)]" />
        ) : null}
      </div>
    </section>
  );
}

function Perks({ perks }: { perks: string[] }) {
  if (!perks.length) return null;
  return (
    <div>
      <SectionHeader title="What you get" icon={Sparkles} />
      <Surface className="divide-y divide-white/[0.05] p-1.5">
        {perks.map((perk, i) => {
          const m = PERK_ICONS[i % PERK_ICONS.length];
          return (
            <div key={i} className="flex items-center gap-3 px-2.5 py-2.5">
              <IconTile icon={m.icon} tone={m.tone} className="size-9 rounded-xl [&_svg]:size-4" />
              <p className="text-sm font-medium leading-snug">{perk}</p>
            </div>
          );
        })}
      </Surface>
    </div>
  );
}

function Eligibility({ state, minBalance, walletBalance, lastRejection }: Props) {
  const enough = walletBalance >= minBalance;
  const pct = minBalance > 0 ? Math.min(100, Math.round((walletBalance / minBalance) * 100)) : 100;
  const rows = [
    {
      ok: enough,
      title: minBalance > 0 ? `Wallet balance ${formatMoney(minBalance)}+` : "No minimum balance",
      hint: minBalance > 0 ? `You have ${formatMoney(walletBalance)}` : "Anyone can apply",
      bar: minBalance > 0 && !enough ? pct : null,
    },
    { ok: state !== "pending", title: "No open application", hint: state === "pending" ? "One request is being reviewed" : "You're clear to apply" },
    ...(lastRejection?.retryAt
      ? [{ ok: state !== "cooldown", title: "Re-apply wait", hint: `Available ${fmtDate(lastRejection.retryAt)}` }]
      : []),
  ];
  return (
    <div>
      <SectionHeader title="Eligibility" icon={ShieldCheck} />
      <Surface className="space-y-1 p-3">
        {rows.map((r) => (
          <div key={r.title} className="flex items-start gap-3 rounded-2xl px-1.5 py-2">
            <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", r.ok ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-muted-foreground")}>
              {r.ok ? <Check className="size-3.5" strokeWidth={3} /> : <Lock className="size-3" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.hint}</p>
              {"bar" in r && r.bar != null ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300" style={{ width: `${r.bar}%` }} />
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </Surface>
    </div>
  );
}

function StateCard({ icon, tone, title, children }: { icon: LucideIcon; tone: Tone; title: string; children: React.ReactNode }) {
  return (
    <Surface className="p-5">
      <div className="flex items-start gap-3.5">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
          <div className="mt-1 text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </Surface>
  );
}

function ClosedCard({ message, supportHref }: { message: string; supportHref: string | null }) {
  return (
    <StateCard icon={Lock} tone="rose" title="Applications are closed">
      <p>{message}</p>
      {supportHref ? (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <a href={supportHref} target="_blank" rel="noreferrer">
            <Headphones /> Contact support
          </a>
        </Button>
      ) : null}
    </StateCard>
  );
}

function LockedCard({ min, balance }: { min: number; balance: number }) {
  return (
    <StateCard icon={Wallet} tone="amber" title={`Top up ${formatMoney(Math.max(0, min - balance))} to unlock`}>
      <p>The application form opens once your wallet holds at least {formatMoney(min)}. The balance stays yours to spend.</p>
      <Button asChild size="sm" className="mt-4">
        <Link href="/app/deposit">
          <Wallet /> Deposit now
        </Link>
      </Button>
    </StateCard>
  );
}

function RejectedCard({ note, retryAt }: { note: string | null; retryAt: string | null }) {
  return (
    <Surface className="border-rose-400/20 bg-rose-500/[0.06] p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-400/15 text-rose-300">
          <X className="size-4" strokeWidth={2.75} />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-semibold">Your last application wasn&apos;t approved</p>
          {note ? <p className="mt-1 text-muted-foreground">“{note}”</p> : null}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {retryAt ? `You can apply again on ${fmtDate(retryAt)}.` : "You can update your details and apply again."}
          </p>
        </div>
      </div>
    </Surface>
  );
}

function PendingCard({ since }: { since: string }) {
  const steps = [
    { label: "Submitted", hint: fmtDate(since), state: "done" as const },
    { label: "In review", hint: "An admin is checking your details", state: "active" as const },
    { label: "Decision", hint: "You'll get a notification", state: "todo" as const },
  ];
  return (
    <Surface className="p-5">
      <div className="flex items-center gap-3.5">
        <IconTile icon={Clock} tone="sky" />
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Application under review</h2>
          <p className="text-sm text-muted-foreground">Sit tight, nothing else is needed from you.</p>
        </div>
      </div>
      <ol className="mt-5 space-y-0">
        {steps.map((s, i) => (
          <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 ? (
              <span aria-hidden className={cn("absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 rounded-full", s.state === "done" ? "bg-emerald-400/50" : "bg-white/[0.08]")} />
            ) : null}
            <span
              className={cn(
                "relative grid size-6 shrink-0 place-items-center rounded-full ring-1 ring-inset",
                s.state === "done" && "bg-emerald-400/15 text-emerald-300 ring-emerald-300/30",
                s.state === "active" && "bg-sky-400/15 text-sky-300 ring-sky-300/40",
                s.state === "todo" && "bg-white/[0.04] text-muted-foreground ring-white/10",
              )}
            >
              {s.state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : s.state === "active" ? <span className="size-2 animate-pulse rounded-full bg-sky-300" /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <div>
              <p className={cn("text-sm font-semibold", s.state === "todo" && "text-muted-foreground")}>{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button asChild variant="outline" size="sm" className="mt-5">
        <Link href="/app/notifications">
          <Bell /> Notifications
        </Link>
      </Button>
    </Surface>
  );
}

function SellerShortcuts({ hasSellerPanel }: { hasSellerPanel: boolean }) {
  const items = [
    ...(hasSellerPanel ? [{ href: "/app/seller", label: "Seller panel", hint: "Manage your resellers", icon: UsersRound, tone: "primary" as Tone }] : []),
    { href: "/app/development", label: "Platform API", hint: "Keys, webhooks and docs", icon: Code2, tone: "violet" as Tone },
    { href: "/app/seller/leaderboard", label: "Seller board", hint: "See where you rank", icon: Trophy, tone: "amber" as Tone },
    { href: "/app", label: "Shop wholesale", hint: "Your prices are already applied", icon: Tags, tone: "emerald" as Tone },
  ];
  return (
    <div>
      <SectionHeader title="Your seller tools" icon={BadgeCheck} />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="tap">
            <Surface className="flex items-center gap-3 p-4 transition-colors hover:bg-card">
              <IconTile icon={it.icon} tone={it.tone} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{it.label}</p>
                <p className="truncate text-xs text-muted-foreground">{it.hint}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Surface>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Application wizard ───────────────────────── */

type Step = { id: string; title: string; hint: string; keys: string[] };
type Def = { key: string; label: string; placeholder?: string; required: boolean; multiline?: boolean; prefix?: string; url?: boolean };

const CORE: Record<string, Def> = {
  fullName: { key: "fullName", label: "Full name", required: true, placeholder: "As on your ID" },
  phone: { key: "phone", label: "Phone / WhatsApp", required: true, placeholder: "+91 98765 43210" },
  country: { key: "country", label: "Country", required: true, placeholder: "e.g. India" },
  telegram: { key: "telegram", label: "Telegram username", required: true, placeholder: "username", prefix: "@" },
  reason: { key: "reason", label: "Why do you want to join?", required: true, multiline: true, placeholder: "Tell us about your audience and how you plan to sell." },
};

const DRAFT_KEY = "cs:seller-application";
const isUrl = (v: string) => /^https?:\/\/\S+\.\S+/i.test(v);

function ApplyWizard({ fields, autoApprove, onAutoApproved }: { fields: FieldDef[]; autoApprove: boolean; onAutoApproved: () => void }) {
  const router = useRouter();
  const defs: Record<string, Def> = { ...CORE };
  for (const f of fields) defs[f.key] = { key: f.key, label: f.label, placeholder: f.placeholder, required: f.required, url: f.url };

  const steps: Step[] = [
    { id: "you", title: "About you", hint: "So we know who we're working with.", keys: ["fullName", "phone", "country"] },
    { id: "channels", title: "Your channels", hint: "Where can we find you online?", keys: ["telegram", ...fields.filter((f) => f.step === "channels").map((f) => f.key)] },
    { id: "business", title: "Your business", hint: "A little about how you sell.", keys: [...fields.filter((f) => f.step === "business").map((f) => f.key), "reason"] },
    { id: "review", title: "Review", hint: "Check everything before sending.", keys: [] },
  ];

  const [step, setStep] = useState(0);
  const [v, setV] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Restore / persist a local draft so a refresh or a trip to the deposit page doesn't lose it.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setV(JSON.parse(raw) as Record<string, string>);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (Object.keys(v).length) localStorage.setItem(DRAFT_KEY, JSON.stringify(v));
    } catch {}
  }, [v]);

  function validate(keys: string[]) {
    const next: Record<string, string> = {};
    for (const k of keys) {
      const d = defs[k];
      const val = (v[k] ?? "").trim();
      if (d.required && !val) next[k] = `${d.label} is required.`;
      else if (k === "reason" && val.length < 10) next[k] = "Write at least 10 characters.";
      else if (k === "phone" && val.replace(/\D/g, "").length < 6) next[k] = "Enter a valid phone number.";
      else if (d.url && val && !isUrl(val)) next[k] = "Use a full link starting with https://";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function go(to: number) {
    if (to > step && !validate(steps[step].keys)) return;
    setStep(to);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit() {
    const all = steps.flatMap((s) => s.keys);
    if (!validate(all)) {
      const bad = steps.findIndex((s) => s.keys.some((k) => !validateOne(k)));
      if (bad >= 0) setStep(bad);
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, string> = {};
      for (const k of all) body[k] = (v[k] ?? "").trim();
      body.telegram = body.telegram.replace(/^@+/, "");
      const res = await fetch("/api/reseller-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not submit.");
      localStorage.removeItem(DRAFT_KEY);
      if (json.request?.autoApproved) onAutoApproved();
      else toast.success("Application sent! We'll notify you after review.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  function validateOne(k: string) {
    const d = defs[k];
    const val = (v[k] ?? "").trim();
    if (d.required && !val) return false;
    if (k === "reason" && val.length < 10) return false;
    if (d.url && val && !isUrl(val)) return false;
    return true;
  }

  const cur = steps[step];
  const isReview = cur.id === "review";

  return (
    <div ref={topRef} className="scroll-mt-24">
      <SectionHeader title="Seller application" icon={Send} />
      <Surface className="p-4 sm:p-6">
        {/* progress */}
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              disabled={i > step}
              onClick={() => go(i)}
              aria-label={s.title}
              className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-gradient-to-r from-emerald-400 to-emerald-300" : "bg-white/[0.08]")}
            />
          ))}
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Step {step + 1} of {steps.length}
        </p>
        <h3 className="mt-1 font-display text-xl font-bold tracking-tight">{cur.title}</h3>
        <p className="text-sm text-muted-foreground">{cur.hint}</p>

        <div key={cur.id} className="anim-fade-up mt-5">
          {isReview ? (
            <Review steps={steps.slice(0, -1)} defs={defs} values={v} onEdit={(i) => setStep(i)} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {cur.keys.map((k) => (
                <WizardField
                  key={k}
                  def={defs[k]}
                  value={v[k] ?? ""}
                  error={errors[k]}
                  onChange={(val) => {
                    setV((p) => ({ ...p, [k]: val }));
                    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2">
          {step > 0 ? (
            <Button variant="outline" size="lg" onClick={() => go(step - 1)} disabled={busy}>
              <ArrowLeft /> Back
            </Button>
          ) : null}
          {isReview ? (
            <Button size="lg" className="flex-1" onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Send />} {autoApprove ? "Submit & activate" : "Submit application"}
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={() => go(step + 1)}>
              Continue <ArrowRight />
            </Button>
          )}
        </div>
        {isReview ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {autoApprove ? "Approval is instant: your account upgrades as soon as you submit." : "An admin reviews every application. You'll get a notification with the result."}
          </p>
        ) : null}
      </Surface>
    </div>
  );
}

function WizardField({ def, value, error, onChange }: { def: Def; value: string; error?: string; onChange: (v: string) => void }) {
  const base =
    "w-full rounded-2xl border bg-white/[0.03] px-3.5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:bg-white/[0.05]";
  return (
    <label className={cn("block space-y-1.5", def.multiline && "sm:col-span-2")}>
      <span className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{def.label}</span>
        {def.required ? null : <span className="font-normal text-muted-foreground/70">Optional</span>}
      </span>
      {def.multiline ? (
        <>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder={def.placeholder}
            className={cn(base, "resize-none py-3", error ? "border-destructive" : "border-white/[0.08]")}
          />
          <span className="block text-right text-[11px] tabular-nums text-muted-foreground">{value.length}/2000</span>
        </>
      ) : (
        <span className={cn("flex items-center rounded-2xl", def.prefix && "relative")}>
          {def.prefix ? <span className="pointer-events-none absolute left-3.5 text-[15px] text-muted-foreground">{def.prefix}</span> : null}
          <input
            value={value}
            onChange={(e) => onChange(def.prefix ? e.target.value.replace(/^@+/, "") : e.target.value)}
            placeholder={def.placeholder}
            inputMode={def.key === "phone" ? "tel" : def.url ? "url" : undefined}
            autoComplete={def.key === "fullName" ? "name" : def.key === "phone" ? "tel" : def.key === "country" ? "country-name" : "off"}
            className={cn(base, "h-12", def.prefix && "pl-8", error ? "border-destructive" : "border-white/[0.08]")}
          />
        </span>
      )}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function Review({ steps, defs, values, onEdit }: { steps: Step[]; defs: Record<string, Def>; values: Record<string, string>; onEdit: (i: number) => void }) {
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={s.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{s.title}</p>
            <button type="button" onClick={() => onEdit(i)} className="tap text-xs font-semibold text-primary">
              Edit
            </button>
          </div>
          <dl className="space-y-1.5">
            {s.keys.map((k) => {
              const val = (values[k] ?? "").trim();
              if (!val && !defs[k].required) return null;
              return (
                <div key={k} className={cn("gap-3 text-sm", k === "reason" ? "block" : "flex justify-between")}>
                  <dt className="shrink-0 text-muted-foreground">{defs[k].label}</dt>
                  <dd className={cn("min-w-0 font-medium", k === "reason" ? "mt-1 whitespace-pre-wrap text-foreground/90" : "truncate text-right")}>
                    {k === "telegram" ? `@${val}` : val || "—"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}
