"use client";

import {
  useEffect,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProfileBorder, SafeUser, SocialLinks } from "@/types/user";
import {
  AtSign,
  Camera,
  Link2,
  MessageCircle,
  Palette,
  Play,
  Shield,
  Smile,
  User,
} from "lucide-react";
import { toast } from "sonner";

type DialogShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
};

function DialogShell({
  open,
  onOpenChange,
  icon,
  title,
  description,
  children,
  footer,
  wide,
}: DialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92dvh,640px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0",
          wide ? "sm:max-w-lg" : "sm:max-w-md",
        )}
      >
        <div className="shrink-0 border-b border-border bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              {icon}
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>
        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 rounded-none border-t border-border bg-muted/20 px-4 py-3 sm:justify-end sm:px-5">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function patchProfile(
  body: Record<string, unknown>,
): Promise<{ user?: SafeUser; message?: string }> {
  const res = await fetch("/api/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  let json: {
    data?: { user: SafeUser };
    error?: { message: string };
  } = {};
  try {
    json = (await res.json()) as typeof json;
  } catch {
    return { message: "Could not update profile." };
  }
  if (!res.ok || !json.data?.user) {
    return { message: json.error?.message ?? "Could not update profile." };
  }
  return { user: json.data.user };
}

type SharedProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SafeUser;
  onUpdated: (user: SafeUser) => void;
};

export function BioEditDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: SharedProps) {
  const [bio, setBio] = useState(user.bio ?? "");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBio(user.bio ?? "");
    // Seed once when the dialog opens — avoid wiping edits on auth poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only seed
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await patchProfile({ bio: bio.trim() || null });
      if (!result.user) {
        toast.error(result.message ?? "Could not update bio.");
        return;
      }
      onUpdated(result.user);
      onOpenChange(false);
      toast.success("Bio updated.");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<User className="size-5" />}
      title="Edit bio"
      description="Tell others about yourself. Visible on your public profile."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" form="bio-form" disabled={pending}>
            {pending ? "Saving…" : "Save bio"}
          </Button>
        </>
      }
    >
      <form id="bio-form" onSubmit={onSubmit} className="space-y-2">
        <Label htmlFor="bio">About me</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          maxLength={500}
          rows={5}
          placeholder="Write a short bio…"
          className="resize-none"
        />
        <p className="text-right text-xs text-muted-foreground">
          {bio.length}/500
        </p>
      </form>
    </DialogShell>
  );
}

export function PrivacyDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: SharedProps) {
  const [isPublic, setIsPublic] = useState(user.isProfilePublic);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsPublic(user.isProfilePublic);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only seed
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await patchProfile({ isProfilePublic: isPublic });
      if (!result.user) {
        toast.error(result.message ?? "Could not update privacy settings.");
        return;
      }
      onUpdated(result.user);
      onOpenChange(false);
      toast.success("Privacy settings updated.");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Shield className="size-5" />}
      title="Privacy"
      description="Control who can see your public profile."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" form="privacy-form" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </>
      }
    >
      <form id="privacy-form" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">Public profile</p>
            <p className="text-xs text-muted-foreground">
              {isPublic
                ? "Anyone with your link can view bio, stats, and socials."
                : "Only you can view your full profile."}
            </p>
          </div>
          <Switch
            checked={isPublic}
            onCheckedChange={setIsPublic}
            aria-label="Public profile"
            className="mt-0.5"
          />
        </div>
      </form>
    </DialogShell>
  );
}

const SOCIAL_FIELDS: {
  key: keyof SocialLinks;
  label: string;
  placeholder: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    key: "telegram",
    label: "Telegram",
    placeholder: "@username or t.me/…",
    icon: MessageCircle,
  },
  {
    key: "discord",
    label: "Discord",
    placeholder: "username or discord.gg/…",
    icon: MessageCircle,
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "@channel or youtube.com/…",
    icon: Play,
  },
  {
    key: "twitter",
    label: "Twitter / X",
    placeholder: "@username or x.com/…",
    icon: AtSign,
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "@username or instagram.com/…",
    icon: Camera,
  },
];

export function SocialLinksDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: SharedProps) {
  const [links, setLinks] = useState<SocialLinks>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLinks({
      telegram: user.socialLinks?.telegram ?? "",
      discord: user.socialLinks?.discord ?? "",
      youtube: user.socialLinks?.youtube ?? "",
      twitter: user.socialLinks?.twitter ?? "",
      instagram: user.socialLinks?.instagram ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only seed
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const cleaned: SocialLinks = {};
    for (const [key, value] of Object.entries(links)) {
      const trimmed = value?.trim();
      if (trimmed) cleaned[key as keyof SocialLinks] = trimmed;
    }

    setPending(true);
    try {
      const result = await patchProfile({
        socialLinks: Object.keys(cleaned).length > 0 ? cleaned : null,
      });
      if (!result.user) {
        toast.error(result.message ?? "Could not update social links.");
        return;
      }
      onUpdated(result.user);
      onOpenChange(false);
      toast.success("Social links updated.");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Link2 className="size-5" />}
      title="Social links"
      description="Add profiles so others can connect with you."
      wide
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" form="social-form" disabled={pending}>
            {pending ? "Saving…" : "Save links"}
          </Button>
        </>
      }
    >
      <form id="social-form" onSubmit={onSubmit} className="space-y-3">
        {SOCIAL_FIELDS.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.key} className="space-y-1.5">
              <Label
                htmlFor={`social-${field.key}`}
                className="flex items-center gap-1.5"
              >
                <Icon className="size-3.5 text-muted-foreground" />
                {field.label}
              </Label>
              <Input
                id={`social-${field.key}`}
                value={links[field.key] ?? ""}
                onChange={(e) =>
                  setLinks((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                placeholder={field.placeholder}
                maxLength={100}
              />
            </div>
          );
        })}
      </form>
    </DialogShell>
  );
}

