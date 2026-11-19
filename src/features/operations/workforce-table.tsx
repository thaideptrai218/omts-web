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
  // Ticking rows is for those who may record attendance; the header box ticks (or clears) the rows of the page.
  const selectable = board.allowed("AttendanceCreate");
  const pageIds = visibleRows.map((row) => row.id), allTicked = pageIds.every((id) => board.selected.has(id));
  return <table className={styles.table}>
    <thead><tr>
      {selectable && <th scope="col" className={styles.checkCell}><input type="checkbox" aria-label="Chọn tất cả nhân viên trong trang" checked={allTicked} disabled={board.editor.disabled}
        onChange={(event) => board.setSelected(event.target.checked ? new Set([...board.selected, ...pageIds]) : new Set([...board.selected].filter((id) => !pageIds.includes(id))))} /></th>}
      <th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.key} sort={board.sort} onSort={board.setSort} />)}
      {selectable && <th scope="col">Chấm công nhanh</th>}
    </tr></thead>
    <tbody>{visibleRows.map((row) => <WorkforceAssignmentRow key={row.id} row={row} columns={columns} open={board.expanded === row.id} zoneName={board.zoneName}
      allowed={board.allowed} disabled={board.editor.disabled} pending={board.pendingId === row.id} onToggle={() => board.toggleRow(row.id)} onAct={(target, action) => void board.act(target, action)}
      selectable={selectable} selected={board.selected.has(row.id)} onSelect={(on) => board.setSelected((current) => { const next = new Set(current); if (on) next.add(row.id); else next.delete(row.id); return next; })}
      isOwner={board.context.identity.subjectType === "CooperativeOwner"} onCorrect={(target) => board.setCorrecting({ employeeId: target.employeeId, day: target.date })} />)}</tbody>
  </table>;
}
