import { prisma } from "@/lib/prisma";

/** Security-relevant actions shown on the profile's "Recent activity" list. */
const SECURITY_ACTIONS = [
  "LOGIN_SUCCESS",
  "GOOGLE_LOGIN",
  "LOGIN_FAILED",
  "PASSWORD_CHANGE",
  "PASSWORD_RESET",
];

export type SecurityEvent = {
  id: string;
  action: string;
  success: boolean;
  method: string | null;
  device: "mobile" | "tablet" | "desktop" | "app";
  /** "Chrome on Android" etc. */
  client: string;
  ip: string | null;
  /** Same UA + IP as the request rendering the page. */
  current: boolean;
  createdAt: string;
};

/** Small UA sniff: good enough to say "Chrome on Windows", not for analytics. */
export function describeUserAgent(ua: string | null): { device: SecurityEvent["device"]; client: string } {
  if (!ua) return { device: "desktop", client: "Unknown device" };
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPod/i.test(ua)
      ? "iPhone"
      : /iPad/i.test(ua)
        ? "iPad"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/i.test(ua)
            ? "macOS"
            : /CrOS/i.test(ua)
              ? "ChromeOS"
              : /Linux/i.test(ua)
                ? "Linux"
                : "Unknown OS";
  // Capacitor Android shell is a WebView ("; wv)").
  if (/; wv\)/.test(ua)) return { device: "app", client: `${os} app` };
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /Chrome|CriOS/.test(ua)
            ? "Chrome"
            : /Safari/.test(ua)
              ? "Safari"
              : "Browser";
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  return { device, client: `${browser} on ${os}` };
}

/** Last sign-ins and security changes (activity logs are kept 7 days). */
export async function getRecentSecurityEvents(
  userId: string,
  current: { ip: string | null; userAgent: string | null },
  limit = 8,
): Promise<SecurityEvent[]> {
  const rows = await prisma.activityLog
    .findMany({
      where: { userId, action: { in: SECURITY_ACTIONS } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, action: true, success: true, metadata: true, ip: true, userAgent: true, createdAt: true },
    })
    .catch(() => []);

  let currentMarked = false;
  return rows.map((r) => {
    const meta = (r.metadata ?? {}) as { method?: unknown };
    const isSignIn = r.action === "LOGIN_SUCCESS" || r.action === "GOOGLE_LOGIN";
    // Only the newest matching sign-in gets the "This device" tag.
    const current_ =
      isSignIn && !currentMarked && r.userAgent != null && r.userAgent === current.userAgent?.slice(0, 400) && r.ip === current.ip;
    if (current_) currentMarked = true;
    return {
      id: r.id,
      action: r.action,
      success: r.success,
      method: typeof meta.method === "string" ? meta.method : r.action === "GOOGLE_LOGIN" ? "google" : null,
      ...describeUserAgent(r.userAgent),
      ip: r.ip,
      current: current_,
      createdAt: r.createdAt.toISOString(),
    };
  });
}
