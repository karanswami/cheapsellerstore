import "server-only";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

/** True for loopback, private, link-local, CGNAT, metadata and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
    return (
      v.startsWith("fc") ||
      v.startsWith("fd") ||
      v.startsWith("fe8") ||
      v.startsWith("fe9") ||
      v.startsWith("fea") ||
      v.startsWith("feb") ||
      v.startsWith("ff")
    );
  }
  return true;
}

/** Static URL check (no network). */
export function validatePublicWebhookUrl(raw: string): { ok: true; url: URL } | { ok: false; message: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, message: "Invalid webhook URL." };
  }
  if (url.protocol !== "https:") return { ok: false, message: "Webhook URL must use https." };
  if (url.username || url.password) return { ok: false, message: "Credentials in the URL are not allowed." };
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan")
  ) {
    return { ok: false, message: "That host is not allowed." };
  }
  const bare = host.replace(/^\[|\]$/g, "");
  if (net.isIP(bare) && isPrivateAddress(bare)) {
    return { ok: false, message: "That address is not allowed." };
  }
  return { ok: true, url };
}

/**
 * POST to a user-supplied URL with SSRF protection: the IP is validated at CONNECT time (so DNS
 * rebinding can't swap in an internal address), redirects are never followed, size/time are capped.
 */
export function safePost(
  rawUrl: string,
  body: string,
  headers: Record<string, string>,
  timeoutMs = 8000,
): Promise<{ status: number }> {
  const checked = validatePublicWebhookUrl(rawUrl);
  if (!checked.ok) return Promise.reject(new Error(checked.message));
  const url = checked.url;
  const lib = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname.replace(/^\[|\]$/g, ""),
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: { ...headers, "Content-Length": String(Buffer.byteLength(body)) },
        timeout: timeoutMs,
        lookup: (hostname, options, cb) => {
          dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
            if (err) return (cb as (e: Error | null) => void)(err);
            const list = addresses as dns.LookupAddress[];
            const bad = list.find((a) => isPrivateAddress(a.address));
            if (bad || list.length === 0) {
              return (cb as (e: Error | null) => void)(new Error("Blocked address"));
            }
            if ((options as { all?: boolean }).all) {
              return (cb as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
            }
            return (cb as unknown as (e: null, a: string, f: number) => void)(null, list[0].address, list[0].family);
          });
        },
      },
      (res) => {
        res.resume(); // never read the response body
        resolve({ status: res.statusCode ?? 0 });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
