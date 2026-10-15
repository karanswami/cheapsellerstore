"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWebPush } from "@/hooks/use-web-push";
import { BellRing, CheckCircle2, Loader2, Send, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type WebPushStats = {
  enabled: boolean;
  hasPublicKey: boolean;
  totalSubs: number;
  userSubs: number;
  guestSubs: number;
};

export function WebPushSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { supported, permission, isSubscribed, subscribe } = useWebPush();
  const [stats, setStats] = useState<WebPushStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testForm, setTestForm] = useState({
    title: "🔔 DRIP Store — Test Notification",
    body: "Web Push notifications are working perfectly on this device!",
    url: "/app",
  });

  async function loadStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/push/broadcast");
      if (res.ok) {
        const json = (await res.json()) as { data?: WebPushStats };
        if (json.data) setStats(json.data);
      }
    } catch {
      // Ignore network failures
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      void loadStats();
    }
  }, [open]);

  async function handleSendTestBroadcast() {
    if (!testForm.title.trim() || !testForm.body.trim()) {
      toast.error("Please enter both a title and message.");
      return;
    }

    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: testForm.title.trim(),
          body: testForm.body.trim(),
          url: testForm.url.trim() || "/app",
        }),
      });

      const json = (await res.json()) as {
        data?: { sent?: number; failed?: number; totalSubs?: number };
        error?: { message?: string };
      };

      if (!res.ok) {
        toast.error(json.error?.message || "Failed to send test push notification.");
        return;
      }

      const sent = json.data?.sent ?? 0;
      const total = json.data?.totalSubs ?? 0;

      if (total === 0) {
        toast.warning("No subscribed devices found.", {
          description: "Enable notifications in your profile or click 'Subscribe This Device' below to test.",
        });
      } else {
        toast.success(`Test push dispatched to ${sent} device(s)!`);
      }
      void loadStats();
    } catch {
      toast.error("Network error while sending test notification.");
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,720px)] max-w-lg gap-0 overflow-hidden p-0">
        <div className="border-b border-border bg-muted/40 px-5 py-4">
          <DialogHeader className="gap-1">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <BellRing className="size-4" />
            </div>
            <DialogTitle className="text-lg">Web Push notifications</DialogTitle>
            <DialogDescription>
              Native browser push notifications & live device delivery testing.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Subscription Stats Card */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-medium text-foreground">Active Push Devices</h4>
                <p className="text-xs text-muted-foreground">
                  Subscribed browsers receiving real-time alerts
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Smartphone className="size-3.5" />
                <span>{stats?.totalSubs ?? (loading ? "..." : 0)} devices</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/50 p-2.5">
                <span className="text-muted-foreground">Logged-in Users:</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {stats?.userSubs ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5">
                <span className="text-muted-foreground">Guest Visitors:</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {stats?.guestSubs ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Current Device Status */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">This Browser Device</p>
              <p className="text-xs text-muted-foreground">
                {!supported
                  ? "Push not supported in this browser"
                  : permission === "denied"
                    ? "Notifications blocked in browser permissions"
                    : isSubscribed
                      ? "Subscribed and ready to receive test alerts"
                      : "Not subscribed yet on this browser"}
              </p>
            </div>
            {supported && !isSubscribed && permission !== "denied" && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => void subscribe()}>
                Subscribe Device
              </Button>
            )}
            {isSubscribed && (
              <div className="flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle2 className="size-4" />
                <span>Active</span>
              </div>
            )}
          </div>

          {/* Test Notification Form */}
          <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Send Test Push Alert</h4>
              <span className="text-[11px] text-muted-foreground">Dispatches instantly</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-title" className="text-xs">Notification Title</Label>
              <Input
                id="test-title"
                value={testForm.title}
                onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                placeholder="Alert title..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-body" className="text-xs">Notification Body</Label>
              <Input
                id="test-body"
                value={testForm.body}
                onChange={(e) => setTestForm({ ...testForm, body: e.target.value })}
                placeholder="Alert message content..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-url" className="text-xs">Click Destination URL</Label>
              <Input
                id="test-url"
                value={testForm.url}
                onChange={(e) => setTestForm({ ...testForm, url: e.target.value })}
                placeholder="/app"
                className="h-9 text-xs"
              />
            </div>

            <Button
              type="button"
              className="mt-1 w-full gap-2 text-xs"
              disabled={sendingTest}
              onClick={handleSendTestBroadcast}
            >
              {sendingTest ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Dispatching push alert...</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>Send Test Push Notification</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
