"use client";

import { useEffect, useState } from "react";
import { AuthField, authInputClassName } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";
import type { SafeUser } from "@/types/user";
import { Copy, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type TwoFactorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SafeUser;
  onUpdated: (user: SafeUser) => void;
};

type SetupPayload = {
  secret: string;
  qrDataUrl: string;
};

export function TwoFactorDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: TwoFactorDialogProps) {
  const [step, setStep] = useState<"idle" | "setup" | "backup" | "disable">(
    "idle",
  );
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(user.twoFactorEnabled ? "disable" : "idle");
    setSetup(null);
    setCode("");
    setPassword("");
    setBackupCodes([]);
  }, [open, user.twoFactorEnabled]);

  async function startSetup() {
    setPending(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: SetupPayload;
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Could not start 2FA setup.");
        return;
      }
      setSetup(json.data ?? null);
      setStep("setup");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function enable2fa(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const json = (await res.json()) as {
        data?: { user: SafeUser; backupCodes: string[] };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Could not enable 2FA.");
        return;
      }
      if (json.data?.user) onUpdated(json.data.user);
      setBackupCodes(json.data?.backupCodes ?? []);
      setStep("backup");
      toast.success("Two-factor authentication enabled");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function disable2fa(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password: password || undefined,
          code: code || undefined,
        }),
      });
      const json = (await res.json()) as {
        data?: { user: SafeUser };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Could not disable 2FA.");
        return;
      }
      if (json.data?.user) onUpdated(json.data.user);
      toast.success("Two-factor authentication disabled");
      onOpenChange(false);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function copyBackupCodes() {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      toast.success("Backup codes copied");
    } catch {
      toast.error("Could not copy codes.");
    }
  }

  const shellMeta = {
    idle: {
      title: "Enable two-factor authentication",
      description:
        "Protect your account with an authenticator app (Google Authenticator, Authy, 1Password, etc.).",
    },
    setup: {
      title: "Scan QR code",
      description:
        "Scan with your authenticator app, then enter the 6-digit code.",
    },
    backup: {
      title: "Save backup codes",
      description:
        "Store these codes somewhere safe. Each can be used once if you lose your authenticator.",
    },
    disable: {
      title: "Disable two-factor authentication",
      description: `Confirm with your ${user.hasPassword ? "password or authenticator" : "authenticator"} code.`,
    },
  }[step];

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<ShieldCheck className="size-5" aria-hidden />}
      title={shellMeta.title}
      description={shellMeta.description}
      footer={
        step === "idle" ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={startSetup}>
              {pending ? "Preparing…" : "Continue"}
            </Button>
          </>
        ) : step === "setup" && setup ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="2fa-enable-form" disabled={pending}>
              {pending ? "Enabling…" : "Enable 2FA"}
            </Button>
          </>
        ) : step === "backup" ? (
          <>
            <Button type="button" variant="outline" onClick={copyBackupCodes}>
              <Copy data-icon="inline-start" />
              Copy
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </>
        ) : step === "disable" ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="2fa-disable-form"
              variant="destructive"
              disabled={pending}
            >
              {pending ? "Disabling…" : "Disable 2FA"}
            </Button>
          </>
        ) : null
      }
    >
      {step === "setup" && setup ? (
        <form id="2fa-enable-form" onSubmit={enable2fa} className="space-y-4">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup.qrDataUrl}
              alt="2FA QR code"
              className="size-[180px] rounded-lg bg-white p-2 ring-1 ring-foreground/10"
            />
          </div>
          <p className="break-all rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground ring-1 ring-foreground/8">
            {setup.secret}
          </p>
          <AuthField id="2fa-enable-code" label="6-digit code" icon={ShieldCheck}>
            <input
              id="2fa-enable-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="\d{6}"
              placeholder="000000"
              className={authInputClassName}
              required
            />
          </AuthField>
        </form>
      ) : null}

      {step === "backup" ? (
        <ul className="grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-3 font-mono text-sm ring-1 ring-foreground/10">
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}

      {step === "disable" ? (
        <form id="2fa-disable-form" onSubmit={disable2fa} className="space-y-4">
          {user.hasPassword && (
            <AuthField id="2fa-disable-password" label="Password" icon={Lock}>
              <input
                id="2fa-disable-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className={authInputClassName}
              />
            </AuthField>
          )}
          <AuthField
            id="2fa-disable-code"
            label={
              user.hasPassword
                ? "Or authenticator / backup code"
                : "Authenticator / backup code"
            }
            icon={ShieldCheck}
          >
            <input
              id="2fa-disable-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              placeholder="6-digit or backup code"
              className={authInputClassName}
            />
          </AuthField>
        </form>
      ) : null}
    </DialogShell>
  );
}
