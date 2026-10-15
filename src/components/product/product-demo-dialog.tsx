"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
import { ExternalLink, SquarePlay } from "lucide-react";

type ProductDemoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  demoUrl: string;
};

export function ProductDemoDialog({
  open,
  onOpenChange,
  title,
  demoUrl,
}: ProductDemoDialogProps) {
  const embedUrl = open ? getYoutubeEmbedUrl(demoUrl) : null;
  const href = demoUrl.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
              <SquarePlay className="size-5" aria-hidden />
            </div>
            <DialogTitle className="text-lg leading-snug">
              {title} — Demo
            </DialogTitle>
            <DialogDescription>
              Watch the trailer without leaving the store.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-3 px-4 py-4 sm:px-5">
          {embedUrl ? (
            <div className="aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-border/50">
              <iframe
                key={embedUrl}
                src={embedUrl}
                title={`${title} demo`}
                className="size-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg bg-muted/40 px-4 text-center ring-1 ring-border/50">
              <p className="max-w-sm text-sm text-muted-foreground">
                This demo link can’t be played here. Open it on YouTube instead.
              </p>
              {href ? (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink
                      data-icon="inline-start"
                      className="size-3.5"
                    />
                    Open on YouTube
                  </a>
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
