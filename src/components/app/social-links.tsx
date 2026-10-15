"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SocialLinks as SocialLinksType } from "@/types/user";
import { AtSign, Camera, ExternalLink, MessageCircle, Play } from "lucide-react";
import Link from "next/link";

type SocialLinksProps = {
  socialLinks: SocialLinksType | null;
  className?: string;
  /** `premium` = dark pill buttons for public show pages */
  variant?: "default" | "premium" | "icons";
};

const socialPlatforms = [
  {
    key: "telegram" as const,
    label: "Telegram",
    icon: MessageCircle,
    color: "text-blue-500",
    getUrl: (handle: string) => 
      handle.startsWith("@") 
        ? `https://t.me/${handle.slice(1)}` 
        : handle.startsWith("http") 
          ? handle 
          : `https://t.me/${handle}`,
  },
  {
    key: "discord" as const,
    label: "Discord",
    icon: MessageCircle,
    color: "text-indigo-500",
    getUrl: (handle: string) => 
      handle.startsWith("http") 
        ? handle 
        : `https://discord.com/users/${handle}`,
  },
  {
    key: "youtube" as const,
    label: "YouTube",
    icon: Play,
    color: "text-red-500",
    getUrl: (handle: string) => 
      handle.startsWith("@") 
        ? `https://youtube.com/${handle}` 
        : handle.startsWith("http") 
          ? handle 
          : `https://youtube.com/@${handle}`,
  },
  {
    key: "twitter" as const,
    label: "Twitter/X",
    icon: AtSign,
    color: "text-gray-800 dark:text-gray-200",
    getUrl: (handle: string) => 
      handle.startsWith("@") 
        ? `https://x.com/${handle.slice(1)}` 
        : handle.startsWith("http") 
          ? handle 
          : `https://x.com/${handle}`,
  },
  {
    key: "instagram" as const,
    label: "Instagram",
    icon: Camera,
    color: "text-pink-500",
    getUrl: (handle: string) => 
      handle.startsWith("@") 
        ? `https://instagram.com/${handle.slice(1)}` 
        : handle.startsWith("http") 
          ? handle 
          : `https://instagram.com/${handle}`,
  },
];

export function SocialLinks({
  socialLinks,
  className = "",
  variant = "default",
}: SocialLinksProps) {
  if (!socialLinks) return null;

  const activePlatforms = socialPlatforms.filter(
    (platform) => socialLinks[platform.key]?.trim()
  );

  if (activePlatforms.length === 0) return null;

  if (variant === "premium") {
    return (
      <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}>
        {activePlatforms.map((platform) => {
          const handle = socialLinks[platform.key]!.trim();
          const url = platform.getUrl(handle);
          const Icon = platform.icon;

          return (
            <Button
              key={platform.key}
              variant="outline"
              size="sm"
              asChild
              className={cn(
                "h-11 justify-between rounded-2xl border-border/70 bg-[#12081f]/85 px-4 text-foreground shadow-[0_10px_30px_-18px_rgba(217,70,239,0.55)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-primary/45 hover:bg-[#1b0b2c]/90 hover:shadow-[0_16px_34px_-18px_rgba(217,70,239,0.75)] dark:bg-[#10061a]/90",
                platform.key === "telegram" && "border-sky-500/25",
                platform.key === "discord" && "border-indigo-500/25",
                platform.key === "youtube" && "border-red-500/25",
                platform.key === "twitter" && "border-zinc-500/25",
                platform.key === "instagram" && "border-pink-500/25",
              )}
              title={platform.label}
            >
              <Link
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={platform.label}
                className="flex w-full items-center justify-between gap-3"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-background/40 ring-1 ring-white/10">
                    <Icon className={cn("size-3.5", platform.color)} />
                  </span>
                  <span className="truncate text-sm font-medium">{platform.label}</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 opacity-60" />
              </Link>
            </Button>
          );
        })}
      </div>
    );
  }

  if (variant === "icons") {
    return (
      <div className={cn("flex flex-wrap items-center justify-center gap-2.5", className)}>
        {activePlatforms.map((platform) => {
          const handle = socialLinks[platform.key]!.trim();
          const url = platform.getUrl(handle);
          const Icon = platform.icon;

          return (
            <Button
              key={platform.key}
              variant="outline"
              size="icon"
              asChild
              className="size-11 rounded-full border-border/70 bg-card/80 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
              title={platform.label}
            >
              <Link
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={platform.label}
              >
                <Icon className={cn("size-4", platform.color)} />
              </Link>
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {activePlatforms.map((platform) => {
        const handle = socialLinks[platform.key]!.trim();
        const url = platform.getUrl(handle);
        const Icon = platform.icon;

        return (
          <Button
            key={platform.key}
            variant="outline"
            size="sm"
            asChild
            className="h-8 px-3"
          >
            <Link
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <Icon className={`h-4 w-4 ${platform.color}`} />
              <span className="text-sm">{platform.label}</span>
              <ExternalLink className="h-3 w-3 opacity-50" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

export function SocialLinksDisplay({ socialLinks }: { socialLinks: SocialLinksType | null }) {
  if (!socialLinks) return null;

  const activePlatforms = socialPlatforms.filter(
    (platform) => socialLinks[platform.key]?.trim()
  );

  if (activePlatforms.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Social Links</h4>
      <SocialLinks socialLinks={socialLinks} />
    </div>
  );
}