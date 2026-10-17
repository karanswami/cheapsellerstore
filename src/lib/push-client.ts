"use client";

import { isNativeApp } from "@/lib/native-app";

/*
  Browser side of web push: permission, subscribe/unsubscribe, and re-binding an
  existing subscription to whoever is signed in now. Server side is lib/web-push.ts.
*/

export type PushState =
  | "unsupported" // no Push API (old browser, Android app shell)
  | "needs-install" // iOS Safari: push only works from the Home Screen app
  | "denied"
  | "off"
  | "on";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function supported() {
  return !isNativeApp() && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js");
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) return isIos() && !isStandalone() && !isNativeApp() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  if (!res.ok) throw new Error("Could not save this device.");
}

/** Ask permission (must run from a tap) and subscribe this device. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return getPushState();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const keyRes = await fetch("/api/push/public-key");
  const publicKey = (await keyRes.json().catch(() => null))?.data?.publicKey as string | null | undefined;
  if (!publicKey) throw new Error("Push notifications are turned off for this store.");

  await registration();
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
  await saveSubscription(sub);
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return getPushState();
}

/** If this device is already subscribed, (re)attach it to the current account. Silent; never prompts. */
export async function syncPushSubscription() {
  if (!supported() || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await saveSubscription(sub).catch(() => {});
}