const BORDER_OPTIONS: {
  value: ProfileBorder;
  label: string;
  description: string;
  preview: string;
  unlock: "all" | "premium" | "admin";
}[] = [
  {
    value: "NONE",
    label: "No border",
    description: "Default profile picture style",
    preview: "border-2 border-border",
    unlock: "all",
  },
  {
    value: "PREMIUM",
    label: "Premium",
    description: "Gold ring for Premium members and sellers",
    preview: "border-2 border-amber-500 shadow-[0_0_0_2px_rgba(245,158,11,0.25)]",
    unlock: "premium",
  },
  {
    value: "VIP",
    label: "VIP",
    description: "Exclusive ring for admins",
    preview: "border-2 border-primary shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_35%,transparent)]",
    unlock: "admin",
  },
];

export function ProfileBorderDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: SharedProps) {
  const [border, setBorder] = useState<ProfileBorder>(user.profileBorder);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBorder(user.profileBorder);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only seed
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await patchProfile({ profileBorder: border });
      if (!result.user) {
        toast.error(result.message ?? "Could not update profile border.");
        return;
      }
      onUpdated(result.user);
      onOpenChange(false);
      toast.success("Profile border updated.");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Palette className="size-5" />}
      title="Profile border"
      description="Choose a ring style for your profile picture."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" form="border-form" disabled={pending}>
            {pending ? "Saving…" : "Save border"}
          </Button>
        </>
      }
    >
      <form id="border-form" onSubmit={onSubmit} className="space-y-2">
        {BORDER_OPTIONS.map((option) => {
          const seller =
            user.role === "SELLER" ||
            user.role === "RESELLER" ||
            user.role === "ADMIN";
          const available =
            option.unlock === "all" ||
            (option.unlock === "premium" && (user.isPremium || seller)) ||
            (option.unlock === "admin" && user.role === "ADMIN");
          const selected = border === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={!available}
              onClick={() => available && setBorder(option.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                available
                  ? "hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  : "cursor-not-allowed opacity-50",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card",
              )}
            >
              <span
                className={cn(
                  "size-10 shrink-0 rounded-full bg-muted",
                  option.preview,
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {option.description}
                  {!available ? " · Unlock Premium" : ""}
                </span>
              </span>
              <span
                className={cn(
                  "size-4 shrink-0 rounded-full border",
                  selected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40",
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </form>
    </DialogShell>
  );
}

const COMMON_EMOJIS = [
  "😊",
  "😎",
  "🚀",
  "💎",
  "🔥",
  "⚡",
  "🎮",
  "💻",
  "🎯",
  "🏆",
  "👑",
  "✨",
];

export function EmojiStatusDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: SharedProps) {
  const [emoji, setEmoji] = useState(user.emojiStatus ?? "");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmoji(user.emojiStatus ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-only seed
  }, [open]);

  async function save(next: string | null) {
    setPending(true);
    try {
      const result = await patchProfile({ emojiStatus: next });
      if (!result.user) {
        toast.error(result.message ?? "Could not update emoji status.");
        return;
      }
      onUpdated(result.user);
      onOpenChange(false);
      toast.success(next ? "Emoji status updated." : "Emoji status cleared.");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await save(emoji.trim() || null);
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Smile className="size-5" />}
      title="Emoji status"
      description="Show a quick mood or vibe on your profile."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void save(null)}
            disabled={pending || !user.emojiStatus}
          >
            Clear
          </Button>
          <Button type="submit" form="emoji-form" disabled={pending || !emoji.trim()}>
            {pending ? "Saving…" : "Save status"}
          </Button>
        </>
      }
    >
      <form id="emoji-form" onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="emoji">Status emoji</Label>
          <Input
            id="emoji"
            value={emoji}
            onChange={(e) => {
              const next = e.target.value.trim();
              // Keep at most one grapheme cluster-ish (emoji can be multi-code-unit).
              const chars = [...next];
              setEmoji(chars.slice(0, 2).join(""));
            }}
            placeholder="😊"
            maxLength={8}
            className="h-14 text-center text-3xl"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Quick pick
          </p>
          <div className="grid grid-cols-6 gap-2">
            {COMMON_EMOJIS.map((option) => (
              <Button
                key={option}
                type="button"
                variant={emoji === option ? "default" : "outline"}
                size="sm"
                className="h-10 text-lg"
                onClick={() => setEmoji(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      </form>
    </DialogShell>
  );
}
