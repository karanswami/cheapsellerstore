"use client";

import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import { HubPanelCard } from "@/components/app/hub/hub-list-row";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SafeUser } from "@/types/user";
import { Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

type Props = {
  user: SafeUser;
  minBalanceUsd: number;
};

export function BecomeResellerForm({ user, minBalanceUsd }: Props) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [pending, setPending] = useState(false);
  const draftKey = `drip_seller_apply_draft_${user.id}`;
  const emptyForm = {
    fullName: user.name,
    phone: "",
    country: "",
    facebookUrl: "",
    telegram: "",
    youtubeUrl: "",
    telegramChannelUrl: "",
    websiteUrl: "",
    followerCount: "",
    experience: "",
    sellingPlatform: "",
    reason: "",
  };
  const [form, setForm] = useState(emptyForm);
  const submittedRef = useRef(false);

  // Restore an in-progress draft so a remount / refresh never wipes the form.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<typeof emptyForm>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore after hydration
        setForm((prev) => ({ ...prev, ...saved }));
      }
    } catch {
      /* ignore corrupt draft */
    }
  }, [draftKey]);

  useEffect(() => {
    if (submittedRef.current) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(form));
    } catch {
      /* storage unavailable */
    }
  }, [form, draftKey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const trimmed = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v.trim()])
      ) as typeof form;
      const res = await fetch("/api/reseller-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...trimmed,
          youtubeUrl: trimmed.youtubeUrl || undefined,
          telegramChannelUrl: trimmed.telegramChannelUrl || undefined,
          websiteUrl: trimmed.websiteUrl || undefined,
          experience: trimmed.experience || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { request: { autoApproved?: boolean } };
        error?: { message: string };
      } | null;
      if (!res.ok || !json?.data) {
        toast.error(
          json?.error?.message ??
            "Could not submit your application. Please try again."
        );
        return;
      }
      submittedRef.current = true;
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
      if (json.data.request.autoApproved) {
        toast.success("Application auto-approved — you are now a Seller");
        await refresh();
        router.push("/app");
      } else {
        toast.success("Application submitted for review");
        router.push("/app/profile");
      }
      router.refresh();
    } catch {
      toast.error("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <HubPageShell maxWidth="md">
      <HubHeaderBar
        icon={<Store />}
        title="Become a Seller"
        description="Fill out the form below to apply. Your application will be reviewed by our admin team (or auto-approved if enabled)."
        stats={[
          {
            label: "Min balance",
            value: `$${minBalanceUsd}`,
            tone: "accent",
          },
        ]}
        statsLabel="Requirements"
      />

      <HubPanelCard>
        <Card variant="feature" className="border-0 bg-transparent shadow-none">
          <CardContent className="pt-5">
            <form className="space-y-5" onSubmit={(e) => void submit(e)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name *">
                  <Input
                    required
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Username">
                  <Input value={`@${user.username}`} disabled />
                </Field>
                <Field label="Email">
                  <Input value={user.email} disabled />
                </Field>
                <Field label="Phone *">
                  <Input
                    required
                    type="tel"
                    minLength={6}
                    maxLength={40}
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </Field>
                <Field label="Country *">
                  <Input
                    required
                    value={form.country}
                    onChange={(e) =>
                      setForm({ ...form, country: e.target.value })
                    }
                  />
                </Field>
                <Field label="Facebook profile link *">
                  <Input
                    required
                    type="url"
                    placeholder="https://"
                    value={form.facebookUrl}
                    onChange={(e) =>
                      setForm({ ...form, facebookUrl: e.target.value })
                    }
                  />
                </Field>
                <Field label="Telegram username *">
                  <Input
                    required
                    value={form.telegram}
                    onChange={(e) =>
                      setForm({ ...form, telegram: e.target.value })
                    }
                  />
                </Field>
                <Field label="YouTube channel (optional)">
                  <Input
                    type="url"
                    placeholder="https://"
                    value={form.youtubeUrl}
                    onChange={(e) =>
                      setForm({ ...form, youtubeUrl: e.target.value })
                    }
                  />
                </Field>
                <Field label="Telegram channel/group (optional)">
                  <Input
                    type="url"
                    placeholder="https://"
                    value={form.telegramChannelUrl}
                    onChange={(e) =>
                      setForm({ ...form, telegramChannelUrl: e.target.value })
                    }
                  />
                </Field>
                <Field label="Website (optional)">
                  <Input
                    type="url"
                    placeholder="https://"
                    value={form.websiteUrl}
                    onChange={(e) =>
                      setForm({ ...form, websiteUrl: e.target.value })
                    }
                  />
                </Field>
                <Field label="Members / followers *">
                  <Input
                    required
                    value={form.followerCount}
                    onChange={(e) =>
                      setForm({ ...form, followerCount: e.target.value })
                    }
                  />
                </Field>
                <Field label="How long selling digital products?">
                  <Input
                    value={form.experience}
                    onChange={(e) =>
                      setForm({ ...form, experience: e.target.value })
                    }
                  />
                </Field>
                <Field label="Selling platform *">
                  <Input
                    required
                    value={form.sellingPlatform}
                    onChange={(e) =>
                      setForm({ ...form, sellingPlatform: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="Why do you want to become our seller? *">
                <Textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </Field>
              <div className="pt-1">
                <Card variant="action" size="sm" className="p-4">
                  <Button
                    type="submit"
                    disabled={pending}
                    className="w-full sm:w-auto"
                  >
                    {pending ? "Submitting…" : "Submit application"}
                  </Button>
                </Card>
              </div>
            </form>
          </CardContent>
        </Card>
      </HubPanelCard>
    </HubPageShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
