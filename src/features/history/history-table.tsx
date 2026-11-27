"use client";
import { useState } from "react";
import { ManagementPagination } from "@/components/ui/management-screen/management-table";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { formatVietnameseDateTime } from "@/shared/format/date-time";
import { historyActionLabel, historyChangeStyle, historyChangeText, visibleHistoryChanges, type HistoryChange, type HistoryChangeStyle, type HistoryEntry } from "./history-contracts";
import { sortHistory, useHistoryOrder } from "./history-order";
import styles from "./history-table.module.css";

/** How many changed fields an entry lists before "+n" opens the rest. */
export const HISTORY_LINES_SHOWN = 3;

/** A record type may word its actions and lines its own way (the nursery does); the default is the shared wording. */
export type HistoryPresentation = {
  action(entry: HistoryEntry): string;
  line(change: HistoryChange, style: HistoryChangeStyle): string;
};
const sharedPresentation: HistoryPresentation = {
  action: entry => historyActionLabel(entry.action, entry.actionLabel),
  line: (change, style) => historyChangeText(change, style),
};

const timeOf = (at: string) => (at.length > 10 ? formatVietnameseDateTime(at) : formatVietnameseDate(at));

/** "Label: from → to" lines, three at most; the rest open with "+n". */
function ChangeLines({ entry, presentation }: { entry: HistoryEntry; presentation: HistoryPresentation }) {
  const [open, setOpen] = useState(false);
  const changes = visibleHistoryChanges(entry.changes), style = historyChangeStyle(changes);
  const shown = open ? changes : changes.slice(0, HISTORY_LINES_SHOWN), hidden = changes.length - HISTORY_LINES_SHOWN;
  return <>
    {shown.map((change, index) => <p key={`${change.field}-${index}`} className={styles.line}>{presentation.line(change, style)}</p>)}
    {hidden > 0 && <button type="button" className={styles.more} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Thu gọn" : `+${hidden} thay đổi khác`}</button>}
    {entry.note && <span className={styles.muted}>{entry.note}</span>}
    {!changes.length && !entry.note && "—"}
  </>;
}

/**
 * The history of a record as a table (Thời gian, Thao tác, Người thực hiện, Nội dung thay đổi, Lý do), newest first with the sort in the header and paged like the other
 * tables (DESIGN_GUIDELINES 1.6, 1.7). The action is the backend's Vietnamese `actionLabel`; a changed field is "Label: from → to", or "Label: value" for a creation.
 */
export function HistoryTable({ entries, presentation = sharedPresentation }: { entries: readonly HistoryEntry[]; presentation?: HistoryPresentation }) {
  const [order, setOrder] = useHistoryOrder(), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  if (!entries.length) return <p className={styles.empty}>Chưa có thay đổi nào được ghi lại.</p>;
  const sorted = sortHistory(entries.map((entry, position) => ({ entry, position })), item => item.entry.at, order), last = Math.max(1, Math.ceil(sorted.length / pageSize)), current = Math.min(page, last);
  return <div className={styles.body}>
    <div className={styles.scroll}><table className={styles.table} aria-label="Lịch sử thay đổi">
      <thead><tr>
        <th aria-sort={order === "newest" ? "descending" : "ascending"}><button type="button" className={styles.sort} title={order === "newest" ? "Đang xếp mới nhất trước, bấm để xếp cũ nhất trước" : "Đang xếp cũ nhất trước, bấm để xếp mới nhất trước"}
          onClick={() => { setOrder(order === "newest" ? "oldest" : "newest"); setPage(1); }}>Thời gian <span aria-hidden="true">{order === "newest" ? "↓" : "↑"}</span></button></th>
        <th>Thao tác</th><th>Người thực hiện</th><th>Nội dung thay đổi</th><th>Lý do</th>
      </tr></thead>
      <tbody>{sorted.slice((current - 1) * pageSize, current * pageSize).map(({ entry, position }) => <tr key={`${entry.at}-${position}`}>
        <td className={styles.time}><time dateTime={entry.at}>{timeOf(entry.at)}</time></td>
        <td className={styles.action}>{presentation.action(entry)}</td>
        <td>{entry.byName || "Hệ thống"}{entry.byRole && <span className={styles.muted}>{entry.byRole}</span>}</td>
        <td className={styles.changes}><ChangeLines entry={entry} presentation={presentation} /></td>
        <td className={styles.reason}>{entry.reason || "—"}</td>
      </tr>)}</tbody>
    </table></div>
    <ManagementPagination page={current} pageSize={pageSize} total={sorted.length} unit="thay đổi" onPage={setPage} onPageSize={size => { setPageSize(size); setPage(1); }} />
  </div>;
}
