"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "Notification" in window &&
      "PushManager" in window
    ) {
      setSupported(true);
      setPermission(Notification.permission);

      void navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const sub = await reg.pushManager.getSubscription();
          const hasSub = Boolean(sub);
          setIsSubscribed(hasSub);

          // If already granted & subscribed, sync to current user account
          if (hasSub && sub && Notification.permission === "granted") {
            const subJson = sub.toJSON();
            if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
              void fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  endpoint: subJson.endpoint,
                  keys: {
                    p256dh: subJson.keys.p256dh,
                    auth: subJson.keys.auth,
                  },
                }),
              }).catch(() => undefined);
            }
          }
        } catch {
          setIsSubscribed(false);
        } finally {
          setLoading(false);
        }
      });
    } else {
      setSupported(false);
      setLoading(false);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) {
      toast.error("Push notifications are not supported by your browser.");
      return false;
    }

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Notification permission was denied or dismissed.");
        return false;
      }

      const res = await fetch("/api/push/public-key");
      const json = (await res.json()) as { data?: { publicKey?: string | null } };
      const publicKey = json.data?.publicKey;

      if (!publicKey) {
        toast.error("Push notifications are not active on server.");
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const convertedKey = urlBase64ToUint8Array(publicKey);

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      const subJson = sub.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error("Invalid browser subscription structure.");
      }

      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to register subscription on server.");
      }

      setIsSubscribed(true);
      toast.success("Push notifications enabled!", {
        description: "You'll receive alerts for orders, balance, and news.",
      });
      return true;
    } catch (err) {
      console.warn("[web-push] Subscribe error:", err);
      toast.error("Could not enable push notifications. Try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => undefined);
      }
      setIsSubscribed(false);
      toast.success("Push notifications turned off.");
      return true;
    } catch (err) {
      console.warn("[web-push] Unsubscribe error:", err);
      toast.error("Failed to unsubscribe.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    supported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  };
}
