"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildReferralLink } from "@/lib/referral-utils";
import {
  buildPublicProfilePath,
  buildPublicProfileUrl,
  isSellerRole,
  roleDescription,
  roleLabel,
} from "@/lib/profile";
import type { SafeUser } from "@/types/user";
import {
  BadgeCheck,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Gift,
  Link2,
  Share2,
  Store,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ProfileShareCardProps = {
  user: SafeUser;
  referralCode: string | null;
};

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
    return true;
  } catch {
    toast.error("Could not copy. Try again.");
    return false;
  }
}

export function ProfileShareCard({ user, referralCode }: ProfileShareCardProps) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<"profile" | "referral" | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const profilePath = buildPublicProfilePath(user.username);
  const profileUrl = useMemo(
    () => (origin ? buildPublicProfileUrl(origin, user.username) : profilePath),
    [origin, profilePath, user.username],
  );
  const inviteUrl = useMemo(() => {
    if (!referralCode || !origin) return "";
    return buildReferralLink(origin, referralCode);
  }, [origin, referralCode]);

  const seller = isSellerRole(user.role);

  async function onCopyProfile() {
    const ok = await copyText(profileUrl, "Profile link");
    if (ok) {
      setCopied("profile");
      window.setTimeout(() => setCopied(null), 1800);
    }
  }

  async function onCopyReferral() {
    if (!inviteUrl) {
      toast.message("Referral link is not ready yet.");
      return;
    }
    const ok = await copyText(inviteUrl, "Invite link");
    if (ok) {
      setCopied("referral");
      window.setTimeout(() => setCopied(null), 1800);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Share2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">
              Share
            </p>
            <CardTitle>Public profile & invites</CardTitle>
            <CardDescription>
              Copy your profile link or referral invite. Status and verification
              show on your public page.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={seller ? "secondary" : "outline"} className="gap-1">
            {seller ? (
              <Store className="size-3" aria-hidden />
            ) : (
              <UserRound className="size-3" aria-hidden />
            )}
            {roleLabel(user.role)}
          </Badge>
          {user.emailVerified ? (
            <Badge variant="secondary" className="gap-1 text-success">
              <BadgeCheck className="size-3" aria-hidden />
              Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              Unverified
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            {user.isProfilePublic ? (
              <Eye className="size-3" aria-hidden />
            ) : (
              <EyeOff className="size-3" aria-hidden />
            )}
            {user.isProfilePublic ? "Public" : "Private"}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          {roleDescription(user.role)}
          {user.emailVerified
            ? " · Email verified"
            : " · Verify email for a trust badge"}
        </p>

        <div className="space-y-2 rounded-xl border border-border bg-card px-3 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="size-4 text-primary" aria-hidden />
            Public profile
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {profileUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onCopyProfile}>
              {copied === "profile" ? (
                <Check className="size-3.5" data-icon="inline-start" />
              ) : (
                <Copy className="size-3.5" data-icon="inline-start" />
              )}
              Copy link
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={profilePath}>
                <ExternalLink className="size-3.5" data-icon="inline-start" />
                Preview
              </Link>
            </Button>
          </div>
          {!user.isProfilePublic ? (
            <p className="text-xs text-muted-foreground">
              Profile is private — others see a limited page until you make it
              public.
            </p>
          ) : null}
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-card px-3 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Gift className="size-4 text-primary" aria-hidden />
            Referral invite
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {inviteUrl || "Generating invite link…"}
          </p>
          {referralCode ? (
            <p className="text-xs text-muted-foreground">
              Code:{" "}
              <span className="font-mono font-medium text-foreground">
                {referralCode}
              </span>
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void onCopyReferral()}
            disabled={!inviteUrl}
          >
            {copied === "referral" ? (
              <Check className="size-3.5" data-icon="inline-start" />
            ) : (
              <Copy className="size-3.5" data-icon="inline-start" />
            )}
            Copy invite link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
