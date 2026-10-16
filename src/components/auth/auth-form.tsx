"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AtSign, Eye, EyeOff, Loader2, Lock, Mail, User, UserRound } from "lucide-react";
import { toast } from "sonner";
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
  { name: "identifier", label: "Username or email", autoComplete: "username", required: true, icon: UserRound },
  { name: "password", label: "Password", type: "password", autoComplete: "current-password", required: true, icon: Lock },
];

const REGISTER_FIELDS: Field[] = [
  { name: "name", label: "Name", autoComplete: "name", required: true, icon: User },
  { name: "username", label: "Username", autoComplete: "username", required: true, icon: AtSign },
  { name: "email", label: "Email", type: "email", autoComplete: "email", required: true, icon: Mail },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", required: true, icon: Lock },
];

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
  const [needs2fa, setNeeds2fa] = useState(false);
  const [errKey, setErrKey] = useState(0);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const fields = mode === "login" ? LOGIN_FIELDS : REGISTER_FIELDS;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Something went wrong.");
        setErrKey((k) => k + 1);
        return;
      }
      if (json.data?.requires2fa) {
        setNeeds2fa(true);
        toast.info(json.data.message);
        return;
      }
      router.replace(safeNext(next) ?? json.data?.redirectTo ?? "/app");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setErrKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  if (needs2fa) {
    return (
      <p className="rounded-[14px] border bg-card p-4 text-sm text-muted-foreground">
        Two-factor sign-in is enabled on this account. Enter the code from your authenticator app to continue.
      </p>
    );
  }

  const strength = passwordStrength(password);
  const delay = (i: number) => ({ "--d": `${120 + i * 70}ms` }) as React.CSSProperties;

  return (
    <div className="space-y-5">
      {googleEnabled ? (
        <>
          <a
            href={referralCode ? `/api/auth/google?ref=${encodeURIComponent(referralCode)}` : "/api/auth/google"}
            style={delay(0)}
            className="anim-fade-up flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border bg-background/60 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent"
          >
            <GoogleMark /> Continue with Google
          </a>
          <div style={delay(1)} className="anim-fade-up flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or continue with email <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f, i) => {
          const Icon = f.icon;
          const isPw = f.type === "password";
          return (
            <div key={f.name} style={delay(i + 2)} className={`anim-fade-up ${mode === "register" && (f.name === "name" || f.name === "username") ? "" : "sm:col-span-2"}`}>
              <label htmlFor={`${mode}-${f.name}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {f.label}
              </label>
              <div className="group relative">
                <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id={`${mode}-${f.name}`}
                  name={f.name}
                  type={isPw && showPw ? "text" : f.type}
                  placeholder={f.placeholder}
                  autoComplete={f.autoComplete}
                  required={f.required}
                  aria-invalid={error ? true : undefined}
                  onChange={isPw && mode === "register" ? (e) => setPassword(e.target.value) : undefined}
                  className={`h-12 rounded-xl bg-background/60 pl-11 ${isPw ? "pr-12" : ""}`}
                />
                {isPw ? (
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                ) : null}
              </div>
              {isPw && mode === "register" && password ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <span
                        key={n}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${n <= strength.score ? strength.color : "bg-border"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{strength.label}</span>
                </div>
              ) : null}
            </div>
          );
        })}
        </div>
        {mode === "register" && referralCode ? <input type="hidden" name="referralCode" value={referralCode} /> : null}

        {error ? (
          <p key={errKey} role="alert" className="anim-shake rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div style={delay(fields.length + 2)} className="anim-fade-up">
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="btn-sheen group glow-primary h-12 w-full overflow-hidden rounded-xl text-base"
          >
            {loading ? <Loader2 className="animate-spin" /> : null}
            {mode === "login" ? "Sign in" : "Create account"}
            {!loading ? <ArrowRight className="transition-transform group-hover:translate-x-1" /> : null}
          </Button>
        </div>
        {mode === "register" ? (
          <p className="text-center text-xs text-muted-foreground">
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
  const colors = ["bg-border", "bg-destructive", "bg-warning", "bg-primary", "bg-success"];
  return { score, label: labels[score], color: colors[score] };
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
