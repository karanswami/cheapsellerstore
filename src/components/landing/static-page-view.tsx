import { PageHeader } from "@/components/layout/page-header";
import type { PublicStaticPage } from "@/types/static-page";
import { ArrowLeft, CircleHelp, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";

type StaticPageViewProps = {
  page: PublicStaticPage;
};

export function StaticPageView({ page }: StaticPageViewProps) {
  const description =
    page.seoDescription?.trim() ||
    "Official store information — policies, terms, and support details.";

  return (
    <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)]"
      />

      <div className="relative flex flex-1 flex-col gap-8">
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to store
          </Link>

          <PageHeader
            icon={<FileText className="size-5" aria-hidden />}
            title={page.title}
            description={description}
          />
        </div>

        <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card/80 shadow-[var(--glow-soft)] ring-1 ring-foreground/5 backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3 sm:px-6">
            <ShieldCheck
              className="size-3.5 text-[var(--success)]"
              aria-hidden
            />
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Official document
            </p>
          </div>

          <div className="px-5 py-6 sm:px-7 sm:py-8">
            <div className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90 sm:text-base sm:leading-8">
              {page.content}
            </div>
          </div>
        </article>

        <nav
          aria-label="Related"
          className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-6 pb-2"
        >
          <Link
            href="/faq"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-foreground"
          >
            <CircleHelp className="size-3.5" aria-hidden />
            FAQ
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-foreground"
          >
            Store home
          </Link>
        </nav>
      </div>
    </main>
  );
}
