"use client";
import type { ReactNode } from "react";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import styles from "./farming-management.module.css";

/** Label/value pairs of a read-only tab; empty values show a dash so the grid keeps its shape. */
export function Facts({ items }: { items: readonly (readonly [string, ReactNode])[] }) {
  return <dl className={styles.fields}>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === null || value === undefined || value === "" ? "—" : value}</dd></div>)}</dl>;
}

/** Tab footer: secondary actions on the left, primary and status actions on the right (DESIGN_GUIDELINES 1.6). */
export function TabFooter({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  if (!left && !right) return null;
  return <footer className={styles.footer}><div>{left}</div><div>{right}</div></footer>;
}

export function RailHead({ canReset, onReset }: { canReset: boolean; onReset(): void }) {
  return <div className={styles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!canReset} onClick={onReset}>Đặt lại</button></div>;
}

export function ListSkeleton() {
  return <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4, 5].map(key => <div key={key} />)}</div>;
}
