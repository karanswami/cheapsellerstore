"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import type { PublicFaq } from "@/types/faq";
import { ChevronDown, CircleHelp } from "lucide-react";
import { useMemo, useState } from "react";

type FaqViewProps = {
  faqs: PublicFaq[];
};

export function FaqView({ faqs }: FaqViewProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  const groups = useMemo(() => {
    const map = new Map<string, PublicFaq[]>();
    for (const faq of faqs) {
      const key = faq.category?.trim() || "General";
      const list = map.get(key) ?? [];
      list.push(faq);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [faqs]);

  if (!faqs.length) {
    return (
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)]"
        />
        <div className="relative space-y-8">
          <PageHeader
            icon={<CircleHelp className="size-5" aria-hidden />}
            title="FAQ"
            description="Answers will appear here once published."
          />
          <EmptyState
            icon={<CircleHelp className="size-6" />}
            title="No FAQs yet"
            description="Help articles will show up here when published."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_80%_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)]"
      />

      <div className="relative flex flex-1 flex-col gap-8">
        <PageHeader
          icon={<CircleHelp className="size-5" aria-hidden />}
          title="Frequently asked questions"
          description="Quick answers about deposits, keys, and your account."
        />

        <div className="space-y-8">
          {groups.map(([category, items]) => (
            <section key={category} className="space-y-3">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {category}
              </h2>
              <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-card/80 shadow-[var(--glow-soft)] ring-1 ring-foreground/5 backdrop-blur-sm">
                {items.map((faq) => {
                  const open = openId === faq.id;
                  return (
                    <li key={faq.id}>
                      <Collapsible
                        open={open}
                        onOpenChange={(next) =>
                          setOpenId(next ? faq.id : null)
                        }
                      >
                        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium transition-colors hover:bg-white/[0.03] sm:px-5">
                          <span>{faq.question}</span>
                          <ChevronDown
                            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-5">
                          {faq.answer}
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
