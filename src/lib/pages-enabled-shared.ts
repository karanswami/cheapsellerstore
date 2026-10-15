/**
 * Client-safe pages enable types/defaults (no Prisma).
 * Server IO lives in `pages-enabled.ts`.
 */
export type PagesEnabledConfig = {
  /** Customer gift-code claim page + deposit entry. Default false. */
  giftCodes: boolean;
};

export const DEFAULT_PAGES_ENABLED: PagesEnabledConfig = {
  giftCodes: false,
};

export function normalizePagesEnabled(
  raw: unknown,
): PagesEnabledConfig {
  const base = { ...DEFAULT_PAGES_ENABLED };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  if (typeof o.giftCodes === "boolean") base.giftCodes = o.giftCodes;
  return base;
}
