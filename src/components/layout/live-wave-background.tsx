"use client";

import styles from "@/components/layout/live-wave-background.module.css";
import { isStandaloneBioRoute } from "@/lib/profile";
import { usePathname } from "next/navigation";

export function LiveWaveBackground({
  isBioInitial = false,
}: {
  isBioInitial?: boolean;
}) {
  const pathname = usePathname();
  if (isBioInitial || isStandaloneBioRoute(pathname)) {
    return null;
  }

  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.base} />
      <div className={styles.wave} />
      <div className={styles.aurora} />
      <div className={`${styles.blob} ${styles.blobOne}`} />
      <div className={`${styles.blob} ${styles.blobTwo}`} />
      <div className={`${styles.blob} ${styles.blobThree}`} />
      <div className={styles.vignette} />
    </div>
  );
}

