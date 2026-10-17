/*
  Sign in / Create account, in the premium app language: a tinted hero card on top
  (full showcase column on desktop), a sliding segmented switch, and the form on a
  glass Surface. Phone layout reads like a native app's auth screen.
*/
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Gift, KeyRound, ShieldCheck, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { IconTile, Surface, type Tone } from "@/components/app-kit";
import { getSiteConfig } from "@/lib/site-config";
import { brandInitial } from "@/types/site-config";

const PERKS: { icon: LucideIcon; tone: Tone; title: string; text: string }[] = [
  { icon: Zap, tone: "amber", title: "Instant delivery", text: "Keys land in your vault right after payment." },
  { icon: ShieldCheck, tone: "emerald", title: "Secure wallet", text: "Top up once, check out in one tap." },
  { icon: BadgeCheck, tone: "sky", title: "Verified & cheap", text: "Trusted products at the lowest prices." },
];

const GOOGLE_ERRORS: Record<string, string> = {
  maintenance: "Sign-in is paused while we do maintenance.",
  denied: "Google sign-in was cancelled.",
  invalid_state: "That Google sign-in link expired. Try again.",
  token: "Google didn't confirm your account. Try again.",
  unverified: "Your Google email isn't verified.",
  email_taken: "This email already has an account. Sign in with your password.",
  banned: "This account has been suspended.",
  not_configured: "Google sign-in isn't available right now.",
  failed: "Google sign-in failed. Try again.",
};

function Brand({ name, logoUrl, light }: { name: string; logoUrl?: string; light?: boolean }) {
  return (
    <Link href="/" className="tap flex min-w-0 items-center gap-2.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-10 shrink-0 rounded-2xl object-cover ring-1 ring-white/15" />
      ) : (
        <span className="bg-brand-gradient grid size-10 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30">
          {brandInitial(name)}
        </span>
      )}
      <span className={`truncate font-display text-lg font-bold tracking-tight ${light ? "text-white" : ""}`}>{name}</span>
    </Link>
  );
}

/** A mini key ticket floating in the hero: what you get after signing in. */
function TicketPreview() {
  return (
    <div className="w-[19rem] rotate-[-4deg]">
    <div className="anim-float relative rounded-2xl bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-px shadow-2xl shadow-amber-500/25">
      <div className="relative overflow-hidden rounded-[calc(1rem-1px)] bg-[#120d04]/90 p-4 text-amber-100">
        <div aria-hidden className="anim-sheen-loop pointer-events-none absolute inset-0" />
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
            <KeyRound className="size-3.5" /> License key
          </span>
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-300/30">
            Delivered
          </span>
        </div>
        <p className="mt-3 font-mono text-[15px] font-semibold tracking-[0.18em] text-amber-200">
          XK7F-••••-••••-Q2LM
        </p>
        {/* perforation */}
        <div aria-hidden className="relative my-3 border-t border-dashed border-amber-300/25">
          <span className="absolute -left-6 -top-2 size-4 rounded-full bg-[#06070d]" />
          <span className="absolute -right-6 -top-2 size-4 rounded-full bg-[#06070d]" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-amber-200/60">
          <span>Ready in your vault</span>
          <span className="font-semibold text-amber-200/90">0.4s</span>
        </div>
      </div>
    </div>
    </div>
  );
}

