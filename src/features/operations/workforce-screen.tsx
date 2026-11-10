"use client";
import { useMemo } from "react";
import { ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ManagementPagination, ManagementScroller, Subtabs } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { businessToday, ErrorNotice } from "./ui";
import { AssignmentEditor } from "./workforce-assignment-editor";
import { useWorkforceBoard } from "./workforce-board-state";
import { workforceColumns } from "./workforce-columns";
import { WorkforceFilterRail } from "./workforce-filter-rail";
import { OwnerLeavesDialog, ReviewLeave } from "./workforce-leave-dialogs";
import styles from "./workforce-screen.module.css";
import { WorkforceSetupDialog } from "./workforce-setup-dialog";
import { WorkforceTable } from "./workforce-table";
import { WorkforceToolbarActions } from "./workforce-toolbar-actions";

// Dialogs live in their own modules; keep exporting them from here for existing importers.
export { AssignmentEditor, ReviewLeave };

const modes = [{ key: "assignments", label: "Phân công" }, { key: "attendance", label: "Chấm công" }] as const;
const allKeys = workforceColumns.map((column) => column.key).join(",");

/** Daily assignment and attendance board for the zones the user may see. */
export function WorkforceScreen() {
  const board = useWorkforceBoard();
  const { rows, zones, editor, form, setForm, filteredRows } = board;
  const [stored, store] = useStoredValue("omts-columns-workforce", allKeys);
  const offered = useMemo(() => workforceColumns.filter((column) => column.modes.includes(board.mode)), [board.mode]);
  const columns = useMemo(() => {
    const keys = stored.split(","), shown = offered.filter((column) => keys.includes(column.key));
    return shown.length ? shown : offered;
  }, [stored, offered]);
  // Columns of the other view keep their saved choice while this view edits its own.
  const saveColumns = (keys: string[]) => store([...stored.split(",").filter((key) => !offered.some((column) => column.key === key)), ...keys].join(","));

  return <ManagementLayout storageKey="workforce" icon="attendance" title="Phân công và chấm công" filterLabel="Bộ lọc phân công"
    filters={<WorkforceFilterRail board={board} />}
    footer={<ManagementPagination page={board.currentPage} pageSize={board.pageSize} total={filteredRows?.length ?? 0} unit="phân công" disabled={rows.loading || editor.pending} onPage={board.setPage} onPageSize={board.setPageSize} />}
    search={<input type="search" aria-label="Tìm nhân viên, bè hoặc công việc" placeholder="Theo nhân viên, bè hoặc công việc" maxLength={200} value={board.search} onChange={(event) => board.setSearch(event.target.value)} />}
    actions={<WorkforceToolbarActions board={board} visibleKeys={columns.map((column) => column.key)} onColumns={saveColumns} />}>
    {editor.dialog}
    {(zones.error || editor.mutation.error || board.notice || editor.mutation.blocked) && <div className={styles.feedback}>
      <ErrorNotice error={zones.error || editor.mutation.error} />
      {zones.error && <button type="button" className={styles.retry} onClick={zones.reload}>Tải lại danh mục vùng</button>}
      {board.notice && <p role="status">{board.notice}</p>}
      {editor.mutation.blocked && <p>Chưa thể gửi tiếp. Đối chiếu phân công và chấm công trước khi lập lượt mới; tải lại không tự gửi lại thao tác.</p>}
    </div>}
    <div className={styles.modeTabs}><Subtabs label="Cách xem lịch làm việc" tabs={modes} value={board.mode} onChange={board.setMode} idPrefix="workforce" /></div>
    <ManagementScroller busy={rows.loading}><WorkforceTable board={board} columns={columns} /></ManagementScroller>
    {(form === "assign" || form === "crew") && (
      <AssignmentEditor mode={form} initialDay={board.day || businessToday()} onClose={() => setForm(undefined)}
        onSaved={() => { setForm(undefined); rows.reload(); board.setNotice("Đã lưu phân công."); }} />
    )}
    {(form === "job" || form === "settings") && <WorkforceSetupDialog mode={form} onClose={() => setForm(undefined)} />}
    {form === "leaves" && <OwnerLeavesDialog onClose={() => setForm(undefined)} />}
  </ManagementLayout>;
}
