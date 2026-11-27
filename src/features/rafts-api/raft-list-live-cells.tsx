"use client";
import { StatusPill } from "@/components/ui/management-page";
import styles from "@/features/farming-management/farming-management.module.css";
import { lanePhaseLabel, laneSummaryText, type RaftLaneSummary } from "./raft-current-state";

/** Cell states shared by both state columns: no permission to read cycles, or the list did not carry the lane counts. */
function missing(summary: RaftLaneSummary | null | undefined, enabled: boolean) {
  if (!enabled) return <span title="Không có quyền xem chu kỳ và tiến độ làn">—</span>;
  if (!summary) return <span title="Chưa có số liệu làn của bè">—</span>;
  return undefined;
}

/** "6/10 làn đang nuôi" with the rest of the lanes by state under it, from the `laneSummary` of the list row. */
export function LaneLiveCell({ summary, enabled }: { summary?: RaftLaneSummary | null; enabled: boolean }) {
  const empty = missing(summary, enabled);
  if (empty || !summary) return empty;
  const { text, detail } = laneSummaryText(summary);
  return <><span className={`${styles.truncated} ${styles.name}`} title={text}>{text}</span>{(detail || !summary.farming) && <small className={styles.meta} title={detail}>{detail || "Chưa thả giống"}</small>}</>;
}

/** Phase of the raft as a chip, worked out from its lane counts (the list carries no cycle). */
export function CycleLiveCell({ summary, enabled }: { summary?: RaftLaneSummary | null; enabled: boolean }) {
  const empty = missing(summary, enabled);
  if (empty || !summary) return empty;
  const phase = lanePhaseLabel(summary);
  return <span className={styles.truncated}><StatusPill tone={phase.active ? "success" : "neutral"}>{phase.label}</StatusPill></span>;
}
