"use client";
import styles from "@/features/farming-management/farming-management.module.css";
import { currentStateText, type RaftCurrentCycle } from "./raft-current-state";

/**
 * "Hiện trạng" at the top of the raft's "Thông tin": one line from the raft record (`currentCycle`), no extra read and no water (water belongs to the zone).
 * `cycle` undefined means the backend did not send it, so nothing is claimed.
 */
export function RaftCurrentState({ cycle, onOpenCycles }: { cycle?: RaftCurrentCycle | null; onOpenCycles?(): void }) {
  if (cycle === undefined) return null;
  return <section aria-label="Hiện trạng" className="mb-3 rounded-control border border-border bg-surface-subtle px-3 py-2">
    <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Hiện trạng</h4>
    <p className="mt-1 text-sm">{currentStateText(cycle)}{cycle && onOpenCycles && <> · <button type="button" className={styles.link} onClick={onOpenCycles}>Xem chu kỳ</button></>}</p>
  </section>;
}
