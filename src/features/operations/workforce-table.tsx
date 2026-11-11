"use client";
import { ListStateMessage, SortableHeader } from "@/components/ui/management-screen/management-table";
import type { WorkforceBoard } from "./workforce-board-state";
import type { WorkforceColumn } from "./workforce-columns";
import { WorkforceAssignmentRow } from "./workforce-assignment-row";
import styles from "./workforce-screen.module.css";

/** The list body: error (with retry), loading skeleton, empty state, or the table. Closed rows carry no action buttons. */
export function WorkforceTable({ board, columns }: { board: WorkforceBoard; columns: readonly WorkforceColumn[] }) {
  const { rows, filteredRows, visibleRows } = board;
  if (rows.error) return <ListStateMessage error={rows.error} onRetry={rows.reload} retryLabel="Tải lại phân công" />;
  if (rows.loading || !filteredRows || !visibleRows) {
    return <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>;
  }
  if (!filteredRows.length) {
    return <ListStateMessage>{board.hasFilter ? "Không tìm thấy phân công phù hợp. Thử đổi vùng, trạng thái hoặc từ khóa." : "Chưa có phân công cho ngày này."}</ListStateMessage>;
  }
  return <table className={styles.table}>
    <thead><tr>
      <th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.key} sort={board.sort} onSort={board.setSort} />)}
    </tr></thead>
    <tbody>{visibleRows.map((row) => <WorkforceAssignmentRow key={row.id} row={row} columns={columns} open={board.expanded === row.id} zoneName={board.zoneName}
      allowed={board.allowed} disabled={board.editor.disabled} onToggle={() => board.toggleRow(row.id)} onAct={(target, action) => void board.act(target, action)} />)}</tbody>
  </table>;
}
