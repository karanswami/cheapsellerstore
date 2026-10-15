/** Client-safe flash sale / promo datetime helpers (no Prisma). */

/** Local `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`. */
export function flashDateTimeInput(
  iso: string | Date | null | undefined,
): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convert a `datetime-local` wall time to ISO UTC for the API.
 * Must run in the browser so the admin's timezone is applied (VPS is usually UTC).
 */
export function localDateTimeToIso(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function flashDateInput(iso: string | Date | null | undefined): string {
  const full = flashDateTimeInput(iso);
  return full ? full.slice(0, 10) : "";
}

export function flashDateTimeLabel(
  iso: string | Date | null | undefined,
): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function flashAudienceLabel(target: string): string {
  if (target === "USER") return "Users";
  if (target === "SELLER") return "Sellers and resellers";
  return "Everyone";
}

export function flashScopeLabel(scope: string): string {
  if (scope === "PRODUCT") return "Product";
  if (scope === "DURATION") return "Duration";
  return "Whole store";
}

export type FlashCountdownParts = {
  ended: boolean;
  days: number;
  hours: number;
  mins: number;
  secs: number;
};

/** Split remaining time into DAYS / HRS / MIN / SEC for offer banners. */
export function formatFlashCountdownParts(
  endsAt: string | Date | null | undefined,
): FlashCountdownParts | null {
  if (!endsAt) return null;
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  if (Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - Date.now();
  if (ms <= 0) {
    return { ended: true, days: 0, hours: 0, mins: 0, secs: 0 };
  }
  const totalSec = Math.floor(ms / 1000);
  return {
    ended: false,
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    mins: Math.floor((totalSec % 3600) / 60),
    secs: totalSec % 60,
  };
}

/** Format remaining time for countdown tickers. */
export function formatFlashCountdown(
  endsAt: string | Date | null | undefined,
): string | null {
  const parts = formatFlashCountdownParts(endsAt);
  if (!parts) return null;
  if (parts.ended) return "ended";
  const { days, hours, mins, secs } = parts;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}
