"use client";

import { useState } from "react";
import { AuthField, authInputClassName } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { toast } from "@/lib/toast";

type Step = "email" | "otp" | "password" | "done";

type ForgotPasswordFormProps = {
  onSwitchToLogin: () => void;
};

export function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function requestCode() {
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as {
        data?: { message?: string; reused?: boolean };
        error?: { message?: string };
      };
      if (!res.ok) {
        const message = json.error?.message ?? "Could not send code.";
        setError(message);
        toast.error(message);
        return;
      }
      const reused = Boolean(json.data?.reused);
      const message =
        json.data?.message ??
        (reused
          ? "Use the 6-digit code already sent to your email."
          : "Check your email for a 6-digit code.");
      setInfo(message);
      if (reused) {
        toast.success("Use your existing code", {
          description:
            "A reset code was already sent. Enter it below — no new email until it expires.",
        });
      } else {
        toast.success("Reset code sent", {
          description: "Check your inbox for the 6-digit code.",
        });
      }
      setStep("otp");
    } catch {
      const message = "Network error. Try again.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function resetPassword() {
    setError(null);
    setInfo(null);
    if (password !== confirm) {
      const message = "Passwords do not match.";
      setError(message);
      toast.error(message);
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const json = (await res.json()) as {
        data?: { message: string };
        error?: { message: string };
      };
      if (!res.ok) {
        const message = json.error?.message ?? "Could not reset password.";
        setError(message);
        toast.error(message);
        return;
      }
      const message = json.data?.message ?? "Password updated.";
      setInfo(message);
      toast.success("Password updated", {
        description: "You can sign in with your new password.",
      });
      setStep("done");
    } catch {
      const message = "Network error. Try again.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "email") {
      await requestCode();
      return;
    }
    if (step === "otp") {
      setError(null);
      if (!/^\d{6}$/.test(code.trim())) {
        const message = "Enter the 6-digit code from your email.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Code accepted");
      setStep("password");
      return;
    }
    if (step === "password") {
      await resetPassword();
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground" role="status">
          {info ?? "Password updated. You can sign in now."}
        </p>
        <Button type="button" size="lg" className="w-full" onClick={onSwitchToLogin}>
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {step === "email" && (
        <AuthField id="forgot-email" label="Account email" icon={Mail}>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@email.com"
            className={authInputClassName}
            required
          />
        </AuthField>
      )}

      {step === "otp" && (
        <>
          <p className="text-xs text-muted-foreground">
            We sent a code to <span className="font-medium text-foreground">{email}</span>.
          </p>
          <AuthField id="forgot-otp" label="6-digit code" icon={KeyRound}>
            <input
              id="forgot-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className={`${authInputClassName} tracking-[0.3em]`}
              required
              maxLength={6}
            />
          </AuthField>
          <button
            type="button"
            disabled={pending}
            onClick={() => void requestCode()}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            {pending ? "Checking…" : "Didn't get it? Request again"}
          </button>
        </>
      )}

      {step === "password" && (
        <>
          <AuthField id="forgot-password" label="New password" icon={Lock}>
            <input
              id="forgot-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              placeholder="Min. 6 characters"
              className={`${authInputClassName} pr-11`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </AuthField>
          <AuthField id="forgot-confirm" label="Confirm password" icon={Lock}>
            <input
              id="forgot-confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              placeholder="Repeat password"
              className={authInputClassName}
              required
            />
          </AuthField>
        </>
      )}

      {info && (
        <p className="text-sm text-muted-foreground" role="status">
          {info}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending
          ? step === "password"
            ? "Updating…"
            : step === "email"
              ? "Sending…"
              : "Continue…"
          : step === "email"
            ? "Send reset code"
            : step === "otp"
              ? "Verify code"
              : "Update password"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Remembered it?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-medium text-primary hover:underline"
        >
          Back to login
        </button>
      </p>
    </form>
  );
}
