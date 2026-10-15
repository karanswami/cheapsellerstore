"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function useAdminFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url, { credentials: "include" });
      const json = (await res.json()) as { data?: T; error?: { message: string } };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to load");
        return;
      }
      setData(json.data ?? null);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, reload };
}

export async function adminMutate(
  url: string,
  init: RequestInit,
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const json = (await res.json()) as { data?: unknown; error?: { message: string } };
    if (!res.ok) return { ok: false, message: json.error?.message ?? "Request failed" };
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, message: "Network error" };
  }
}
