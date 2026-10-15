import styles from "@/components/app/hub/hub-stat-pill.module.css";
import { cn } from "@/lib/utils";

export type HubStatTone = "default" | "accent" | "success";

export type HubStat = {
  label: string;
  value: string;
  tone?: HubStatTone;
};

export function HubStatPill({
  label,
  value,
  tone = "default",
}: HubStat) {
  return (
    <div
      className={cn(
        styles.pill,
        tone === "accent" && styles.accent,
        tone === "success" && styles.success,
      )}
    >
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
