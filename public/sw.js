/* Drip PWA — installability + offline document fallback */
const CACHE = "drip-pwa-v2";
const PRECACHE = [
  "/offline.html",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API / auth / uploads / APK downloads — network only
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.startsWith("/downloads/") ||
    url.pathname.startsWith("/_next/webpack")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response.ok &&
          (request.destination === "document" ||
            url.pathname.startsWith("/pwa/") ||
            url.pathname === "/offline.html")
        ) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (
          request.destination === "document" ||
          request.mode === "navigate"
        ) {
          const offline = await caches.match("/offline.html");
          if (offline) return offline;
        }
        return Response.error();
      }),
  );
});

/* Web Push Notifications */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {
    title: "DRIP Store",
    body: "You have a new update.",
    icon: "/pwa/icon-192.png",
    badge: "/pwa/icon-192.png",
    data: { url: "/" },
  };

  try {
    const data = event.data.json();
    payload = {
      title: data.title || payload.title,
      body: data.body || payload.body,
      icon: data.icon || payload.icon,
      badge: data.badge || payload.badge,
      data: data.data || { url: data.url || "/" },
      tag: data.tag || "drip-notification",
    };
  } catch {
    payload.body = event.data.text() || payload.body;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: payload.data,
      tag: payload.tag,
      vibrate: [100, 50, 100],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "/";
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            if ("navigate" in client) {
              void client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});

