"use client";
import { compressLaneNumbers } from "@/features/farming-management/lane-ranges";
import { formatLanePercent, laneProgressDisplay } from "@/features/farming-management/lane-progress-display";
import styles from "@/features/farming-management/farming-management.module.css";
import { businessToday } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { keptLanes, laneSeedFacts, type LiveLane, type SeedingRecord } from "./raft-live-model";

/** Lanes that have something to report, in lane order; the lanes still empty are listed in one line instead of 25 blank rows. */
export function RaftLiveLaneTable({ lanes, records, seedingLoading }: { lanes: readonly LiveLane[]; records: readonly SeedingRecord[]; seedingLoading: boolean }) {
  const today = businessToday(), rows = keptLanes(lanes).sort((a, b) => a.laneNumber - b.laneNumber).map(lane => ({ lane, shown: laneProgressDisplay(lane), seed: laneSeedFacts(records, lane.laneNumber, today) }));
  const active = rows.filter(row => row.shown.state !== "NotSeeded" && row.shown.state !== "Available"), empty = rows.filter(row => !active.includes(row));
  if (!rows.length) return null;
  return <div className="mb-3" aria-label="Tình trạng từng làn">
    {active.length ? <div className="overflow-x-auto"><table className={styles.subTable}>
      <caption className="sr-only">Làn đã thả giống hoặc có sự cố của bè</caption>
      <thead><tr><th scope="col">Làn</th><th scope="col">Tình trạng</th><th scope="col">Giống</th><th scope="col">Ngày thả</th><th scope="col">Ngày nuôi</th><th scope="col">Đã thả / đã thu</th></tr></thead>
      <tbody>{active.map(({ lane, shown, seed }) => <tr key={lane.laneNumber}>
        <th scope="row">{lane.laneNumber}</th>
        <td><span className="inline-flex items-center gap-1 whitespace-nowrap"><i aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: `var(${shown.colorToken})` }} />{shown.label}</span></td>
        <td>{seed.seeds.length ? seed.seeds.join(" + ") : seedingLoading ? "…" : "—"}</td>
        <td className="whitespace-nowrap">{seed.firstDate ? seed.firstDate === seed.lastDate ? formatVietnameseDate(seed.firstDate) : `${formatVietnameseDate(seed.firstDate)} – ${formatVietnameseDate(seed.lastDate!)}` : "—"}</td>
        <td>{seed.days === undefined ? "—" : `${seed.days} ngày`}</td>
        <td>{formatLanePercent(shown.seededPercent)} / {formatLanePercent(shown.harvestedPercent)}</td>
      </tr>)}</tbody></table></div>
      : <p className={styles.hint}>Chưa có làn nào được thả giống.</p>}
    {!!active.length && !!empty.length && <p className={styles.hint}>Làn chưa thả giống: {compressLaneNumbers(empty.map(row => row.lane.laneNumber))} ({empty.length} làn).</p>}
  </div>;
}
