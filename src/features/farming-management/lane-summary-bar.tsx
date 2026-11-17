import { laneStateLabels, type LaneDisplayState } from "./lane-progress-display";
import styles from "./lane-overview.module.css";

/** Order of the segments: progress of the raft from "not seeded" to "harvested", then the lanes that are out of the flow. */
const order: readonly LaneDisplayState[] = ["NotSeeded", "Available", "Growing", "BeingHarvested", "Harvested", "Damaged", "OutOfService"];

/** One stacked bar for the whole raft: segment width is the share of lanes in that state, with the count and the percentage. */
export function LaneSummaryBar({ counts, total }: { counts: ReadonlyMap<string, number>; total: number }) {
  if (!total) return null;
  const parts = order.filter(state => counts.has(state)).map(state => {
    const count = counts.get(state) ?? 0, share = Math.round(count * 1000 / total) / 10;
    return { state, count, share, text: `${laneStateLabels[state]} ${count} làn (${share.toLocaleString("vi-VN")}%)` };
  });
  return <div className={styles.summaryBar} role="img" aria-label={`Cơ cấu ${total} làn: ${parts.map(part => part.text).join(", ")}`}>
    {parts.map(part => <span key={part.state} data-state={part.state} style={{ flexGrow: part.count }} title={part.text}>
      {part.share >= 16 ? `${part.count} · ${Math.round(part.share)}%` : part.share >= 6 ? part.count : ""}
    </span>)}
  </div>;
}
