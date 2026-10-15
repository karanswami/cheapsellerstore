"use client";

import { HubEmptyPanel } from "@/components/app/hub/hub-list-row";
import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { ExternalLink, Megaphone } from "lucide-react";
import Link from "next/link";

export type BroadcastBubble = {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  createdAt: string;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BroadcastView({
  broadcasts,
}: {
  broadcasts: BroadcastBubble[];
}) {
  return (
    <HubPageShell maxWidth="md">
      <HubHeaderBar
        icon={<Megaphone className="size-5" />}
        title="Broadcast"
        description="Active announcements from the team"
        stats={[
          {
            label: "Active",
            value: String(broadcasts.length),
            tone: broadcasts.length > 0 ? "accent" : "default",
          },
        ]}
      />

      {broadcasts.length === 0 ? (
        <HubEmptyPanel>
          <EmptyState
            title="No active announcements"
            description="When the team posts a broadcast, it will show up here as a message bubble."
          />
        </HubEmptyPanel>
      ) : (
        <div className="flex flex-col gap-3 pb-8" role="list" aria-label="Broadcasts">
          {broadcasts.map((b) => (
            <article
              key={b.id}
              role="listitem"
              className={cn(
                "max-w-[min(100%,28rem)] self-start rounded-2xl rounded-bl-md",
                "border border-primary/25 bg-card/80 px-3.5 py-3 shadow-[var(--glow-soft)]",
                "supports-backdrop-filter:backdrop-blur-sm",
              )}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Megaphone className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">
                    {b.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatWhen(b.createdAt)}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {b.message}
              </p>
              {b.actionUrl ? (
                <div className="mt-2.5">
                  {b.actionUrl.startsWith("/") ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={b.actionUrl}>
                        Open
                        <ExternalLink data-icon="inline-end" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="secondary">
                      <a
                        href={b.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                        <ExternalLink data-icon="inline-end" />
                      </a>
                    </Button>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </HubPageShell>
  );
}
