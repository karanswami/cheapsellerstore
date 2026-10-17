const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function looksLikeObjectId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

/** Parses a catalog number ("500", 500) → non-negative integer, else null. */
export function parseCatalogNumber(input: unknown): number | null {
  const raw = typeof input === "number" ? String(input) : typeof input === "string" ? input.trim() : "";
  if (!/^\d{1,9}$/.test(raw)) return null;
  const n = Number(raw);
  return n;
}
