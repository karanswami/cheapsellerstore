"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, MailCheck } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/app-kit";

async function post(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? "Something went wrong.");
  return json.data as { message?: string };
}

function Frame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-x-hidden bg-background px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/15 blur-[110px]" />
      <div className="anim-page-in w-full max-w-[26rem]">
        <Link href="/login" className="tap mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 mb-5 text-sm text-muted-foreground">{subtitle}</p>
        <Surface className="p-5 sm:p-6">{children}</Surface>
      </div>
    </main>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame title="Forgot password?" subtitle="Enter your account email and we will send you a reset link.">
      {sent ? (
        <div className="space-y-3 text-center">
          <MailCheck className="mx-auto size-10 text-primary" />
          <p className="text-sm font-semibold">Check your inbox</p>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-semibold text-foreground">{email}</span>, a reset link is on its way. It expires in 30 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground/70" />
            <Input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email"
              className="h-12 rounded-2xl border-white/[0.08] bg-background/60 pl-11 text-[15px]"
            />
          </div>
          <Button type="submit" size="lg" disabled={busy || !email.trim()} className="h-12 w-full rounded-2xl font-bold">
            {busy ? <Loader2 className="animate-spin" /> : <KeyRound />} Send reset link
          </Button>
        </form>
      )}
    </Frame>
  );
}

export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const invalid = !email || !/^[a-f0-9]{64}$/.test(token);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    setBusy(true);
    try {
      await post("/api/auth/reset-password", { email, token, password });
      toast.success("Password updated. You can sign in now.");
      router.replace("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame title="Choose a new password" subtitle={invalid ? "This reset link is not valid." : email}>
      {invalid ? (
        <Button asChild size="lg" className="h-12 w-full rounded-2xl font-bold">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground/70" />
            <Input
              type={show ? "text" : "password"}
              autoFocus
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              aria-label="New password"
              className="h-12 rounded-2xl border-white/[0.08] bg-background/60 pl-11 pr-12 text-[15px]"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="tap absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
          <Button type="submit" size="lg" disabled={busy || !password} className="h-12 w-full rounded-2xl font-bold">
            {busy ? <Loader2 className="animate-spin" /> : null} Update password
          </Button>
        </form>
      )}
    </Frame>
  );
}
