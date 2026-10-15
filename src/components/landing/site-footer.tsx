"use client";

import { useSiteConfig } from "@/components/theme/site-config-provider";
import { resolveSocialBrandIcon } from "@/lib/social-brand-icon";
import type { PublicStaticPageNav } from "@/types/static-page";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#store", label: "Products" },
  { href: "/faq", label: "FAQ" },
  { href: "/app", label: "Orders" },
  { href: "/developers", label: "API" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  const site = useSiteConfig();
  const [pages, setPages] = useState<PublicStaticPageNav[]>([]);

  const socials = site.socialLinks.filter((s) => s.url.trim().length > 0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/pages");
        const json = (await res.json()) as {
          data?: { pages?: PublicStaticPageNav[] };
        };
        if (!cancelled && Array.isArray(json.data?.pages)) {
          setPages(json.data.pages);
        }
      } catch {
        // Footer stays with core links only
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tagline =
    site.siteTagline.trim() || "Instant keys · Secure checkout · 24/7 support";

  return (
    <footer className="mt-auto shrink-0 border-t border-white/[0.07] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_55%,transparent)_0%,color-mix(in_oklab,var(--background)_92%,transparent)_100%)] pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.25rem))] backdrop-blur-sm lg:pb-7">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:py-7">
        {/* Brand + socials */}
        <div className="flex items-start justify-between gap-4">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.logoUrl}
                alt=""
                className="size-8 shrink-0 rounded-lg object-contain ring-1 ring-white/10"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                {site.initial}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold tracking-wide text-foreground uppercase">
                {site.siteName}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {tagline}
              </span>
            </span>
          </Link>

          {socials.length > 0 ? (
            <div
              className="flex shrink-0 flex-wrap items-center justify-end gap-3"
              aria-label="Social links"
            >
              {socials.map((social) => {
                const customIcon = social.iconUrl.trim();
                const brandIcon = resolveSocialBrandIcon(
                  social.label,
                  social.url,
                );
                return (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    title={social.label}
                    className="inline-flex items-center justify-center text-[1.35rem] leading-none text-muted-foreground transition-colors hover:text-primary"
                  >
                    {brandIcon ? (
                      <FontAwesomeIcon icon={brandIcon} />
                    ) : customIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={customIcon}
                        alt=""
                        className="size-5 object-contain"
                      />
                    ) : (
                      <FontAwesomeIcon icon={faLink} />
                    )}
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Compact nav */}
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-0.5 gap-y-1"
        >
          {QUICK_LINKS.map((link, i) => (
            <span key={link.href} className="contents">
              {i > 0 ? (
                <span
                  className="mx-1 hidden text-white/15 sm:inline"
                  aria-hidden
                >
                  ·
                </span>
              ) : null}
              <Link
                href={link.href}
                className="rounded-md px-1.5 py-0.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </span>
          ))}
          {pages.map((page) => (
            <span key={page.id} className="contents">
              <span
                className="mx-1 hidden text-white/15 sm:inline"
                aria-hidden
              >
                ·
              </span>
              <Link
                href={`/pages/${page.slug}`}
                className="rounded-md px-1.5 py-0.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {page.title}
              </Link>
            </span>
          ))}
        </nav>

        {/* Copyright strip */}
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <p className="text-[11px] text-muted-foreground/80">
            © {year} {site.siteName}
          </p>
          <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
            <ShieldCheck
              className="size-3 text-[var(--success)]"
              aria-hidden
            />
            Secure checkout
          </p>
        </div>
      </div>
    </footer>
  );
}
