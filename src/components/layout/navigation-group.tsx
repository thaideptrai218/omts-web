"use client";
import { useId, useState, type ReactNode } from "react";
import styles from "./app-shell.module.css";

export function NavigationGroup({ label, compact = false, children }: { label: string; compact?: boolean; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();
  return <div className={styles.navigationGroup}>
    <button type="button" hidden={compact} className={styles.groupTitle} aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((value) => !value)}>
      <span>{label}</span>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" fill="none" className={styles.groupArrow} data-expanded={expanded}><path d="m7 4 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    <div id={contentId} hidden={!compact && !expanded}>{children}</div>
  </div>;
}
