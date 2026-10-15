export type ActivityKind = "order" | "deposit" | "wallet";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  /** Short title shown in the list */
  title: string;
  /** Secondary line (status, method, note, product summary) */
  subtitle: string;
  /** Status / type tag for badges */
  status: string;
  /** Signed USD microcents when applicable; null for non-money rows */
  amount: number | null;
  /** ISO timestamp */
  createdAt: string;
  /** Extra detail lines for the detail dialog */
  details: { label: string; value: string }[];
};

export type ActivityFilter = "all" | ActivityKind;

/** Ledger types already covered by Order / Deposit rows in the All feed. */
const LEDGER_DUP_TYPES = new Set(["DEPOSIT", "PURCHASE"]);

/** Whether an item belongs in the deduped “All” timeline. */
export function isInAllActivityFeed(item: ActivityItem): boolean {
  if (item.kind !== "wallet") return true;
  return !LEDGER_DUP_TYPES.has(item.status);
}
