"use client";

import { useState } from "react";
import { AuthField, authInputClassName } from "@/components/auth/auth-field";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import type { SafeUser } from "@/types/user";
import { ShieldCheck } from "lucide-react";
import { toast } from "@/lib/toast";

type TwoFactorFormProps = {
  onSuccess: (user?: SafeUser | null) => void;
  onBack: () => void;
};

export function TwoFactorForm({ onSuccess, onBack }: TwoFactorFormProps) {
  const { setUser } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const json = (await res.json()) as {
        data?: { user: SafeUser };
        error?: { message: string };
      };
      if (!res.ok) {
        const message = json.error?.message ?? "Verification failed.";
        setError(message);
        toast.error(message);
        return;
      }
      const loggedIn = json.data?.user ?? null;
      if (loggedIn) setUser(loggedIn);
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
    <form onSubmit={onSubmit} className="space-y-4">
      <AuthField id="totp-code" label="Authenticator code" icon={ShieldCheck}>
        <input
          id="totp-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="one-time-code"
          inputMode="numeric"
          placeholder="6-digit or backup code"
          className={authInputClassName}
          required
          autoFocus
        />
      </AuthField>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Verifying…" : "Verify and continue"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-primary hover:underline"
        >
          Back to login
        </button>
      </p>
    </form>
  );
}
