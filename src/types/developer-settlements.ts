export type {
  DeveloperSettlementRow,
  DeveloperSettlementsPayload,
} from "@/lib/developer-settlements";

export function formatSettlementDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
