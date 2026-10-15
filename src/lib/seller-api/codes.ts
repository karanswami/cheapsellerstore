/** Generate slug-style API codes for products / durations. */

export function slugifyApiCode(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "ITEM";
}

export function suggestProductApiCode(title: string): string {
  return slugifyApiCode(title);
}

export function suggestDurationApiCode(
  productCode: string,
  label: string,
  days?: number | null,
): string {
  const labelPart = days
    ? `${days}D`
    : slugifyApiCode(label).slice(0, 16) || "DUR";
  return `${slugifyApiCode(productCode)}-${labelPart}`;
}

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function looksLikeObjectId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

/** Trim + uppercase for apiCode lookups (codes are stored UPPERCASE). */
export function normalizeApiCode(input: string): string {
  return input.trim().toUpperCase();
}