export async function AuthShell({
  mode,
  next,
  googleError,
  referralCode,
  children,
}: {
  mode: "login" | "register";
  next?: string;
  googleError?: string;
  referralCode?: string;
  children: React.ReactNode;
}) {
  const config = await getSiteConfig();
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  const isLogin = mode === "login";
  const tabs = [
    { key: "login", label: "Sign in", href: `/login${q}` },
    { key: "register", label: "Create account", href: `/register${q}` },
  ] as const;
  const googleMessage = googleError ? (GOOGLE_ERRORS[googleError] ?? GOOGLE_ERRORS.failed) : null;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* ── Showcase (desktop) ───────────────────────────── */}
      <aside className="relative hidden p-4 lg:block">
        <div
          className="hero-card sticky top-4 flex h-[calc(100dvh-2rem)] flex-col justify-between p-10 xl:p-12"
          style={{ "--hero-b": "oklch(0.78 0.16 75)" } as React.CSSProperties}
        >
          <div aria-hidden className="anim-blob absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-white/10 blur-3xl" />
          <Brand name={config.siteName} logoUrl={config.logoUrl} light />

          <div className="grid items-center gap-10 xl:grid-cols-[1fr_auto]">
            <div className="anim-fade-up max-w-md">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 ring-1 ring-inset ring-white/15">
                <Sparkles className="size-3.5 text-amber-300" /> {config.siteTagline}
              </span>
              <h2 className="mt-5 font-display text-5xl font-bold leading-[1.04] tracking-tight">
                Level up for <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">less.</span>
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/65">{config.siteSeoDescription}</p>
            </div>
            <div className="hidden justify-center xl:flex">
              <TicketPreview />
            </div>
          </div>

          <ul className="grid gap-3 xl:grid-cols-3">
            {PERKS.map((p, i) => (
              <li
                key={p.title}
                style={{ "--d": `${150 + i * 90}ms` } as React.CSSProperties}
                className="anim-fade-up rounded-2xl bg-white/[0.05] p-4 ring-1 ring-inset ring-white/10 backdrop-blur-sm"
              >
                <IconTile icon={p.icon} tone={p.tone} className="size-10 rounded-xl" />
                <p className="mt-3 text-sm font-bold">{p.title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-white/55">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Form column ──────────────────────────────────── */}
      <section className="relative flex min-h-dvh flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-primary/15 blur-[110px]" />
          <div className="absolute -bottom-28 -left-20 size-72 rounded-full bg-highlight/10 blur-[110px]" />
        </div>

        <header className="relative flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Back to store"
            className="tap grid size-10 place-items-center rounded-full border border-white/[0.08] bg-card/70 text-muted-foreground backdrop-blur transition-colors hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="size-[18px]" />
          </Link>
          <Link
            href="/"
            className="tap ml-auto hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-card/70 px-3.5 py-2 text-sm font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground lg:inline-flex"
          >
            <ArrowLeft className="size-4" /> Back to store
          </Link>
          <span className="lg:hidden">
            <Brand name={config.siteName} logoUrl={config.logoUrl} />
          </span>
          <span className="size-10 lg:hidden" />
        </header>

        <div className="relative flex flex-1 flex-col justify-center py-6 lg:py-10">
          <div className="anim-page-in mx-auto w-full max-w-[26rem]">
            {/* phone hero */}
            <div
              className="hero-card mb-5 p-5 lg:hidden"
              style={{ "--hero-b": "oklch(0.78 0.16 75)" } as React.CSSProperties}
            >
              <div aria-hidden className="anim-blob absolute -right-14 -top-16 -z-10 size-48 rounded-full bg-white/10 blur-3xl" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
                {isLogin ? "Welcome back" : "Join in seconds"}
              </p>
              <h1 className="mt-1.5 font-display text-[1.7rem] font-bold leading-tight tracking-tight">
                {isLogin ? "Sign in to your vault" : "Create your account"}
              </h1>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {PERKS.map((p) => (
                  <span
                    key={p.title}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-inset ring-white/10"
                  >
                    <p.icon className="size-3 text-amber-300" /> {p.title}
                  </span>
                ))}
              </div>
            </div>

            {/* desktop heading */}
            <div className="mb-6 hidden lg:block">
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {isLogin ? "Sign in to your wallet, keys and spins." : "Join in seconds and start buying."}
              </p>
            </div>

            {/* sliding segmented switch */}
            <nav
              aria-label="Account"
              className="relative mb-4 grid grid-cols-2 rounded-2xl border border-white/[0.06] bg-card/80 p-1"
            >
              <span
                aria-hidden
                className={`bg-brand-gradient absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl shadow-lg shadow-primary/30 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isLogin ? "translate-x-0" : "translate-x-full"
                }`}
              />
              {tabs.map((t) => (
                <Link
                  key={t.key}
                  href={t.href}
                  replace
                  aria-current={t.key === mode ? "page" : undefined}
                  className={`relative z-10 rounded-xl py-2.5 text-center text-sm font-bold transition-colors ${
                    t.key === mode ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </nav>

            {!isLogin && referralCode ? (
              <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 p-px shadow-lg shadow-amber-500/15">
                <div className="flex items-center gap-3 rounded-[calc(1rem-1px)] bg-[#140f05]/90 px-3.5 py-3">
                  <IconTile icon={Gift} tone="amber" className="size-10 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-amber-100">You&apos;ve been invited</p>
                    <p className="truncate text-xs text-amber-200/65">
                      Code <span className="font-mono font-bold text-amber-200">{referralCode}</span> is applied
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {googleMessage ? (
              <p role="alert" className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {googleMessage}
              </p>
            ) : null}

            <Surface className="p-5 sm:p-6">{children}</Surface>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {isLogin ? "New here? " : "Already have an account? "}
              <Link href={isLogin ? `/register${q}` : `/login${q}`} replace className="font-bold text-primary hover:underline">
                {isLogin ? "Create an account" : "Sign in"}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
