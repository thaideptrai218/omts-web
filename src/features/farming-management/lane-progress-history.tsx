"use client";
import { useState } from "react";
import { formatLanePercent } from "./lane-progress-display";
import type { LaneProgressMetadata } from "./lane-progress-contracts";
import styles from "./lane-detail-layout.module.css";

const SHOWN = 3;
/** Compact history of % adjustments: the latest three, "Xem thêm" for the rest, inner scroll only for the long list. */
export function LaneProgressHistory({ entries }: { entries?: LaneProgressMetadata["progressHistory"] }) {
  const [all, setAll] = useState(false);
  const list = entries ?? [], visible = all ? list : list.slice(0, SHOWN);
  return <section aria-label="Lịch sử tiến độ" className={styles.history}>
    <h4>Lịch sử tiến độ</h4>
    {!list.length ? <p className={styles.muted}>Chưa có lịch sử điều chỉnh %.</p> : <>
      <ol className={styles.historyList} data-expanded={all || undefined}>{visible.map((entry, index) => <li key={`${entry.at}-${index}`}>
        <p className={styles.historyHead}>{entry.byName ?? "Chưa ghi nhận người sửa"} · {new Date(entry.at).toLocaleString("vi-VN")}</p>
        <p>Đã thả: {formatLanePercent(entry.oldSeededPercent ?? null)} → {formatLanePercent(entry.seededPercent ?? null)} · Đã thu: {formatLanePercent(entry.oldHarvestedPercent ?? null)} → {formatLanePercent(entry.harvestedPercent ?? null)}</p>
        {entry.reason && <p className={styles.muted}>Lý do: {entry.reason}</p>}
      </li>)}</ol>
      {list.length > SHOWN && <button key="toggle-progress-history" type="button" className={styles.more} aria-expanded={all} onClick={() => setAll(value => !value)}>{all ? "Thu gọn" : `Xem thêm (${list.length - SHOWN})`}</button>}
    </>}
  </section>;
}
