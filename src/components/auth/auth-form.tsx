"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AtSign, Eye, EyeOff, Loader2, Lock, Mail, User, UserRound } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Field = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  icon: ComponentType<{ className?: string }>;
};

const LOGIN_FIELDS: Field[] = [
  { name: "identifier", label: "Username or email", autoComplete: "username", placeholder: "Enter username or email", required: true, icon: UserRound },
  { name: "password", label: "Password", type: "password", autoComplete: "current-password", placeholder: "Enter your password", required: true, icon: Lock },
];

const REGISTER_FIELDS: Field[] = [
  { name: "name", label: "Name", autoComplete: "name", placeholder: "Your full name", required: true, icon: User },
  { name: "username", label: "Username", autoComplete: "username", placeholder: "Choose a username", required: true, icon: AtSign },
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com", required: true, icon: Mail },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", placeholder: "Create a password (min 6 characters)", required: true, icon: Lock },
];

function validate(mode: "login" | "register", body: Record<string, FormDataEntryValue>) {
  const v = (k: string) => String(body[k] ?? "").trim();
  if (mode === "login") {
    if (!v("identifier")) return "Enter your username or email.";
    if (!body.password) return "Enter your password.";
    return null;
  }
  if (!v("name")) return "Name is required.";
  if (v("username").length < 3) return "Username must be at least 3 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(v("username"))) return "Username: letters, numbers, underscore only.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) return "Enter a valid email address.";
  if (String(body.password ?? "").length < 6) return "Password must be at least 6 characters.";
  return null;
}

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function AuthForm({
  mode,
  next,
  googleEnabled,
  referralCode,
}: {
  mode: "login" | "register";
  next?: string;
  googleEnabled: boolean;
  referralCode?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const fields = mode === "login" ? LOGIN_FIELDS : REGISTER_FIELDS;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const invalid = validate(mode, body);
    if (invalid) {
      setError(invalid);
      toast.error(invalid);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = json?.error?.message ?? "Something went wrong.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success(mode === "login" ? "Signed in successfully. Welcome back!" : "Account created. Welcome!");
      router.replace(safeNext(next) ?? json.data?.redirectTo ?? "/app");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const strength = passwordStrength(password);

  return (
    <div className="space-y-5">
      {googleEnabled ? (
        <>
          <a
            href={referralCode ? `/api/auth/google?ref=${encodeURIComponent(referralCode)}` : "/api/auth/google"}
            className="tap flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-white text-sm font-bold text-[#0b1020] shadow-lg shadow-black/25 transition-shadow hover:shadow-xl"
          >
            <GoogleMark /> Continue with Google
          </a>
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
            <span className="h-px flex-1 bg-white/[0.08]" /> or with email <span className="h-px flex-1 bg-white/[0.08]" />
          </div>
        </>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {fields.map((f) => {
          const Icon = f.icon;
          const isPw = f.type === "password";
          return (
            <div key={f.name}>
              <label htmlFor={`${mode}-${f.name}`} className="mb-1.5 block px-0.5 text-xs font-semibold text-muted-foreground">
                {f.label}
              </label>
              <div className="group relative">
                <Icon className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground/70 transition-colors group-focus-within:text-primary" />
                <Input
                  id={`${mode}-${f.name}`}
                  name={f.name}
                  type={isPw && showPw ? "text" : f.type}
                  placeholder={f.placeholder}
                  autoComplete={f.autoComplete}
                  autoCapitalize={f.name === "name" ? "words" : "none"}
                  autoCorrect="off"
                  spellCheck={false}
                  required={f.required}
                  aria-invalid={error ? true : undefined}
                  onChange={(e) => {
                    if (error) setError(null);
                    if (isPw && mode === "register") setPassword(e.target.value);
                  }}
                  className={`h-12 rounded-2xl border-white/[0.08] bg-background/60 pl-11 text-[15px] ${isPw ? "pr-12" : ""}`}
                />
                {isPw ? (
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="tap absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                ) : null}
              </div>
              {isPw && mode === "register" && password ? (
                <div className="mt-2 flex items-center gap-2 px-0.5">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <span
                        key={n}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${n <= strength.score ? strength.color : "bg-white/[0.08]"}`}
                      />
                    ))}
                  </div>
                  <span className="w-16 text-right text-xs font-semibold text-muted-foreground">{strength.label}</span>
                </div>
              ) : null}
            </div>
          );
        })}
        {mode === "login" ? (
          <div className="-mt-1 text-right">
            <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        ) : null}
        {mode === "register" && referralCode ? <input type="hidden" name="referralCode" value={referralCode} /> : null}

        {error ? (
          <p role="alert" key={error} className="anim-shake rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="tap btn-sheen group glow-primary h-13 w-full overflow-hidden rounded-2xl text-base font-bold"
        >
          {loading ? <Loader2 className="animate-spin" /> : null}
          {loading ? (mode === "login" ? "Signing in…" : "Creating account…") : mode === "login" ? "Sign in" : "Create account"}
          {!loading ? <ArrowRight className="transition-transform group-hover:translate-x-1" /> : null}
        </Button>
        {mode === "register" ? (
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            By creating an account you agree to our terms of service and privacy policy.
          </p>
        ) : null}
      </form>
    </div>
  );
}

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score++;
  const labels = ["Too short", "Weak", "Okay", "Good", "Strong"];
  const colors = ["bg-white/[0.08]", "bg-destructive", "bg-warning", "bg-primary", "bg-success"];
  return { score, label: labels[score], color: colors[score] };
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
