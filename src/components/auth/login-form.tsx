"use client";

import { useEffect, useState } from "react";
import { AuthField, authInputClassName } from "@/components/auth/auth-field";
import { GoogleSignInButton } from "@/components/auth/google-button";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import type { SafeUser } from "@/types/user";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { loginSchema } from "@/lib/validations";
import { toast } from "@/lib/toast";

type LoginFormProps = {
  onSuccess: (user?: SafeUser | null) => void;
  onRequires2fa: () => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
};

export function LoginForm({
  onSuccess,
  onRequires2fa,
  onSwitchToRegister,
  onForgotPassword,
}: LoginFormProps) {
  const { setUser } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const canSubmit =
    !pending &&
    loginSchema.safeParse({ identifier, password }).success;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      setNextPath(next);
    }
    const ref = params.get("ref") || params.get("referral");
    if (ref) {
      setReferralCode(ref.trim());
    }
    const googleError = params.get("google_error");
    if (!googleError) return;
    const messages: Record<string, string> = {
      denied: "Google sign-in was cancelled.",
      invalid_state: "Google sign-in expired. Try again.",
      token: "Could not complete Google sign-in.",
      unverified: "Your Google email must be verified.",
      email_taken: "That email is already linked to another Google account.",
      banned: "This account has been suspended.",
      not_configured: "Google sign-in is not configured.",
      maintenance:
        "The store is temporarily unavailable. Please try again later.",
      failed: "Google sign-in failed. Try again.",
    };
    const message = messages[googleError] ?? messages.failed!;
    setError(message);
    toast.error(message);
    params.delete("google_error");
    const qs = params.toString();
    const clean = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState({}, "", clean);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier, password }),
      });
      const json = (await res.json()) as {
        data?: {
          requires2fa?: boolean;
          user?: SafeUser;
          redirectTo?: string;
          message?: string;
        };
        error?: { message: string; code?: string };
      };
      if (!res.ok) {
        const message = json.error?.message ?? "Login failed.";
        setError(message);
        toast.error(message);
        return;
      }
      if (json.data?.requires2fa) {
        toast.message("Two-factor required", {
          description: json.data.message,
        });
        onRequires2fa();
        return;
      }
      const loggedIn = json.data?.user ?? null;
      if (loggedIn) setUser(loggedIn);
      if (remember) {
        try {
          localStorage.setItem("drip-auth-remember", "1");
        } catch {
          /* ignore */
        }
      }
      toast.success("Welcome back", {
        description: loggedIn
          ? `Signed in as ${loggedIn.username}`
          : undefined,
      });
      onSuccess(loggedIn);
    } catch {
      const message = "Network error. Try again.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <GoogleSignInButton nextPath={nextPath} referralCode={referralCode} />

      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField id="identifier" label="Email or username" icon={Mail}>
          <input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            placeholder="you@email.com or username"
            className={authInputClassName}
            required
          />
        </AuthField>

        <AuthField id="password" label="Password" icon={Lock}>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
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

        <div className="flex items-center justify-between gap-3 text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-3.5 rounded border-border accent-primary"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="font-medium text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={!canSubmit}
          className="w-full rounded-xl shadow-[0_0_20px_-6px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          New here?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-medium text-primary hover:underline"
          >
            Create account
          </button>
        </p>
      </form>
    </div>
  );
}
