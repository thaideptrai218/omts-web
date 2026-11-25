"use client";
import { useMemo } from "react";
import { ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { BulkBar, ManagementPagination, ManagementScroller, Subtabs } from "@/components/ui/management-screen/management-table";
import { useStoredValue } from "@/components/ui/management-screen/use-stored-value";
import { Button } from "@/components/ui/button";
import { ScreenGuide } from "@/components/ui/screen-guide";
import { businessToday, ErrorNotice } from "./ui";
import { AssignmentEditor } from "./workforce-assignment-editor";
import { MAX_BULK } from "./workforce-bulk-actions";
import { AttendanceCorrectionDialog } from "./workforce-correction-dialog";
import { CrewStartDialog } from "./workforce-crew-start-dialog";
import { StaffAttendanceTab } from "./workforce-staff-attendance";
import { useWorkforceBoard } from "./workforce-board-state";
import { workforceColumns } from "./workforce-columns";
import { WorkforceFilterRail } from "./workforce-filter-rail";
import { OwnerLeavesDialog, ReviewLeave } from "./workforce-leave-dialogs";
import { attendanceActionLabel } from "./workforce-shared";
import styles from "./workforce-screen.module.css";
import { JobTypeCreateDialog } from "@/features/labor-api/job-types-create-dialog";
import { WorkforceSetupDialog } from "./workforce-setup-dialog";
import { WorkforceTable } from "./workforce-table";
import { WorkforceToolbarActions } from "./workforce-toolbar-actions";

// Dialogs live in their own modules; keep exporting them from here for existing importers.
export { AssignmentEditor, ReviewLeave };

const modes = [{ key: "assignments", label: "Phân công" }, { key: "attendance", label: "Chấm công" }, { key: "staff", label: "Nhân viên nội bộ" }] as const;
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

  return <ManagementLayout storageKey="workforce" icon="attendance" title="Phân công, chấm công" filterLabel="Bộ lọc phân công"
    filters={<WorkforceFilterRail board={board} />}
    footer={board.mode === "staff" ? undefined : <ManagementPagination page={board.currentPage} pageSize={board.pageSize} total={filteredRows?.length ?? 0} unit="phân công" disabled={rows.loading || editor.pending} onPage={board.setPage} onPageSize={board.setPageSize} />}
    search={<input type="search" aria-label="Tìm nhân viên, bè hoặc công việc" placeholder="Theo nhân viên, bè hoặc công việc" maxLength={200} value={board.search} onChange={(event) => board.setSearch(event.target.value)} />}
    actions={<WorkforceToolbarActions board={board} visibleKeys={columns.map((column) => column.key)} onColumns={saveColumns} />}>
    {editor.dialog}
    {(zones.error || editor.mutation.error || board.notice || editor.mutation.blocked) && <div className={styles.feedback}>
      <ErrorNotice error={zones.error || editor.mutation.error} />
      {zones.error && <button type="button" className={styles.retry} onClick={zones.reload}>Tải lại danh mục vùng</button>}
      {board.notice && <p role="status">{board.notice}</p>}
      {editor.mutation.blocked && <p>Chưa thể gửi tiếp. Đối chiếu phân công và chấm công trước khi lập lượt mới; tải lại không tự gửi lại thao tác.</p>}
    </div>}
    <ScreenGuide id="workforce" steps={[
      { title: "Chọn ngày và vùng", text: "Dùng bộ lọc bên trái để xem phân công của ngày và vùng cần làm.", target: "text:Bộ lọc" },
      { title: "Mở một dòng", text: "Bấm vào dòng để xem chi tiết, ghi vào làm, ra về, sửa chấm công hoặc gỡ phân công.", target: "table tbody tr" },
      { title: "Đổi việc và duyệt yêu cầu", text: "Dùng nút Đổi việc trong ngày và Duyệt yêu cầu ở thanh trên; thiết lập chấm công nay nằm trong Cài đặt.", target: "text:Đổi việc" },
    ]} />
    <div className={styles.modeTabs}><Subtabs label="Cách xem lịch làm việc" tabs={modes} value={board.mode} onChange={board.setMode} idPrefix="workforce" /></div>
    {board.mode === "staff" ? <StaffAttendanceTab board={board} /> : <>
      <BulkBar count={board.selected.size} onClear={() => board.setSelected(new Set())}>
        <Button type="button" className="w-auto" disabled={editor.disabled || board.selected.size > MAX_BULK} onClick={() => void board.bulk("check-in")}>{attendanceActionLabel["check-in"]}</Button>
        <Button type="button" className="w-auto" variant="secondary" disabled={editor.disabled || board.selected.size > MAX_BULK} onClick={() => void board.bulk("check-out")}>{attendanceActionLabel["check-out"]}</Button>
        {board.selected.size > MAX_BULK && <span role="alert">Chọn tối đa {MAX_BULK} người mỗi lần.</span>}
      </BulkBar>
      {board.bulkResults && <div className={styles.bulkResults} role="status">
        <strong>Kết quả ghi {board.bulkResults.action === "check-in" ? "vào làm" : "ra về"}: {board.bulkResults.items.filter((item) => item.ok).length}/{board.bulkResults.items.length} người</strong>
        <ul>{board.bulkResults.items.map((item) => <li key={item.id} className={item.ok ? undefined : styles.bulkFail}>{item.name}: {item.message}</li>)}</ul>
        <button type="button" className="underline" onClick={board.clearBulkResults}>Ẩn kết quả</button>
      </div>}
      <ManagementScroller busy={rows.loading}><WorkforceTable board={board} columns={columns} /></ManagementScroller>
    </>}
    {(form === "assign" || form === "crew") && (
      <AssignmentEditor mode={form} initialDay={board.day || businessToday()} onClose={() => setForm(undefined)}
        onSaved={() => { setForm(undefined); rows.refresh(); board.setNotice("Đã lưu phân công."); }} />
    )}
    {form === "settings" && <WorkforceSetupDialog onClose={() => setForm(undefined)} />}
    {/* Job types live on /api/job-types: same dialog and repository as the "Loại công việc và đơn giá" screen. */}
    {form === "job" && <JobTypeCreateDialog onClose={() => setForm(undefined)} onCreated={job => { setForm(undefined); board.setNotice(`Đã thêm loại công việc ${job.name}.`); }} />}
    {form === "leaves" && <OwnerLeavesDialog onClose={() => setForm(undefined)} onChanged={board.requests.refresh} />}
    {form === "crew-start" && <CrewStartDialog rows={board.allRows ?? []} today={board.today} zoneName={board.zoneName} allowed={board.allowed} onClose={() => setForm(undefined)}
      onSaved={(count) => { setForm(undefined); rows.refresh(); board.setNotice(`Đã ghi vào làm cho ${count} nhân viên.`); }} />}
    {board.correcting && <AttendanceCorrectionDialog employeeId={board.correcting.employeeId} day={board.correcting.day} onClose={() => board.setCorrecting(undefined)}
      onSaved={() => { board.setCorrecting(undefined); rows.refresh(); board.carry.refresh(); board.setNotice("Đã sửa chấm công."); }} />}
  </ManagementLayout>;
}
