"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  CircleCheck,
  Code2,
  Copy,
  Download,
  FileJson,
  Gauge,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Terminal,
  Timer,
  Trash2,
  Wallet,
  Webhook,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { IconTile, Surface, type Tone } from "@/components/app-kit";
import { BottomSheet } from "@/components/app-kit-client";
import { formatDate } from "@/components/app-ui";
import { formatMoney } from "@/lib/currencies";
import { feedbackSuccess, feedbackTap } from "@/lib/feedback";
import { AI_PROMPT_PACKS, DOC_ENDPOINTS, DOC_ERRORS, SNIPPET_LANGS, buildSnippet, type DocEndpoint, type SnippetLang } from "@/lib/seller-api/docs-catalog";
import type { ApiKeyPublic } from "@/lib/seller-api/keys";
import { cn } from "@/lib/utils";

type Overview = {
  allowed: boolean;
  gateCode: string | null;
  gateMessage: string | null;
  platformEnabled: boolean;
  defaultRateLimitRpm: number;
  maxKeysPerUser: number;
  sandboxEnabled: boolean;
  walletBalanceMicrocents: number;
  activeKeys: number;
  stats: {
    requests24h: number;
    requests7d: number;
    errors24h: number;
    rateLimited24h: number;
    successRate24h: number;
    avgDurationMs24h: number;
    purchases24h: number;
    purchasesAll: number;
    spendAllMicrocents: number;
  } | null;
};

type Hook = { id: string; url: string; secretPrefix: string; events: string[]; status: string; failCount: number; lastDeliveryAt: string | null; createdAt: string };
type UsageRow = { id: string; method: string; path: string; statusCode: number; durationMs: number; keyName: string; createdAt: string };
type Sdk = { id: string; label: string; filename: string; description: string };

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "keys", label: "Keys" },
  { id: "webhooks", label: "Hooks" },
  { id: "usage", label: "Usage" },
  { id: "docs", label: "Docs" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const SCOPE_INFO: Record<string, string> = {
  "balance:read": "Read wallet balance",
  "catalog:read": "Products, pricing & stock",
  "orders:read": "List and fetch orders",
  "orders:write": "Buy keys with your wallet",
};

const tap = () => feedbackTap({ impact: "selection", silent: true });

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message ?? "Request failed.");
  return json.data as T;
}
const send = (url: string, method: string, body?: object) =>
  call<Record<string, unknown>>(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

async function copyText(text: string, what = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    feedbackTap({ impact: "success", silent: true });
    toast.success(what);
  } catch {
    toast.error("Copy failed");
  }
}

