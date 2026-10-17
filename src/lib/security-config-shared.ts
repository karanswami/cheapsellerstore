/** Admin-editable security knobs (Settings → Security). Defaults match the previous hardcoded values. */
export type SecurityConfig = {
  /** Hostnames (or `.suffix` entries) a browser push endpoint may use. */
  pushEndpointHosts: string[];
  loginPerIpPer10Min: number;
  loginPerAccountPer15Min: number;
  registerPerIpPerHour: number;
  registerPerIpPerDay: number;
  supportChatPerMinute: number;
  impersonationHours: number;
};

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  pushEndpointHosts: [
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    ".push.apple.com",
    ".notify.windows.com",
    ".push.services.mozilla.com",
  ],
  loginPerIpPer10Min: 30,
  loginPerAccountPer15Min: 8,
  registerPerIpPerHour: 5,
  registerPerIpPerDay: 15,
  supportChatPerMinute: 15,
  impersonationHours: 8,
};

function int(v: unknown, fallback: number, min: number, max: number) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function normalizeSecurityConfig(raw: unknown): SecurityConfig {
  const d = DEFAULT_SECURITY_CONFIG;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const hosts = Array.isArray(r.pushEndpointHosts)
    ? r.pushEndpointHosts
        .map((h) => String(h).trim().toLowerCase())
        .filter((h) => /^\.?[a-z0-9.-]{3,100}$/.test(h))
        .slice(0, 50)
    : [];
  return {
    pushEndpointHosts: hosts.length ? hosts : [...d.pushEndpointHosts],
    loginPerIpPer10Min: int(r.loginPerIpPer10Min, d.loginPerIpPer10Min, 3, 1000),
    loginPerAccountPer15Min: int(r.loginPerAccountPer15Min, d.loginPerAccountPer15Min, 3, 100),
    registerPerIpPerHour: int(r.registerPerIpPerHour, d.registerPerIpPerHour, 1, 200),
    registerPerIpPerDay: int(r.registerPerIpPerDay, d.registerPerIpPerDay, 1, 1000),
    supportChatPerMinute: int(r.supportChatPerMinute, d.supportChatPerMinute, 1, 300),
    impersonationHours: int(r.impersonationHours, d.impersonationHours, 1, 72),
  };
}

/** True when `endpoint` is https on an allowed push-service host. */
export function isAllowedPushEndpoint(endpoint: string, hosts: string[]): boolean {
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  const host = u.hostname.toLowerCase();
  return hosts.some((h) => (h.startsWith(".") ? host.endsWith(h) : host === h));
}
