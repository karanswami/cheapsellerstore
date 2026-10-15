"use client";

import {
  ChangePasswordDialog,
  ProfileEditDialog,
} from "@/components/app/profile-dialogs";
import {
  ProfileHeroStage,
  profileHeroStyles,
} from "@/components/app/profile-hero-stage";
import { TwoFactorDialog } from "@/components/app/two-factor-dialog";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useInstallAppAction } from "@/components/layout/install-app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  feedbackSuccess,
  isHapticsEnabled,
  isSoundEnabled,
  setFeedbackMuted,
  setHapticsMuted,
  setSoundMuted,
} from "@/lib/feedback";
import { toast } from "@/lib/toast";
import { useWebPush } from "@/hooks/use-web-push";
import { cn } from "@/lib/utils";
import type { PublicStaticPageNav } from "@/types/static-page";
import type { SafeUser } from "@/types/user";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgePercent,
  Bell,
  BellOff,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  Vibrate,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ProfileViewProps = {
  user: SafeUser;
  staticPages?: PublicStaticPageNav[];
  resellerCta?: {
    showJoin: boolean;
    status: "pending" | "reseller" | "closed" | "low_balance" | "eligible" | "hidden";
    minBalanceUsd: number;
  };
};

function formatJoined(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProfileView({
  user: initialUser,
  resellerCta,
  staticPages = [],
}: ProfileViewProps) {
  const { logout, setUser, refresh, user: liveUser } = useAuth();
  const { canInstall, install, isInstalled, isAndroid } = useInstallAppAction();
  const router = useRouter();
  const [user, setLocalUser] = useState(initialUser);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const {
    supported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    loading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = useWebPush();

  function refreshFeedbackState() {
    setSoundOn(isSoundEnabled());
    setHapticsOn(isHapticsEnabled());
  }

  useEffect(() => {
    refreshFeedbackState();
  }, []);

  useEffect(() => {
    if (liveUser) setLocalUser(liveUser);
  }, [liveUser]);

  function toggleSound() {
    const next = !isSoundEnabled();
    if (next) setFeedbackMuted(false);
    setSoundMuted(!next);
    refreshFeedbackState();
    if (next) {
      feedbackSuccess();
      toast.success("Tap sounds on");
    } else {
      toast.message("Tap sounds muted");
    }
  }

  function toggleHaptics() {
    const next = !isHapticsEnabled();
    if (next) setFeedbackMuted(false);
    setHapticsMuted(!next);
    refreshFeedbackState();
    toast.message(next ? "Haptic feedback on" : "Haptic feedback muted");
  }

  async function onLogout() {
    await logout();
    window.location.assign("/");
  }

  async function handleUpdated(next: SafeUser) {
    setLocalUser(next);
    setUser(next);
    await refresh();
    router.refresh();
  }

  const detailTiles: { label: string; value: string; icon: LucideIcon }[] = [
    { label: "Email", value: user.email, icon: Mail },
    { label: "Name", value: user.name, icon: UserRound },
    { label: "Currency", value: "USD", icon: Wallet },
    { label: "Joined", value: formatJoined(user.createdAt), icon: CalendarDays },
  ];

  return (
    <HubPageShell maxWidth="lg">
      <ProfileHeroStage user={user} joinedLabel={formatJoined(user.createdAt)} />

      {resellerCta &&
      (resellerCta.status === "eligible" ||
        resellerCta.status === "low_balance" ||
        resellerCta.status === "pending" ||
        resellerCta.showJoin) ? (
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background/85 to-card/95 p-4 sm:p-5 shadow-[var(--glow-soft)] backdrop-blur-md">
          {/* Subtle decorative glow orb */}
          <div
            className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-primary/20 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-col gap-3.5">
            {/* Top row: Badge + Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3" />
                <span>PARTNER PROGRAM</span>
              </div>
              {resellerCta.status === "pending" ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                  <Clock className="size-3" />
                  Pending Review
                </span>
              ) : (
                <span className="text-[11px] font-medium text-muted-foreground">
                  Wholesale Access
                </span>
              )}
            </div>

            {/* Main Header */}
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                <Store className="size-5.5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                  Become an Official Reseller
                </h3>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Access discounted wholesale pricing, manage sub-resellers, and get 24/7 instant key fulfillment.
                </p>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 pt-0.5 sm:grid-cols-3">
              <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 text-xs text-foreground/90">
                <BadgePercent className="size-3.5 text-primary shrink-0" />
                <span className="truncate">Wholesale Rates</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 text-xs text-foreground/90">
                <Zap className="size-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Instant Delivery</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 text-xs text-foreground/90 sm:col-span-1">
                <Users className="size-3.5 text-sky-400 shrink-0" />
                <span className="truncate">Sub-Resellers</span>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-center sm:justify-between">
              {resellerCta.status === "pending" ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-4 text-amber-400 shrink-0" />
                  <span>Your reseller application is currently under admin review.</span>
                </div>
              ) : resellerCta.status === "low_balance" ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="size-4 text-primary shrink-0" />
                  <span>
                    Min wallet balance of <span className="font-semibold text-foreground">${resellerCta.minBalanceUsd}</span> required to apply.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                  <span>Your account is eligible for instant application.</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {resellerCta.status === "pending" ? (
                  <Button size="sm" variant="outline" disabled className="w-full sm:w-auto">
                    Under Review
                  </Button>
                ) : resellerCta.status === "low_balance" ? (
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Button size="sm" variant="outline" asChild className="flex-1 sm:flex-initial">
                      <Link href="/app/deposit">
                        <Wallet className="mr-1.5 size-3.5" />
                        Deposit
                      </Link>
                    </Button>
                    <Button size="sm" asChild className="flex-1 sm:flex-initial shadow-[var(--glow-soft)]">
                      <Link href="/app/become-seller">
                        Apply Now
                        <ArrowRight className="ml-1.5 size-3.5" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" asChild className="w-full sm:w-auto shadow-[var(--glow-soft)]">
                    <Link href="/app/become-seller">
                      Apply for Reseller
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className={cn(profileHeroStyles.glassPanel, "overflow-hidden")}>
        <Card variant="summary" className="border-0 bg-transparent shadow-none">
          <CardHeader className="border-b border-border/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium tracking-wide text-primary uppercase">
                  Account
                </p>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>
                  Read-only summary — tap Edit to update name or photo.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl"
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {detailTiles.map((tile) => (
                <div
                  key={tile.label}
                  className="flex items-center gap-3 rounded-xl bg-muted/25 px-3 py-3 ring-1 ring-foreground/8"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <tile.icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {tile.label}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium">
                      {tile.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className={cn(profileHeroStyles.glassPanel, "overflow-hidden")}>
        <Card variant="list" className="border-0 bg-transparent shadow-none">
          <CardHeader className="border-b border-border/40 px-(--card-spacing) py-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium tracking-wide text-primary uppercase">
                  Security
                </p>
                <CardTitle>Account safety</CardTitle>
                <CardDescription>
                  Password, Google sign-in, and two-factor authentication.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                  <CheckCircle2 className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <Badge variant={user.emailVerified ? "secondary" : "outline"}>
                  {user.emailVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>

              {user.hasGoogle && (
                <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Mail className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Google account</p>
                    <p className="text-sm text-muted-foreground">
                      Linked & verified
                    </p>
                  </div>
                  <Badge variant="secondary">Connected</Badge>
                </div>
              )}

              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <KeyRound className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {user.hasPassword ? "Change password" : "Set password"}
                </span>
                <ChevronRight
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
              </button>

              <button
                type="button"
                onClick={() => setTwoFactorOpen(true)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    Two-factor authentication
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {user.twoFactorEnabled
                      ? "Enabled"
                      : "Add an authenticator app"}
                  </span>
                </span>
                <Badge variant={user.twoFactorEnabled ? "secondary" : "outline"}>
                  {user.twoFactorEnabled ? "On" : "Off"}
                </Badge>
                <ChevronRight
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
              </button>

              <button
                type="button"
                onClick={toggleSound}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  {soundOn ? (
                    <Volume2 className="size-4" aria-hidden />
                  ) : (
                    <VolumeX className="size-4" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Tap sounds</span>
                  <span className="block text-xs text-muted-foreground">
                    Premium UI clicks and notification chimes
                  </span>
                </span>
                <Badge variant={soundOn ? "secondary" : "outline"}>
                  {soundOn ? "On" : "Off"}
                </Badge>
              </button>

              <button
                type="button"
                onClick={toggleHaptics}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Vibrate className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    Haptic feedback
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Android-style vibration on taps and alerts
                  </span>
                </span>
                <Badge variant={hapticsOn ? "secondary" : "outline"}>
                  {hapticsOn ? "On" : "Off"}
                </Badge>
              </button>

              {pushSupported ? (
                <button
                  type="button"
                  disabled={pushLoading}
                  onClick={() => {
                    if (pushSubscribed) {
                      void unsubscribePush();
                    } else {
                      void subscribePush();
                    }
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none disabled:opacity-60 sm:px-5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    {pushSubscribed ? (
                      <BellRing className="size-4 text-primary" aria-hidden />
                    ) : pushPermission === "denied" ? (
                      <BellOff className="size-4 text-destructive" aria-hidden />
                    ) : (
                      <Bell className="size-4" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      Push notifications
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {pushPermission === "denied"
                        ? "Notifications blocked in browser settings"
                        : pushSubscribed
                          ? "Device subscribed to instant alerts & announcements"
                          : "Enable native browser alerts for orders & announcements"}
                    </span>
                  </span>
                  <Badge
                    variant={
                      pushSubscribed
                        ? "default"
                        : pushPermission === "denied"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {pushLoading
                      ? "..."
                      : pushSubscribed
                        ? "Enabled"
                        : pushPermission === "denied"
                          ? "Blocked"
                          : "Off"}
                  </Badge>
                </button>
              ) : null}

              {canInstall || isInstalled ? (
                <button
                  type="button"
                  onClick={() => {
                    if (canInstall) void install();
                  }}
                  disabled={isInstalled}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none disabled:pointer-events-none sm:px-5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Smartphone className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {isAndroid && canInstall ? "Download app" : "Install app"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {isInstalled
                        ? "Running as installed app"
                        : isAndroid
                          ? "Download the official Android APK"
                          : "Add to home screen for quick access"}
                    </span>
                  </span>
                  {isInstalled ? (
                    <Badge variant="secondary">Installed</Badge>
                  ) : (
                    <ChevronRight
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                </button>
              ) : null}
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/40">
            <Button
              onClick={onLogout}
              variant="outline"
              className="w-full rounded-xl text-destructive hover:text-destructive"
            >
              <LogOut data-icon="inline-start" />
              Log out
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section className={cn(profileHeroStyles.glassPanel, "overflow-hidden")}>
        <Card variant="list" className="border-0 bg-transparent shadow-none">
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              <Link
                href="/faq"
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CircleHelp className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">FAQ & help</span>
                  <span className="block text-xs text-muted-foreground">
                    Deposits, keys, account answers — or open Support anytime
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>

              {staticPages.map((page) => (
                <Link
                  key={page.id}
                  href={`/pages/${page.slug}`}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <FileText className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{page.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      View details
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <ProfileEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        onUpdated={handleUpdated}
      />
      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={async (next) => {
          setPasswordOpen(next);
          if (!next) {
            await refresh();
            try {
              const res = await fetch("/api/auth/me", { credentials: "include" });
              const json = (await res.json()) as {
                data?: { user: SafeUser | null };
              };
              if (json.data?.user) {
                setLocalUser(json.data.user);
                setUser(json.data.user);
              }
            } catch {
              /* ignore */
            }
          }
        }}
        hasPassword={user.hasPassword}
      />
      <TwoFactorDialog
        open={twoFactorOpen}
        onOpenChange={setTwoFactorOpen}
        user={user}
        onUpdated={handleUpdated}
      />
    </HubPageShell>
  );
}
