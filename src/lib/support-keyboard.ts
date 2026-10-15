import type { SupportButton } from "@/types/support";

/**
 * Group choice buttons into Telegram-style keyboard rows.
 * Prefer explicit `row` (1-based). Without it: pair topics 2-up,
 * leave back / type-input as full-width trailing rows.
 */
export function layoutSupportKeyboard(
  buttons: SupportButton[],
): SupportButton[][] {
  if (buttons.length === 0) return [];

  const hasExplicitRows = buttons.some(
    (b) => typeof b.row === "number" && b.row > 0,
  );

  if (hasExplicitRows) {
    const buckets = new Map<number, SupportButton[]>();
    buttons.forEach((btn, index) => {
      const key =
        typeof btn.row === "number" && btn.row > 0 ? btn.row : 10_000 + index;
      const list = buckets.get(key) ?? [];
      list.push(btn);
      buckets.set(key, list);
    });
    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, row]) => row);
  }

  const trailing: SupportButton[] = [];
  const regular: SupportButton[] = [];
  for (const btn of buttons) {
    if (btn.action === "back" || btn.action === "focus_input") {
      trailing.push(btn);
    } else {
      regular.push(btn);
    }
  }

  const rows: SupportButton[][] = [];
  for (let i = 0; i < regular.length; i += 2) {
    rows.push(regular.slice(i, i + 2));
  }
  for (const btn of trailing) {
    rows.push([btn]);
  }
  return rows;
}
