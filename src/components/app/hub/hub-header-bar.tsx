import styles from "@/components/app/hub/hub-header-bar.module.css";
import {
  HubStatPill,
  type HubStat,
} from "@/components/app/hub/hub-stat-pill";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type HubHeaderBarProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  stats?: HubStat[];
  statsLabel?: string;
  actions?: ReactNode;
  gradientTitle?: boolean;
  className?: string;
};

export function HubHeaderBar({
  icon,
  title,
  description,
  stats = [],
  statsLabel = "Summary",
  actions,
  gradientTitle = false,
  className,
}: HubHeaderBarProps) {
  const hasTrailing = stats.length > 0 || actions;

  return (
    <section className={cn(styles.bar, "motion-safe-fade", className)}>
      <div className={styles.main}>
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
        <div className={styles.copy}>
          <h1
            className={cn(styles.title, gradientTitle && styles.titleGradient)}
          >
            {title}
          </h1>
          {description ? <p className={styles.desc}>{description}</p> : null}
        </div>
      </div>

      {hasTrailing ? (
        <div className={styles.trailing}>
          {stats.length > 0 ? (
            <div className={styles.stats} aria-label={statsLabel}>
              {stats.map((stat) => (
                <HubStatPill key={stat.label} {...stat} />
              ))}
            </div>
          ) : null}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
