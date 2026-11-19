"use client";
import { StatusPill } from "@/components/ui/management-page";
import styles from "@/features/farming-management/farming-management.module.css";
import type { RaftListLiveState } from "./use-raft-list-live";

/** Cell states shared by both live columns: no permission, still loading, failed. */
function pending(live: RaftListLiveState | undefined, enabled: boolean) {
  if (!enabled) return <span title="Không có quyền xem chu kỳ và tiến độ làn">—</span>;
  if (live === undefined) return <span role="status" aria-label="Đang tải hiện trạng" className="omts-skeleton inline-block h-4 w-24 align-middle" />;
  if (live === "error") return <span title="Không tải được hiện trạng của bè">Không tải được</span>;
  return undefined;
}

/** "6/10 làn đang nuôi" with the rest of the lanes by state under it. */
export function LaneLiveCell({ live, enabled }: { live?: RaftListLiveState; enabled: boolean }) {
  const waiting = pending(live, enabled);
  if (waiting || !live || live === "error") return waiting;
  return <><span className={`${styles.truncated} ${styles.name}`} title={live.summary.text}>{live.summary.text}</span>{(live.summary.detail || !live.summary.working) && <small className={styles.meta} title={live.summary.detail}>{live.summary.detail || "Chưa thả giống"}</small>}</>;
}

/** Phase of the raft's cycle as a chip, with the days farmed under it while the cycle is open. */
export function CycleLiveCell({ live, enabled }: { live?: RaftListLiveState; enabled: boolean }) {
  const waiting = pending(live, enabled);
  if (waiting || !live || live === "error") return waiting;
  return <><span className={styles.truncated}><StatusPill tone={live.open ? "success" : "neutral"}>{live.phase}</StatusPill></span>{live.days !== undefined && <small className={styles.meta}>{live.days} ngày nuôi</small>}</>;
}
