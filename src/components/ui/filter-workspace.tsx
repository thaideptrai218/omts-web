import type { ReactNode } from "react";
import styles from "./filter-workspace.module.css";
export function FilterWorkspace({ filters, children, label = "Bộ lọc", reset }: { filters: ReactNode; children: ReactNode; label?: string; reset?: ReactNode }) {
  return <div className={styles.layout}><aside className={styles.rail} aria-label={label}><div className={styles.heading}><h2>{label}</h2>{reset}</div><div className={styles.fields}>{filters}</div></aside><div className={styles.results}>{children}</div></div>;
}
