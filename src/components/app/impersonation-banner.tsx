"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner() {
  const [username, setUsername] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/impersonation", {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: {
            impersonating: boolean;
            targetUsername?: string;
          };
        };
        if (cancelled) return;
        if (json.data?.impersonating && json.data.targetUsername) {
          setUsername(json.data.targetUsername);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!username) return null;

  async function exit() {
    setBusy(true);
    try {
      await fetch("/api/admin/impersonation", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/admin/users";
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm backdrop-blur-sm">
      <p className="min-w-0 truncate font-medium">
        Viewing as <span className="font-semibold">@{username}</span>
      </p>
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => void exit()}>
        Return to Admin
      </Button>
    </div>
  );
}
