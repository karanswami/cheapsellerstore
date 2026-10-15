"use client";

import { useEffect, useState } from "react";
import { AuthField, authInputClassName } from "@/components/auth/auth-field";
import { GoogleSignInButton } from "@/components/auth/google-button";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import type { SafeUser } from "@/types/user";
import { normalizeReferralCode } from "@/lib/referral-utils";
import {
  AtSign,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Mail,
  UserRound,
} from "lucide-react";
import { registerSchema } from "@/lib/validations";
import { toast } from "@/lib/toast";

type RegisterFormProps = {
  onSuccess: (user?: SafeUser | null) => void;
  onSwitchToLogin: () => void;
  /** Prefill from invite URL (`?ref=`). */
  initialReferralCode?: string;
  /** When true (maintenance mode), block create-account submit. */
  maintenanceLocked?: boolean;
};

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
  initialReferralCode = "",
  maintenanceLocked = false,
}: RegisterFormProps) {
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(
    normalizeReferralCode(initialReferralCode),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [referralHint, setReferralHint] = useState<string | null>(null);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  const cleanReferral = normalizeReferralCode(referralCode);
  const fieldsValid = registerSchema.safeParse({
    name,
    username,
    email,
    password,
    referralCode: cleanReferral || undefined,
  }).success;
  const referralOk =
    !cleanReferral || (referralValid === true && !referralChecking);
  const canSubmit =
    !pending && !maintenanceLocked && fieldsValid && agreed && referralOk;

  useEffect(() => {
    const next = normalizeReferralCode(initialReferralCode);
    if (next) setReferralCode(next);
  }, [initialReferralCode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      setNextPath(next);
    }
  }, []);

  useEffect(() => {
    const code = normalizeReferralCode(referralCode);
    if (!code) {
      setReferralHint(null);
      setReferralValid(null);
      setReferralChecking(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setReferralChecking(true);
      try {
        const res = await fetch(
          `/api/referrals/check?code=${encodeURIComponent(code)}`,
          { credentials: "include" },
        );
        const json = (await res.json()) as {
          data?: { valid: boolean; message?: string; username?: string };
          error?: { message: string };
        };
        if (cancelled) return;
        if (!res.ok) {
          setReferralValid(false);
          setReferralHint(json.error?.message ?? "Invalid referral code.");
          return;
        }
        setReferralValid(json.data?.valid ?? false);
        setReferralHint(
          json.data?.valid
            ? (json.data.message ?? "Valid referral code.")
            : (json.data?.message ?? "Referral code not found."),
        );
      } catch {
        if (!cancelled) {
          setReferralValid(null);
          setReferralHint(null);
        }
      } finally {
        if (!cancelled) setReferralChecking(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [referralCode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (maintenanceLocked) {
      const message =
        "The store is under maintenance. New accounts can't be created right now.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!canSubmit) return;
    setError(null);
    if (!agreed) {
      const message = "Please agree to the Terms of Service & Privacy Policy.";
      setError(message);
      toast.error(message);
      return;
    }
    const cleanRef = normalizeReferralCode(referralCode);
    if (cleanRef && referralValid === false) {
      const message = "Enter a valid referral code or leave it blank.";
      setError(message);
      toast.error(message);
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          username,
          email,
          password,
          referralCode: cleanRef || undefined,
        }),
      });
      const json = (await res.json()) as {
        data?: { user: SafeUser };
        error?: { message: string };
      };
      if (!res.ok) {
        const message = json.error?.message ?? "Registration failed.";
        setError(message);
        toast.error(message);
        return;
      }
      if (json.data?.user) setUser(json.data.user);
      toast.success("Account created", {
        description: cleanRef
          ? "You're signed in and linked to a referrer."
          : "You're signed in and ready to shop.",
      });
      onSuccess(json.data?.user ?? null);
    } catch {
      const message = "Network error. Try again.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3.5">
      <GoogleSignInButton
        nextPath={nextPath}
        referralCode={cleanReferral}
        label="Sign up with Google"
      />

      <form onSubmit={onSubmit} className="space-y-3.5">
        <AuthField id="name" label="Full name" icon={UserRound}>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Your name"
            className={authInputClassName}
            required
          />
        </AuthField>

        <AuthField id="username" label="Username" icon={AtSign}>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="coolplayer"
            className={authInputClassName}
            required
          />
        </AuthField>

        <AuthField id="email" label="Email" icon={Mail}>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@email.com"
            className={authInputClassName}
            required
          />
        </AuthField>

        <AuthField id="reg-password" label="Password" icon={Lock}>
          <input
            id="reg-password"
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

        <AuthField
          id="referral-code"
          label="Referral code (optional)"
          icon={Gift}
          hint={
            referralChecking
              ? "Checking code…"
              : (referralHint ?? "Have an invite? Enter it here.")
          }
        >
          <input
            id="referral-code"
            value={referralCode}
            onChange={(e) =>
              setReferralCode(normalizeReferralCode(e.target.value))
            }
            autoComplete="off"
            placeholder="Optional"
            className={authInputClassName}
            maxLength={64}
            spellCheck={false}
          />
        </AuthField>

        <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-3.5 shrink-0 rounded border-border accent-primary"
          />
          <span>
            I agree to the{" "}
            <span className="font-medium text-foreground">Terms of Service</span>{" "}
            &{" "}
            <span className="font-medium text-foreground">Privacy Policy</span>
          </span>
        </label>

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
          {maintenanceLocked
            ? "Registration paused"
            : pending
              ? "Creating…"
              : "Create account"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-primary hover:underline"
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
}
