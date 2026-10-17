import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

const HOUR = 60 * 60 * 1000;

/** Collapse ids / product codes so `/products/ABC` and `/products/XYZ` count as one endpoint. */
function normalizePath(path: string) {
  return path
    .split("?")[0]
    .replace(/\/[0-9a-f]{24}(?=\/|$)/gi, "/:id")
    .replace(/(\/products)\/[^/]+/, "$1/:code");
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin only.", 401);
  }

  const now = Date.now();
  const since24h = new Date(now - 24 * HOUR);
  const since48h = new Date(now - 48 * HOUR);

  const [rows, prev24h, activeKeys, sandboxKeys, revokedKeys, developers, disabledDevs, recentErrors] = await Promise.all([
    prisma.sellerApiUsage.findMany({
      where: { createdAt: { gte: since24h } },
      select: { path: true, method: true, statusCode: true, durationMs: true, userId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30000,
    }),
    prisma.sellerApiUsage.count({ where: { createdAt: { gte: since48h, lt: since24h } } }),
    prisma.sellerApiKey.count({ where: { status: "ACTIVE" } }),
    prisma.sellerApiKey.count({ where: { status: "ACTIVE", mode: "SANDBOX" } }),
    prisma.sellerApiKey.count({ where: { status: "REVOKED" } }),
    prisma.user.count({ where: { sellerApiKeys: { some: { status: "ACTIVE" } }, apiEnabled: { not: false } } }),
    prisma.user.count({ where: { apiEnabled: false } }),
    prisma.sellerApiUsage.findMany({
      where: { statusCode: { gte: 400 } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { username: true } }, apiKey: { select: { keyPrefix: true } } },
    }),
  ]);

  // Hourly buckets, oldest → newest, aligned to the start of each hour.
  const startHour = Math.floor((now - 23 * HOUR) / HOUR) * HOUR;
  const series = Array.from({ length: 24 }, (_, i) => ({ t: startHour + i * HOUR, ok: 0, errors: 0, limited: 0 }));
  const endpoints = new Map<string, { path: string; method: string; count: number; errors: number; ms: number }>();
  const devs = new Map<string, { userId: string; count: number; errors: number }>();
  let errors = 0;
  let limited = 0;
  let msSum = 0;
  let msCount = 0;
  const latencies: number[] = [];

  for (const r of rows) {
    const idx = Math.floor((r.createdAt.getTime() - startHour) / HOUR);
    const b = series[Math.min(23, Math.max(0, idx))];
    if (r.statusCode === 429) {
      b.limited++;
      limited++;
    } else if (r.statusCode >= 400) {
      b.errors++;
    } else {
      b.ok++;
    }
    if (r.statusCode >= 400) errors++;
    if (r.durationMs > 0) {
      msSum += r.durationMs;
      msCount++;
      latencies.push(r.durationMs);
    }

    const key = `${r.method} ${normalizePath(r.path)}`;
    const e = endpoints.get(key) ?? { path: normalizePath(r.path), method: r.method, count: 0, errors: 0, ms: 0 };
    e.count++;
    if (r.statusCode >= 400) e.errors++;
    e.ms += r.durationMs;
    endpoints.set(key, e);

    const d = devs.get(r.userId) ?? { userId: r.userId, count: 0, errors: 0 };
    d.count++;
    if (r.statusCode >= 400) d.errors++;
    devs.set(r.userId, d);
  }

  latencies.sort((a, b) => a - b);
  const p95 = latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] : 0;

  const topDevs = [...devs.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const users = topDevs.length
    ? await prisma.user.findMany({ where: { id: { in: topDevs.map((d) => d.userId) } }, select: { id: true, username: true, role: true } })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  return jsonOk({
    kpis: {
      requests24h: rows.length,
      requestsPrev24h: prev24h,
      errors24h: errors,
      rateLimited24h: limited,
      successRate: rows.length ? Math.round(((rows.length - errors) / rows.length) * 1000) / 10 : 100,
      avgLatencyMs: msCount ? Math.round(msSum / msCount) : 0,
      p95LatencyMs: p95,
      activeKeys,
      sandboxKeys,
      revokedKeys,
      developers,
      disabledDevs,
      activeDevs24h: devs.size,
    },
    series: series.map((s) => ({ ...s, t: new Date(s.t).toISOString() })),
    topEndpoints: [...endpoints.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((e) => ({ method: e.method, path: e.path, count: e.count, errors: e.errors, avgMs: e.count ? Math.round(e.ms / e.count) : 0 })),
    topDevelopers: topDevs.map((d) => ({
      userId: d.userId,
      username: userById.get(d.userId)?.username ?? "unknown",
      role: userById.get(d.userId)?.role ?? "USER",
      count: d.count,
      errors: d.errors,
    })),
    recentErrors: recentErrors.map((r) => ({
      id: r.id,
      method: r.method,
      path: r.path,
      statusCode: r.statusCode,
      errorCode: r.errorCode,
      username: r.user.username,
      keyPrefix: r.apiKey.keyPrefix,
      createdAt: r.createdAt.toISOString(),
    })),
    truncated: rows.length >= 30000,
  });
}
