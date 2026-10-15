"use client";

import styles from "@/components/app/profile-hero-stage.module.css";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { isSellerRole, roleLabel } from "@/lib/profile";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/types/user";
import {
  BadgeCheck,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { useRef, type PointerEvent } from "react";

type ProfileHeroStageProps = {
  user: SafeUser;
  joinedLabel: string;
  className?: string;
};

export function ProfileHeroStage({
  user,
  joinedLabel,
  className,
}: ProfileHeroStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;
    const inner = innerRef.current;
    if (!stage || !inner) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = stage.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    inner.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 6}deg)`;
  }

  function onPointerLeave() {
    if (innerRef.current) {
      innerRef.current.style.transform = "rotateY(0deg) rotateX(0deg)";
    }
  }

  return (
    <section
      ref={stageRef}
      className={cn(styles.stage, className)}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-label="Profile overview"
    >
      <div className={styles.mesh} aria-hidden />
      <div className={styles.ribbon} aria-hidden />
      <div className={cn(styles.orb, styles.orbOne)} aria-hidden />
      <div className={cn(styles.orb, styles.orbTwo)} aria-hidden />

      <div ref={innerRef} className={styles.inner}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatarRing} aria-hidden />
          <div className={styles.avatarPlate}>
            <Avatar
              className={cn(
                "size-20 rounded-[1rem] after:rounded-[1rem] sm:size-24",
                user.profileBorder === "PREMIUM" &&
                  "ring-2 ring-amber-500 ring-offset-2 ring-offset-background",
                user.profileBorder === "VIP" &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
              size="lg"
            >
              {user.avatarUrl ? (
                <AvatarImage
                  src={user.avatarUrl}
                  alt={user.name}
                  className="rounded-[0.9rem]"
                />
              ) : null}
              <AvatarFallback className="rounded-[0.9rem] bg-primary/15 text-xl font-semibold text-primary sm:text-2xl">
                {initial}
              </AvatarFallback>
              {user.emojiStatus ? (
                <AvatarBadge
                  className="size-6 border border-border/40 bg-card text-sm leading-none text-foreground ring-1 ring-background"
                  aria-label={`Status ${user.emojiStatus}`}
                >
                  {user.emojiStatus}
                </AvatarBadge>
              ) : null}
            </Avatar>
          </div>
        </div>

        <div className={styles.identity}>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            Your profile
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            <Badge
              variant={isSellerRole(user.role) ? "secondary" : "outline"}
              className="text-[10px] font-medium normal-case"
            >
              {roleLabel(user.role)}
            </Badge>
            {user.emailVerified ? (
              <Badge
                variant="secondary"
                className="gap-1 text-[10px] font-medium normal-case text-success"
              >
                <BadgeCheck className="size-3" aria-hidden />
                Verified
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] font-medium normal-case"
              >
                Unverified
              </Badge>
            )}
          </div>

          <div className={cn(styles.stats, "mt-3")}>
            <span className={styles.statChip}>
              <BadgeCheck
                className={cn(
                  "size-3.5",
                  user.emailVerified ? "text-success" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <span className={styles.statMuted}>Verified</span>
              {user.emailVerified ? "Yes" : "No"}
            </span>
            <span className={styles.statChip}>
              <ShieldCheck
                className={cn(
                  "size-3.5",
                  user.twoFactorEnabled ? "text-primary" : "text-muted-foreground",
                )}
                aria-hidden
              />
              <span className={styles.statMuted}>2FA</span>
              {user.twoFactorEnabled ? "On" : "Off"}
            </span>
            <span className={styles.statChip}>
              <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
              <span className={styles.statMuted}>Member</span>
              {joinedLabel}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export { styles as profileHeroStyles };
