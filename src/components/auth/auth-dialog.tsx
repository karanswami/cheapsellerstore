"use client";

import styles from "@/components/auth/auth-dialog.module.css";
import { AuthMaintenanceNotice } from "@/components/auth/auth-maintenance-notice";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { TwoFactorForm } from "@/components/auth/two-factor-form";
import { useSiteConfig } from "@/components/theme/site-config-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/types/user";
import { GalleryVerticalEnd } from "lucide-react";
import { useEffect, useState } from "react";

export type AuthMode = "login" | "register" | "forgot" | "2fa";

type AuthDialogProps = {
  mode: AuthMode | null;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onSuccess: (user?: SafeUser | null) => void;
  /** Prefill register referral field from invite URL. */
  initialReferralCode?: string;
};

const STATIC_COPY: Record<
  Exclude<AuthMode, "login" | "register">,
  { title: string; description: string }
> = {
  forgot: {
    title: "Reset password",
    description: "We'll email you a one-time code to set a new password.",
  },
  "2fa": {
    title: "Two-factor authentication",
    description: "Enter the code from your authenticator app or a backup code.",
  },
};

function authCopy(
  mode: AuthMode,
  siteName: string,
): { title: string; description: string; brandTitle?: boolean } {
  if (mode === "login") {
    return {
      title: siteName,
      description: "Sign in to continue.",
      brandTitle: true,
    };
  }
  if (mode === "register") {
    return {
      title: `Join ${siteName}`,
      description: "Create your account and start shopping.",
    };
  }
  return STATIC_COPY[mode];
}

export function AuthDialog({
  mode,
  onModeChange,
  onClose,
  onSuccess,
  initialReferralCode = "",
}: AuthDialogProps) {
  const site = useSiteConfig();
  const open = mode !== null;
  const copy = mode ? authCopy(mode, site.siteName) : null;
  /** OTP / 2FA mid-flow — don't dismiss on outside click or Escape (state would be lost). */
  const lockDismiss = mode === "forgot" || mode === "2fa";
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    if (!open || (mode !== "login" && mode !== "register")) {
      setMaintenance(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/maintenance", { cache: "no-store" });
        const json = (await res.json()) as {
          data?: { maintenance?: boolean };
        };
        if (!cancelled) setMaintenance(Boolean(json.data?.maintenance));
      } catch {
        if (!cancelled) setMaintenance(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton
        className={cn(
          styles.content,
          "flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
        )}
        onPointerDownOutside={(e) => {
          if (lockDismiss) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (lockDismiss) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (lockDismiss) e.preventDefault();
        }}
      >
        {mode && copy && (
          <>
            <div className={cn(styles.header, "shrink-0 px-5 pt-5 pb-4 sm:px-6")}>
              <div className={styles.headerGlow} aria-hidden />
              <div className={styles.headerSheen} aria-hidden />
              <div className={cn(styles.headerInner, "flex items-start gap-3 pr-8")}>
                <span className={styles.logoMark} aria-hidden>
                  {site.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={site.logoUrl} alt="" />
                  ) : (
                    <GalleryVerticalEnd className="size-4 text-primary" />
                  )}
                </span>
                <DialogHeader className="min-w-0 flex-1 gap-1 text-left">
                  <DialogTitle
                    className={cn(
                      styles.title,
                      copy.brandTitle
                        ? "text-base font-bold tracking-[0.06em] uppercase sm:text-lg"
                        : "text-lg font-semibold tracking-tight",
                    )}
                  >
                    {copy.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {maintenance && mode === "login"
                      ? "Store maintenance is on — customer sign-in is paused."
                      : maintenance && mode === "register"
                        ? "Store maintenance is on — registration is closed."
                        : copy.description}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>

            <div
              className={cn(
                styles.body,
                "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:pb-6",
              )}
            >
              {maintenance && (mode === "login" || mode === "register") && (
                <AuthMaintenanceNotice mode={mode} />
              )}
              {mode === "login" && (
                <LoginForm
                  onSuccess={onSuccess}
                  onRequires2fa={() => onModeChange("2fa")}
                  onSwitchToRegister={() => onModeChange("register")}
                  onForgotPassword={() => onModeChange("forgot")}
                />
              )}
              {mode === "register" && (
                <RegisterForm
                  onSuccess={onSuccess}
                  onSwitchToLogin={() => onModeChange("login")}
                  initialReferralCode={initialReferralCode}
                  maintenanceLocked={maintenance}
                />
              )}
              {mode === "forgot" && (
                <ForgotPasswordForm
                  onSwitchToLogin={() => onModeChange("login")}
                />
              )}
              {mode === "2fa" && (
                <TwoFactorForm
                  onSuccess={onSuccess}
                  onBack={() => onModeChange("login")}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
