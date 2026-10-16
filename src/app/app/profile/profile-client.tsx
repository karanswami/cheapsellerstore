"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Camera, Check, Loader2, Lock, Pencil, Trash2, X } from "lucide-react";
import { Panel, formatDate } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { roleLabel } from "@/lib/roles";
import type { SafeUser } from "@/types/user";

async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message ?? "Something went wrong.");
  return json.data as T;
}

const post = (url: string, body?: object) =>
  api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ProfileClient({ user }: { user: SafeUser }) {
  const router = useRouter();
  const params = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const g = params.get("google");
    if (!g) return;
    if (g === "linked") toast.success("Google account connected.");
    else if (g === "taken") toast.error("That Google account is linked to another user.");
    else toast.error("Could not connect Google. Try again.");
    router.replace("/app/profile");
  }, [params, router]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const saveName = () =>
    run("name", async () => {
      await api("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      toast.success("Name updated.");
      setEditing(false);
      router.refresh();
    });

  const removeAvatar = () =>
    run("avatar", async () => {
      await api("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl: "" }) });
      toast.success("Photo removed.");
      router.refresh();
    });

  const uploadAvatar = (file: File) =>
    run("avatar", async () => {
      const form = new FormData();
      form.append("file", file);
      await api("/api/auth/avatar", { method: "POST", body: form });
      toast.success("Photo updated.");
      router.refresh();
    });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Panel>
        <div className="flex items-center gap-4">
          <button onClick={() => fileRef.current?.click()} className="group relative shrink-0" aria-label="Change photo">
            <UserAvatar src={user.avatarUrl} seed={user.username} className="size-20" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              {busy === "avatar" ? <Loader2 className="animate-spin" /> : <Camera />}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          <div className="min-w-0 flex-1">
            {editing ? (
              <form
                className="flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim() && name.trim() !== user.name) saveName();
                  else setEditing(false);
                }}
              >
                <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-9" />
                <Button type="submit" size="icon" disabled={busy === "name"} aria-label="Save name">
                  {busy === "name" ? <Loader2 className="animate-spin" /> : <Check />}
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Cancel" onClick={() => { setName(user.name); setEditing(false); }}>
                  <X />
                </Button>
              </form>
            ) : (
              <p className="flex items-center gap-1.5 font-display text-xl font-semibold">
                <span className="truncate">{user.name}</span>
                <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground" aria-label="Edit name">
                  <Pencil className="size-3.5" />
                </button>
              </p>
            )}
            <p className="truncate text-sm text-muted-foreground">@{user.username} · {user.email}</p>
            <p className="mt-1 flex items-center gap-3 text-xs">
              <button onClick={() => fileRef.current?.click()} className="font-medium text-primary hover:underline">
                {user.avatarUrl ? "Change photo" : "Upload photo"}
              </button>
              {user.avatarUrl ? (
                <button onClick={removeAvatar} className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3" /> Use robot avatar
                </button>
              ) : (
                <span className="text-muted-foreground">Robot avatar until you upload one</span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{roleLabel(user.role)}</Badge>
              {user.emailVerified ? (
                <Badge variant="success">
                  <BadgeCheck /> Verified
                </Badge>
              ) : (
                <Badge variant="warning">Unverified</Badge>
              )}
              <Badge variant="muted">Joined {formatDate(user.createdAt)}</Badge>
            </div>
          </div>
        </div>
      </Panel>

      <GooglePanel linked={user.hasGoogle} />
      <PasswordPanel hasPassword={user.hasPassword} />
    </div>
  );
}

function GooglePanel({ linked }: { linked: boolean }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then((j) => setEnabled(Boolean(j.data?.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-muted">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.3a12 12 0 0 0 0 11l4-3.1z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
            </svg>
          </span>
          <div>
            <p className="font-medium">Google</p>
            <p className="text-sm text-muted-foreground">
              {linked ? "Connected — you can sign in with Google." : "Connect to sign in with one tap."}
            </p>
          </div>
        </div>
        {linked ? (
          <Badge variant="success">
            <Check /> Connected
          </Badge>
        ) : enabled ? (
          <Button asChild variant="secondary">
            <a href="/api/auth/google?link=1">Connect Google</a>
          </Button>
        ) : enabled === false ? (
          <Badge variant="muted">Unavailable</Badge>
        ) : null}
      </div>
    </Panel>
  );
}

function PasswordPanel({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit() {
    if (next.length < 6) return toast.error("New password must be at least 6 characters.");
    if (next !== confirm) return toast.error("Passwords do not match.");
    setBusy(true);
    try {
      const r = (await post("/api/auth/change-password", { currentPassword: current || undefined, newPassword: next })) as { message: string };
      toast.success(r.message);
      setCurrent("");
      setNext("");
      setConfirm("");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-muted text-primary">
            <Lock className="size-5" />
          </span>
          <div>
            <p className="font-medium">Password</p>
            <p className="text-sm text-muted-foreground">
              {hasPassword ? "Change your password any time." : "Add a password so you can also sign in with email."}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <div>
            <DialogTitle>{hasPassword ? "Change password" : "Set a password"}</DialogTitle>
            <DialogDescription>Use at least 6 characters.</DialogDescription>
          </div>
      <div className="space-y-4">
        {hasPassword ? (
          <Field label="Current password">
            <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
        ) : null}
        <Field label="New password">
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button onClick={submit} disabled={busy || !next}>
          {busy ? <Loader2 className="animate-spin" /> : null} {hasPassword ? "Update password" : "Set password"}
        </Button>
      </div>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
