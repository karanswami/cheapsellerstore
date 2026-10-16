import Link from "next/link";
import { ArrowLeft, BadgeCheck, Check, Gamepad2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";

function Brand({ name, logoUrl }: { name: string; logoUrl?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-10 rounded-xl object-cover" />
      ) : (
        <span className="bg-brand-gradient glow-primary grid size-10 place-items-center rounded-xl text-primary-foreground">
          <Gamepad2 className="size-5" />
        </span>
      )}
      <span className="font-display text-xl font-semibold tracking-tight">{name}</span>
    </Link>
  );
}

const PERKS = [
  { icon: Zap, title: "Instant delivery", text: "Your order lands right after payment." },
  { icon: ShieldCheck, title: "Secure wallet", text: "Safe, simple checkout every time." },
  { icon: BadgeCheck, title: "Verified & cheap", text: "Trusted sellers, lowest prices." },
];

export async function AuthShell({
  mode,
  next,
  title,
  subtitle,
  children,
  footer,
}: {
  mode: "login" | "register";
  next?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const config = await getSiteConfig();
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  const tabs = [
    { key: "login", label: "Sign in", href: `/login${q}` },
    { key: "register", label: "Create account", href: `/register${q}` },
  ] as const;

  return (
    <main className="relative grid min-h-screen overflow-hidden lg:grid-cols-[1.05fr_1fr]">
      {/* Showcase panel */}
      <aside className="relative hidden overflow-hidden border-r bg-card lg:block">
        <div className="grid-bg absolute inset-0 opacity-25 [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_70%)]" />
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute -bottom-24 left-10 size-96 rounded-full bg-highlight/20 blur-[120px]" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Brand name={config.siteName} logoUrl={config.logoUrl} />

          <div className="anim-fade-up max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="size-3.5" /> {config.siteTagline}
            </span>
            <h2 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight">
              Level up for <span className="text-gradient">less.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{config.siteSeoDescription}</p>

            <ul className="mt-9 space-y-3">
              {PERKS.map(({ icon: Icon, title: t, text }, i) => (
                <li
                  key={t}
                  style={{ "--d": `${150 + i * 90}ms` } as React.CSSProperties}
                  className="anim-fade-up flex items-center gap-4 rounded-2xl border border-white/10 bg-background/40 p-3.5 backdrop-blur-sm"
                >
                  <span className="bg-brand-gradient grid size-11 shrink-0 place-items-center rounded-xl text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{t}</span>
                    <span className="block text-sm text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4 text-success" /> No hidden fees · Free to join
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <section className="relative flex flex-col px-4 py-6 sm:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-primary/15 blur-[110px]" />
          <div className="absolute -bottom-28 -left-20 size-72 rounded-full bg-highlight/10 blur-[110px]" />
        </div>

        <div className="relative flex items-center justify-between">
          <div className="lg:hidden"><Brand name={config.siteName} logoUrl={config.logoUrl} /></div>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3.5 py-1.5 text-sm text-muted-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to store
          </Link>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8">
          <div className="anim-fade-up w-full max-w-md">
            {/* gradient-edged card */}
            <div className="rounded-3xl bg-gradient-to-br from-primary/50 via-border to-highlight/40 p-px shadow-2xl shadow-black/40">
              <div className="rounded-[calc(1.5rem-1px)] bg-card/95 p-6 backdrop-blur-xl sm:p-8">
                <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl border bg-background/60 p-1">
                  {tabs.map((t) => (
                    <Link
                      key={t.key}
                      href={t.href}
                      role="tab"
                      aria-selected={t.key === mode}
                      replace
                      className={`rounded-xl py-2 text-center text-sm font-semibold transition-all ${
                        t.key === mode
                          ? "bg-brand-gradient text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>

                <h1 className="mt-7 font-display text-3xl font-bold tracking-tight">{title}</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
                <div className="mt-6">{children}</div>
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