export function DevelopmentClient({
  overview,
  credentials,
  webhooks,
  scopes,
  origin,
  sdks,
  initialTab,
}: {
  overview: Overview;
  credentials: ApiKeyPublic[];
  webhooks: Hook[];
  scopes: string[];
  origin: string;
  sdks: Sdk[];
  initialTab?: string;
}) {
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initialTab) ? (initialTab as Tab) : "overview");

  if (!overview.allowed) return <Locked overview={overview} />;

  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const go = (t: Tab) => {
    tap();
    setTab(t);
  };

  return (
    <div className="space-y-5">
      <ConsoleHero overview={overview} origin={origin} />

      {/* Tabs: stick under the mobile app bar */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-background/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div role="tablist" aria-label="Platform API" className="relative grid grid-cols-5 rounded-2xl border border-white/[0.06] bg-card/80 p-1">
          <span
            aria-hidden
            className="bg-brand-gradient absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/5)] rounded-xl shadow-lg shadow-primary/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${tabIndex * 100}%)` }}
          />
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => tab !== t.id && go(t.id)}
              className={cn(
                "relative h-9 rounded-xl text-[12.5px] font-semibold transition-colors sm:text-[13px]",
                tab === t.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div key={tab} className="anim-fade-up min-w-0">
        {tab === "overview" ? <OverviewTab overview={overview} hooks={webhooks.length} origin={origin} go={go} /> : null}
        {tab === "keys" ? <KeysTab overview={overview} credentials={credentials} scopes={scopes} /> : null}
        {tab === "webhooks" ? <WebhooksTab webhooks={webhooks} /> : null}
        {tab === "usage" ? <UsageTab /> : null}
        {tab === "docs" ? <DocsTab origin={origin} sdks={sdks} /> : null}
      </div>
    </div>
  );
}

/* ───────────────────────── Shell pieces ───────────────────────── */

function Locked({ overview }: { overview: Overview }) {
  const role = overview.gateCode === "ROLE_NOT_ALLOWED";
  return (
    <section className="hero-card px-6 py-12 text-center [--hero-a:#38bdf8] [--hero-b:#8b5cf6]">
      <span className="anim-float mx-auto grid size-16 place-items-center rounded-3xl bg-white/10 ring-1 ring-inset ring-white/15">
        <Lock className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">Platform API is locked</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-white/65">{overview.gateMessage ?? "Platform API is not enabled for this account."}</p>
      {role ? (
        <Link href="/app/become-seller" className="tap mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0b1020] shadow-lg shadow-black/30">
          <Zap className="size-4" /> Become a seller
        </Link>
      ) : null}
    </section>
  );
}

function ConsoleHero({ overview, origin }: { overview: Overview; origin: string }) {
  const s = overview.stats;
  const base = `${origin}/api/v1`;
  const stats = [
    { label: "Requests 24h", value: String(s?.requests24h ?? 0) },
    { label: "Success", value: s?.requests24h ? `${s.successRate24h}%` : "—" },
    { label: "Latency", value: s?.requests24h ? `${s.avgDurationMs24h}ms` : "—" },
  ];
  return (
    <section className="hero-card p-5 [--hero-a:#38bdf8] [--hero-b:#8b5cf6] sm:p-6">
      <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" />
      <Code2 aria-hidden className="anim-float absolute -right-5 -top-5 -z-10 size-36 text-white/[0.06]" strokeWidth={1.25} />

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          <Terminal className="size-3.5" /> Platform API
        </p>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-300/25">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/70" />
            <span className="relative size-1.5 rounded-full bg-emerald-300" />
          </span>
          Operational
        </span>
      </div>
      <h1 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Build on Cheap Seller</h1>
      <p className="mt-1.5 max-w-md text-sm text-white/65">Sell our catalog from your own site or bot. Buy keys with your wallet, get them back as JSON.</p>

      <button
        type="button"
        onClick={() => copyText(base, "Base URL copied")}
        className="tap mt-4 flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-left backdrop-blur"
      >
        <span className="shrink-0 rounded-md bg-sky-400/20 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-sky-300">BASE</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-white/85">{base}</span>
        <Copy className="size-3.5 shrink-0 text-white/50" />
      </button>

      <div className="mt-5 flex gap-6">
        {stats.map((st) => (
          <div key={st.label}>
            <p className="font-display text-xl font-bold leading-none tabular-nums">{st.value}</p>
            <p className="mt-1 text-[10.5px] uppercase tracking-wider text-white/55">{st.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Terminal-style code window with optional language switcher. */
function CodeWindow({
  code,
  title,
  lang,
  onLang,
  className,
}: {
  code: string;
  title?: string;
  lang?: SnippetLang;
  onLang?: (l: SnippetLang) => void;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070a14]", className)}>
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-400/70" />
          <span className="size-2.5 rounded-full bg-amber-300/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
        </span>
        {onLang ? (
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
            {SNIPPET_LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  tap();
                  onLang(l.id);
                }}
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-semibold transition-colors",
                  lang === l.id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-white/45">{title}</span>
        )}
        <button
          type="button"
          aria-label="Copy code"
          onClick={async () => {
            await copyText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="tap grid size-7 shrink-0 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="anim-pop-in size-3.5 text-emerald-300" strokeWidth={3} /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto p-3.5 font-mono text-[12px] leading-relaxed text-sky-100/90">{code}</pre>
    </div>
  );
}

function Method({ m }: { m: string }) {
  return (
    <span
      className={cn(
        "inline-grid w-12 shrink-0 place-items-center rounded-md py-0.5 font-mono text-[10.5px] font-bold",
        m === "POST" ? "bg-emerald-400/15 text-emerald-300" : m === "DELETE" ? "bg-rose-400/15 text-rose-300" : "bg-sky-400/15 text-sky-300",
      )}
    >
      {m}
    </span>
  );
}

function Code({ status }: { status: number }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums",
        status < 300 ? "bg-success/15 text-success" : status === 429 ? "bg-amber-400/15 text-amber-300" : status < 500 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive",
      )}
    >
      {status}
    </span>
  );
}

function SheetButton({
  onClick,
  busy,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        "tap flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold shadow-lg disabled:opacity-50",
        danger ? "bg-destructive text-white shadow-destructive/25" : "bg-brand-gradient text-primary-foreground shadow-primary/25",
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

const inputCls =
  "h-12 w-full rounded-2xl border border-white/[0.06] bg-muted/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50";

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/** One-time secret reveal. */
function SecretSheet({ secret, kind, onClose }: { secret: string | null; kind: "key" | "webhook"; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const close = () => {
    setCopied(false);
    onClose();
  };
  return (
    <BottomSheet
      open={Boolean(secret)}
      onClose={close}
      title={kind === "key" ? "Your new API key" : "Webhook signing secret"}
      subtitle="Shown once. Store it somewhere safe."
      icon={<IconTile icon={kind === "key" ? KeyRound : ShieldCheck} tone="amber" className="size-10 rounded-xl" />}
    >
      {secret ? (
        <div className="space-y-4 pb-2">
          <div className="flex gap-2.5 rounded-2xl border border-warning/30 bg-warning/10 px-3.5 py-3 text-[13px] text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              {kind === "key"
                ? "Copy it now. We only keep a hash, so it can't be shown again. Lost it? Rotate the key."
                : "Copy it now. It won't be shown again. Use it to verify the X-Drip-Signature header."}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await copyText(secret, "Secret copied");
              setCopied(true);
            }}
            className="tap block w-full rounded-2xl border border-white/[0.08] bg-[#070a14] p-4 text-left"
          >
            <span className="block break-all font-mono text-[13px] leading-relaxed text-sky-100">{secret}</span>
            <span className={cn("mt-3 flex items-center gap-1.5 text-xs font-semibold", copied ? "text-success" : "text-primary")}>
              {copied ? <Check className="anim-pop-in size-3.5" strokeWidth={3} /> : <Copy className="size-3.5" />}
              {copied ? "Copied to clipboard" : "Tap to copy"}
            </span>
          </button>
          <SheetButton onClick={close} disabled={!copied}>
            <Check className="size-4" /> I&apos;ve saved it
          </SheetButton>
        </div>
      ) : null}
    </BottomSheet>
  );
}

type Confirm = { title: string; body: string; action: string; run: () => Promise<void> } | null;

function ConfirmSheet({ confirm, onClose }: { confirm: Confirm; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <BottomSheet
      open={Boolean(confirm)}
      onClose={onClose}
      title={confirm?.title}
      icon={<IconTile icon={AlertTriangle} tone="rose" className="size-10 rounded-xl" />}
    >
      {confirm ? (
        <div className="space-y-4 pb-2">
          <p className="px-1 text-sm text-muted-foreground">{confirm.body}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onClose} className="tap h-12 rounded-2xl bg-muted/70 text-sm font-semibold">
              Cancel
            </button>
            <SheetButton
              danger
              busy={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await confirm.run();
                  onClose();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Request failed.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirm.action}
            </SheetButton>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}

/* ───────────────────────── Overview ───────────────────────── */

function OverviewTab({ overview, hooks, origin, go }: { overview: Overview; hooks: number; origin: string; go: (t: Tab) => void }) {
  const s = overview.stats;
  const [lang, setLang] = useState<SnippetLang>("curl");
  const balanceEp = DOC_ENDPOINTS.find((e) => e.id === "balance")!;

  const steps = [
    { done: overview.activeKeys > 0, title: "Create an API key", hint: "Your Bearer token for every call", tab: "keys" as Tab, cta: "Create" },
    { done: Boolean(s && (s.requests7d > 0 || s.purchasesAll > 0)), title: "Make your first request", hint: "Try GET /balance from the snippet below", tab: "docs" as Tab, cta: "Docs" },
    { done: hooks > 0, title: "Add a webhook", hint: "Optional: get pinged when orders fulfil", tab: "webhooks" as Tab, cta: "Add" },
  ];
  const doneCount = steps.filter((x) => x.done).length;

  const tiles: { label: string; value: string; sub?: string; icon: LucideIcon; tone: Tone }[] = [
    { label: "Requests", value: String(s?.requests24h ?? 0), sub: `${s?.requests7d ?? 0} this week`, icon: Activity, tone: "sky" },
    { label: "Success rate", value: s?.requests24h ? `${s.successRate24h}%` : "—", sub: `${s?.errors24h ?? 0} errors · 24h`, icon: CircleCheck, tone: "emerald" },
    { label: "Avg latency", value: s?.requests24h ? `${s.avgDurationMs24h} ms` : "—", sub: `${s?.rateLimited24h ?? 0} rate-limited`, icon: Timer, tone: "violet" },
    { label: "API orders", value: String(s?.purchasesAll ?? 0), sub: `${s?.purchases24h ?? 0} in 24h`, icon: ShoppingCart, tone: "amber" },
    { label: "API spend", value: formatMoney(s?.spendAllMicrocents ?? 0), sub: "All time", icon: Wallet, tone: "rose" },
    { label: "Rate limit", value: `${overview.defaultRateLimitRpm}`, sub: "Requests / minute", icon: Gauge, tone: "primary" },
  ];

  return (
    <div className="space-y-5">
      {doneCount < steps.length ? (
        <Surface className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Ring value={doneCount / steps.length} label={`${doneCount}/${steps.length}`} />
            <div className="min-w-0">
              <p className="font-display text-base font-bold">Get started</p>
              <p className="text-xs text-muted-foreground">Three steps to your first API order.</p>
            </div>
          </div>
          <ol className="mt-4 space-y-1">
            {steps.map((st, i) => (
              <li key={st.title} className="flex items-center gap-3 rounded-2xl px-1 py-2">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                    st.done ? "bg-success text-white" : "bg-muted text-muted-foreground ring-1 ring-inset ring-white/10",
                  )}
                >
                  {st.done ? <Check className="size-3.5" strokeWidth={3.5} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold", st.done && "text-muted-foreground line-through decoration-1")}>{st.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{st.hint}</span>
                </span>
                {!st.done ? (
                  <button type="button" onClick={() => go(st.tab)} className="tap shrink-0 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary">
                    {st.cta}
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        </Surface>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        {tiles.map((t) => (
          <Surface key={t.label} className="p-4">
            <IconTile icon={t.icon} tone={t.tone} className="size-9 rounded-xl" />
            <p className="mt-3 truncate font-display text-xl font-bold leading-none tabular-nums">{t.value}</p>
            <p className="mt-1.5 text-xs font-medium">{t.label}</p>
            {t.sub ? <p className="truncate text-[11px] text-muted-foreground">{t.sub}</p> : null}
          </Surface>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section>
          <h2 className="mb-3 flex items-center gap-2 px-0.5 font-display text-lg font-bold tracking-tight">
            <Terminal className="size-4 text-primary" /> Quick start
          </h2>
          <CodeWindow code={buildSnippet(lang, balanceEp, origin)} lang={lang} onLang={setLang} />
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            Send your key as <code className="rounded bg-muted px-1 font-mono text-[11px]">Authorization: Bearer …</code> on every private call.
          </p>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 px-0.5 font-display text-lg font-bold tracking-tight">
            <Gauge className="size-4 text-primary" /> Your plan
          </h2>
          <Surface className="divide-y divide-white/[0.05] px-4 text-sm">
            <PlanRow k="API fees" v={<span className="font-semibold text-success">None</span>} />
            <PlanRow k="Rate limit" v={`${overview.defaultRateLimitRpm} req / min`} />
            <div className="py-3">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">API keys</span>
                <span className="font-medium tabular-nums">
                  {overview.activeKeys} / {overview.maxKeysPerUser}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${Math.min(100, (overview.activeKeys / Math.max(1, overview.maxKeysPerUser)) * 100)}%` }} />
              </div>
            </div>
            <PlanRow k="Sandbox keys" v={overview.sandboxEnabled ? "Available" : "Off"} />
            <PlanRow
              k="Wallet"
              v={
                <Link href="/app/deposit" className="tap font-semibold text-primary">
                  {formatMoney(overview.walletBalanceMicrocents)}
                </Link>
              }
            />
          </Surface>
        </section>
      </div>
    </div>
  );
}

function PlanRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Ring({ value, label }: { value: number; label: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-12 shrink-0 place-items-center">
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
        />
      </svg>
      <span className="text-[11px] font-bold tabular-nums">{label}</span>
    </span>
  );
}

/* ───────────────────────── Keys ───────────────────────── */

function KeysTab({ overview, credentials, scopes }: { overview: Overview; credentials: ApiKeyPublic[]; scopes: string[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"LIVE" | "SANDBOX">("LIVE");
  const [picked, setPicked] = useState<string[]>(scopes);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const full = credentials.length >= overview.maxKeysPerUser;

  async function create() {
    if (picked.length === 0) return toast.error("Pick at least one permission.");
    setBusy(true);
    try {
      const r = (await send("/api/platform-api/keys", "POST", { name: name.trim() || "API Key", mode, scopes: picked })) as { secret: string };
      feedbackSuccess();
      setCreating(false);
      setSecret(r.secret);
      setName("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">API keys</h2>
          <p className="text-xs text-muted-foreground">
            {credentials.length} of {overview.maxKeysPerUser} used
          </p>
        </div>
        <button
          type="button"
          disabled={full}
          onClick={() => {
            tap();
            setCreating(true);
          }}
          className="tap bg-brand-gradient flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50"
        >
          <Plus className="size-4" strokeWidth={2.75} /> New key
        </button>
      </div>
      {full ? <p className="px-1 text-xs text-muted-foreground">Key limit reached. Revoke one to create another.</p> : null}

      {credentials.length === 0 ? (
        <EmptyCard icon={KeyRound} tone="amber" title="No API keys yet" hint="Create a key to start calling the API from your site or bot.">
          <button type="button" onClick={() => setCreating(true)} className="tap bg-brand-gradient mt-5 rounded-2xl px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
            Create your first key
          </button>
        </EmptyCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {credentials.map((k) => (
            <KeyCard
              key={k.id}
              k={k}
              onRotate={() =>
                setConfirm({
                  title: `Rotate "${k.name}"?`,
                  body: "A new secret is issued and the old one stops working immediately. Update your integration right after.",
                  action: "Rotate",
                  run: async () => {
                    const r = (await send(`/api/platform-api/keys/${k.id}`, "POST", { action: "rotate" })) as { secret: string };
                    setSecret(r.secret);
                    router.refresh();
                  },
                })
              }
              onRevoke={() =>
                setConfirm({
                  title: `Revoke "${k.name}"?`,
                  body: "Every request using this key will be rejected from now on. This can't be undone.",
                  action: "Revoke",
                  run: async () => {
                    await send(`/api/platform-api/keys/${k.id}`, "POST", { action: "revoke" });
                    toast.success("Key revoked.");
                    router.refresh();
                  },
                })
              }
            />
          ))}
        </div>
      )}

      <BottomSheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New API key"
        subtitle="Name it after where it'll live"
        icon={<IconTile icon={KeyRound} tone="amber" className="size-10 rounded-xl" />}
      >
        <div className="space-y-5 pb-2">
          <div>
            <Label>Name</Label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Production bot" className={inputCls} />
          </div>

          <div>
            <Label hint={overview.sandboxEnabled ? undefined : "Sandbox is off"}>Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["LIVE", "SANDBOX"] as const).map((m) => {
                const on = mode === m;
                const off = m === "SANDBOX" && !overview.sandboxEnabled;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={off}
                    onClick={() => {
                      tap();
                      setMode(m);
                    }}
                    className={cn(
                      "tap rounded-2xl border px-3.5 py-3 text-left transition-colors disabled:opacity-40",
                      on ? (m === "LIVE" ? "border-emerald-400/60 bg-emerald-400/10" : "border-amber-300/60 bg-amber-400/10") : "border-white/[0.06] bg-muted/40",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <span className={cn("size-2 rounded-full", m === "LIVE" ? "bg-emerald-400" : "bg-amber-300")} />
                      {m === "LIVE" ? "Live" : "Sandbox"}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{m === "LIVE" ? "Real orders, real wallet" : "Test without spending"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label hint={`${picked.length}/${scopes.length}`}>Permissions</Label>
            <div className="space-y-1.5">
              {scopes.map((sc) => {
                const on = picked.includes(sc);
                return (
                  <button
                    key={sc}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => {
                      tap();
                      setPicked((p) => (on ? p.filter((x) => x !== sc) : [...p, sc]));
                    }}
                    className="tap flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-muted/40 px-3.5 py-2.5 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[12.5px] font-semibold">{sc}</span>
                      <span className="block text-[11.5px] text-muted-foreground">{SCOPE_INFO[sc] ?? sc}</span>
                    </span>
                    <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-white/15")}>
                      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-[1.125rem]" : "translate-x-0.5")} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <SheetButton onClick={create} busy={busy}>
            <KeyRound className="size-4" /> Create key
          </SheetButton>
        </div>
      </BottomSheet>

      <SecretSheet secret={secret} kind="key" onClose={() => setSecret(null)} />
      <ConfirmSheet confirm={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function KeyCard({ k, onRotate, onRevoke }: { k: ApiKeyPublic; onRotate: () => void; onRevoke: () => void }) {
  const live = k.mode === "LIVE";
  return (
    <Surface className="p-4">
      <div aria-hidden className={cn("absolute inset-x-0 top-0 h-px", live ? "bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" : "bg-gradient-to-r from-transparent via-amber-300/60 to-transparent")} />
      <div className="flex items-start gap-3">
        <IconTile icon={KeyRound} tone={live ? "emerald" : "amber"} className="size-10 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="truncate text-sm font-bold">{k.name}</span>
            <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider", live ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300")}>
              {k.mode}
            </span>
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{k.keyPrefix}••••••••••••</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {k.scopes.map((s) => (
          <span key={s} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
            {s}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
        <p className="min-w-0 truncate text-[11.5px] text-muted-foreground">
          {k.lastUsedAt ? `Used ${formatDate(k.lastUsedAt, true)}` : `Created ${formatDate(k.createdAt)} · never used`}
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={onRotate} aria-label="Rotate key" className="tap grid size-9 place-items-center rounded-xl bg-muted/70 text-muted-foreground hover:text-foreground">
            <RefreshCw className="size-4" />
          </button>
          <button type="button" onClick={onRevoke} aria-label="Revoke key" className="tap grid size-9 place-items-center rounded-xl bg-destructive/15 text-destructive">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </Surface>
  );
}

function EmptyCard({ icon: Icon, tone, title, hint, children }: { icon: LucideIcon; tone: Tone; title: string; hint: string; children?: React.ReactNode }) {
  return (
    <Surface className="flex flex-col items-center px-6 py-12 text-center">
      <IconTile icon={Icon} tone={tone} className="anim-float size-16 rounded-3xl [&_svg]:size-7" />
      <p className="mt-4 font-display text-lg font-bold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{hint}</p>
      {children}
    </Surface>
  );
}

/* ───────────────────────── Webhooks ───────────────────────── */

const VERIFY_SNIPPET = `import crypto from "node:crypto";

// rawBody = the exact request body string
const expected = crypto
  .createHmac("sha256", process.env.DRIP_WEBHOOK_SECRET)
  .update(rawBody, "utf8")
  .digest("hex");

const ok = crypto.timingSafeEqual(
  Buffer.from(expected),
  Buffer.from(req.headers["x-drip-signature"]),
);`;

function WebhooksTab({ webhooks }: { webhooks: Hook[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const active = webhooks.filter((w) => w.status === "ACTIVE").length;

  async function add() {
    if (!/^https?:\/\/.+/i.test(url.trim())) return toast.error("Enter a full http(s) URL.");
    setBusy(true);
    try {
      const r = (await send("/api/platform-api/webhooks", "POST", { url: url.trim() })) as { secret: string };
      feedbackSuccess();
      setAdding(false);
      setSecret(r.secret);
      setUrl("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add webhook.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Webhooks</h2>
          <p className="text-xs text-muted-foreground">{active} of 5 active</p>
        </div>
        <button
          type="button"
          disabled={active >= 5}
          onClick={() => {
            tap();
            setAdding(true);
          }}
          className="tap bg-brand-gradient flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-50"
        >
          <Plus className="size-4" strokeWidth={2.75} /> Add endpoint
        </button>
      </div>

      {webhooks.length === 0 ? (
        <EmptyCard icon={Webhook} tone="violet" title="No webhooks" hint="Add an endpoint and we'll POST signed JSON to it whenever an API order is fulfilled." />
      ) : (
        <Surface className="divide-y divide-white/[0.05] p-1.5">
          {webhooks.map((w) => {
            const ok = w.status === "ACTIVE";
            return (
              <div key={w.id} className="flex items-center gap-3 px-2.5 py-3">
                <span className="relative flex size-2.5 shrink-0">
                  {ok ? <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" /> : null}
                  <span className={cn("relative size-2.5 rounded-full", ok ? "bg-emerald-400" : "bg-muted-foreground")} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[13px] font-medium">{w.url}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {w.events.join(", ")} · {w.lastDeliveryAt ? `last ${formatDate(w.lastDeliveryAt, true)}` : "no deliveries yet"}
                    {w.failCount ? <span className="text-warning"> · {w.failCount} failed</span> : null}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Delete webhook"
                  onClick={() =>
                    setConfirm({
                      title: "Delete this webhook?",
                      body: `We'll stop sending events to ${w.url}.`,
                      action: "Delete",
                      run: async () => {
                        await call(`/api/platform-api/webhooks/${w.id}`, { method: "DELETE" });
                        router.refresh();
                      },
                    })
                  }
                  className="tap grid size-9 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            );
          })}
        </Surface>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 px-0.5 font-display text-lg font-bold tracking-tight">
          <ShieldCheck className="size-4 text-primary" /> Verify signatures
        </h2>
        <p className="mb-3 px-1 text-sm text-muted-foreground">
          Each delivery carries <code className="rounded bg-muted px-1 font-mono text-[11px]">X-Drip-Event</code> and an HMAC-SHA256 hex digest of the raw body in{" "}
          <code className="rounded bg-muted px-1 font-mono text-[11px]">X-Drip-Signature</code>, signed with your endpoint secret.
        </p>
        <CodeWindow code={VERIFY_SNIPPET} title="verify-webhook.mjs" />
      </section>

      <BottomSheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Add webhook"
        subtitle="We POST signed JSON to this URL"
        icon={<IconTile icon={Webhook} tone="violet" className="size-10 rounded-xl" />}
      >
        <div className="space-y-5 pb-2">
          <div>
            <Label>Endpoint URL</Label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://example.com/webhooks/drip" className={cn(inputCls, "font-mono text-[13px]")} />
          </div>
          <div>
            <Label>Events</Label>
            <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-3.5 py-3">
              <ShoppingCart className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[12.5px] font-semibold">order.fulfilled</span>
                <span className="block text-[11.5px] text-muted-foreground">An API order was paid and its keys are ready</span>
              </span>
              <Check className="size-4 text-primary" strokeWidth={3} />
            </div>
          </div>
          <SheetButton onClick={add} busy={busy} disabled={!url.trim()}>
            <Plus className="size-4" /> Add endpoint
          </SheetButton>
        </div>
      </BottomSheet>

      <SecretSheet secret={secret} kind="webhook" onClose={() => setSecret(null)} />
      <ConfirmSheet confirm={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/* ───────────────────────── Usage ───────────────────────── */

const USAGE_FILTERS = [
  { id: "all", label: "All" },
  { id: "ok", label: "Success" },
  { id: "error", label: "Errors" },
  { id: "purchases", label: "Orders" },
] as const;
type UsageFilter = (typeof USAGE_FILTERS)[number]["id"];

function UsageTab() {
  const [filter, setFilter] = useState<UsageFilter>("all");
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<UsageRow | null>(null);
  const req = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (p: number, f: UsageFilter) => {
    const id = ++req.current;
    setLoading(true);
    try {
      const d = await call<{ items: UsageRow[]; hasMore: boolean }>(`/api/platform-api/usage?page=${p}&limit=25&filter=${f}`);
      if (id !== req.current) return;
      setRows((prev) => (p === 1 ? d.items : [...prev, ...d.items]));
      setHasMore(d.hasMore);
      setPage(p);
    } catch (e) {
      if (id === req.current) toast.error(e instanceof Error ? e.message : "Could not load usage.");
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, []);

  // First page; later loads come from handlers / the scroll sentinel.
  useEffect(() => {
    const id = ++req.current;
    call<{ items: UsageRow[]; hasMore: boolean }>("/api/platform-api/usage?page=1&limit=25&filter=all")
      .then((d) => {
        if (id !== req.current) return;
        setRows(d.items);
        setHasMore(d.hasMore);
      })
      .catch(() => id === req.current && toast.error("Could not load usage."))
      .finally(() => id === req.current && setLoading(false));
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && !loading && load(page + 1, filter), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, page, filter, load, loading]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {USAGE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              if (f.id === filter) return;
              tap();
              setFilter(f.id);
              setRows([]);
              void load(1, f.id);
            }}
            className={cn(
              "tap h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-white/[0.06] bg-card/80 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        loading ? (
          <Surface className="space-y-1 p-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2.5 py-3">
                <span className="skeleton h-5 w-12 rounded-md" />
                <span className="skeleton h-3.5 flex-1 rounded" />
                <span className="skeleton h-5 w-9 rounded-md" />
              </div>
            ))}
          </Surface>
        ) : (
          <EmptyCard icon={Activity} tone="sky" title="No requests yet" hint="Every call made with your API keys is logged here, newest first." />
        )
      ) : (
        <Surface className="divide-y divide-white/[0.05] p-1.5">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                tap();
                setOpen(r);
              }}
              className="tap flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
            >
              <Method m={r.method} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[12.5px]">{r.path}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {r.keyName} · {formatDate(r.createdAt, true)}
                </span>
              </span>
              <span className="hidden shrink-0 text-[11.5px] tabular-nums text-muted-foreground sm:block">{r.durationMs} ms</span>
              <Code status={r.statusCode} />
            </button>
          ))}
        </Surface>
      )}

      {hasMore ? (
        <div ref={sentinel} className="text-center">
          <button
            type="button"
            onClick={() => load(page + 1, filter)}
            disabled={loading}
            className="tap inline-flex h-10 items-center gap-2 rounded-full bg-muted/70 px-5 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null} Load more
          </button>
        </div>
      ) : null}

      <BottomSheet
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? `${open.method} ${open.path}` : undefined}
        subtitle={open ? formatDate(open.createdAt, true) : undefined}
        icon={<IconTile icon={Activity} tone="sky" className="size-10 rounded-xl" />}
      >
        {open ? (
          <div className="pb-2">
            <div className="flex flex-col items-center rounded-3xl border border-white/[0.06] bg-muted/40 px-4 py-6">
              <span className={cn("font-display text-5xl font-bold tabular-nums", open.statusCode < 300 ? "text-success" : open.statusCode < 500 ? "text-warning" : "text-destructive")}>
                {open.statusCode}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">{open.statusCode < 300 ? "Success" : open.statusCode === 429 ? "Rate limited" : open.statusCode < 500 ? "Client error" : "Server error"}</span>
            </div>
            <dl className="mt-3 divide-y divide-white/[0.05] px-1 text-sm">
              <PlanRow k="Method" v={<Method m={open.method} />} />
              <PlanRow k="Path" v={<span className="break-all font-mono text-[12.5px]">{open.path}</span>} />
              <PlanRow k="Latency" v={`${open.durationMs} ms`} />
              <PlanRow k="API key" v={open.keyName} />
              <PlanRow k="Log ID" v={<span className="font-mono text-[12px]">{open.id.slice(-12)}</span>} />
            </dl>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}

/* ───────────────────────── Docs ───────────────────────── */

const GROUPS: { id: DocEndpoint["group"]; label: string; icon: LucideIcon; tone: Tone }[] = [
  { id: "products", label: "Catalog", icon: ShoppingCart, tone: "sky" },
  { id: "wallet", label: "Account", icon: Wallet, tone: "emerald" },
  { id: "orders", label: "Orders", icon: KeyRound, tone: "amber" },
];

function DocsTab({ origin, sdks }: { origin: string; sdks: Sdk[] }) {
  const [lang, setLang] = useState<SnippetLang>("curl");
  const [open, setOpen] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);

  async function copyPrompt(id: string) {
    setCopying(id);
    try {
      const res = await fetch(`/api/v1/ai-prompt?pack=${id}`);
      if (!res.ok) throw new Error();
      await copyText(await res.text(), "Prompt copied. Paste it into your AI assistant.");
    } catch {
      toast.error("Could not load prompt.");
    } finally {
      setCopying(null);
    }
  }

  return (
    <div className="space-y-6">
      {GROUPS.map((g) => {
        const eps = DOC_ENDPOINTS.filter((e) => e.group === g.id);
        if (!eps.length) return null;
        return (
          <section key={g.id}>
            <h2 className="mb-3 flex items-center gap-2 px-0.5 font-display text-lg font-bold tracking-tight">
              <g.icon className="size-4 text-primary" /> {g.label}
            </h2>
            <Surface className="divide-y divide-white/[0.05]">
              {eps.map((ep) => {
                const expanded = open === ep.id;
                return (
                  <div key={ep.id}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => {
                        tap();
                        setOpen(expanded ? null : ep.id);
                      }}
                      className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left"
                    >
                      <Method m={ep.method} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[13px] font-semibold">{ep.path.replace("/api/v1", "")}</span>
                        <span className="block truncate text-xs text-muted-foreground">{ep.summary}</span>
                      </span>
                      <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", expanded && "rotate-180")} />
                    </button>
                    {expanded ? <EndpointDetail ep={ep} origin={origin} lang={lang} onLang={setLang} /> : null}
                  </div>
                );
              })}
            </Surface>
          </section>
        );
      })}

      <section>
        <h2 className="mb-3 flex items-center gap-2 px-0.5 font-display text-lg font-bold tracking-tight">
          <Download className="size-4 text-primary" /> SDKs & spec
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {sdks.map((s) => (
            <a key={s.id} href={`/api/v1/sdk/${s.id}`} download={s.filename} className="tap group rounded-3xl border border-white/[0.06] bg-card/80 p-3.5 transition-colors hover:border-white/15">
              <span className="flex items-center justify-between">
                <IconTile icon={Code2} tone="violet" className="size-9 rounded-xl" />
                <Download className="size-4 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
              </span>
              <span className="mt-3 block text-sm font-bold">{s.label}</span>
              <span className="block truncate font-mono text-[11px] text-muted-foreground">{s.filename}</span>
            </a>
          ))}
          <a href={`${origin}/api/v1/openapi.json`} target="_blank" rel="noreferrer" className="tap group rounded-3xl border border-white/[0.06] bg-card/80 p-3.5 transition-colors hover:border-white/15">
            <span className="flex items-center justify-between">
              <IconTile icon={FileJson} tone="sky" className="size-9 rounded-xl" />
            </span>
            <span className="mt-3 block text-sm font-bold">OpenAPI</span>
            <span className="block truncate font-mono text-[11px] text-muted-foreground">openapi.json</span>
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 px-0.5 font-display text-lg font-bold tracking-tight">
          <Bot className="size-4 text-primary" /> Build it with AI
        </h2>
        <p className="mb-3 px-1 text-sm text-muted-foreground">Copy a ready-made prompt with the full API reference and paste it into any AI assistant.</p>
        <Surface className="divide-y divide-white/[0.05] p-1.5">
          {AI_PROMPT_PACKS.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-2.5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{p.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{p.description}</span>
              </span>
              <button
                type="button"
                onClick={() => copyPrompt(p.id)}
                disabled={copying === p.id}
                className="tap flex shrink-0 items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary"
              >
                {copying === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />} Copy
              </button>
            </div>
          ))}
        </Surface>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 px-0.5 font-display text-lg font-bold tracking-tight">
          <AlertTriangle className="size-4 text-primary" /> Error codes
        </h2>
        <Surface className="divide-y divide-white/[0.05] px-4">
          {DOC_ERRORS.map((e) => (
            <div key={`${e.http}-${e.code}`} className="flex items-start gap-3 py-3">
              <Code status={e.http} />
              <span className="min-w-0 flex-1">
                <span className="block break-all font-mono text-[12px] font-semibold">{e.code}</span>
                <span className="block text-xs text-muted-foreground">{e.when}</span>
              </span>
            </div>
          ))}
        </Surface>
      </section>
    </div>
  );
}

function EndpointDetail({ ep, origin, lang, onLang }: { ep: DocEndpoint; origin: string; lang: SnippetLang; onLang: (l: SnippetLang) => void }) {
  const params = [...(ep.params ?? []), ...(ep.bodyParams ?? [])];
  return (
    <div className="anim-fade-up space-y-3 px-4 pb-4">
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className={cn("rounded-md px-1.5 py-0.5 font-semibold", ep.auth === "public" ? "bg-success/15 text-success" : "bg-amber-400/15 text-amber-300")}>
          {ep.auth === "public" ? "Public" : "Bearer key"}
        </span>
        {ep.auth === "private" ? <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">{ep.scope}</span> : null}
      </div>

      {ep.warnings?.length ? (
        <ul className="space-y-1.5 rounded-2xl border border-warning/25 bg-warning/10 px-3.5 py-3 text-xs text-warning">
          {ep.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      ) : null}

      {params.length ? (
        <div className="divide-y divide-white/[0.05] rounded-2xl border border-white/[0.06] bg-muted/30">
          {params.map((p) => (
            <div key={p.name} className="px-3.5 py-2.5">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12.5px] font-semibold">{p.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{p.type}</span>
                {p.required ? <span className="text-[10.5px] font-semibold text-rose-300">required</span> : null}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
            </div>
          ))}
        </div>
      ) : null}

      <CodeWindow code={buildSnippet(lang, ep, origin)} lang={lang} onLang={onLang} />
      <CodeWindow code={JSON.stringify(ep.exampleResponse, null, 2)} title="200 · response.json" />
    </div>
  );
}
