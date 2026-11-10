"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { FilterGroup, HelpLink, ManagementLayout } from "@/components/ui/management-screen/management-layout";
import { ListStateMessage, ManagementPagination, ManagementScroller, Subtabs, managementStyles } from "@/components/ui/management-screen/management-table";
import { LeaveEditor } from "./my-work-leave-editor";
import { MAX_PERIOD_DAYS, dateLabel, isValidPeriod, myWorkRepository as repository, type MyWorkTab } from "./my-work-shared";
import styles from "./my-work-screen.module.css";
import { MyAssignmentsTable, MyAttendanceTable, MyLeaveTable } from "./my-work-tables";
import * as c from "./new-module-contracts";
import { businessToday, useRemote } from "./ui";
import { useOperationEditor } from "./use-operation-editor";

// The leave pop-up lives in its own module; keep exporting it for existing importers.
export { LeaveEditor };

const tabs = [{ key: "assignments", label: "Phân công của tôi" }, { key: "attendance", label: "Ngày công" }, { key: "leave", label: "Yêu cầu nghỉ phép" }] as const;
const matches = (term: string, ...parts: (string | null | undefined)[]) => !term || parts.some((part) => (part ?? "").toLocaleLowerCase("vi-VN").includes(term));

/** The signed-in Staff member's own assignments, worked days and leave requests. */
export function MyWorkScreen() {
  const [period, setPeriod] = useState(() => ({ from: businessToday().slice(0, 8) + "01", to: businessToday() }));
  const [tab, setTab] = useState<MyWorkTab>("assignments");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [expanded, setExpanded] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string>();
  const valid = isValidPeriod(period);
  const work = useRemote(useMemo(() => (signal: AbortSignal) => valid ? repository.read("list", period, c.myWorkSchema, signal) : Promise.resolve({ status: "error" as const, httpStatus: 400, uncertain: false }), [valid, period]));
  const editor = useOperationEditor(() => {}, false);

  /** Wraps a setter so the list restarts from page 1 with no open row. */
  const changed = <T,>(apply: (value: T) => void) => (value: T) => { apply(value); setPage(1); setExpanded(undefined); };
  async function cancel(id: string) {
    const result = await editor.submit("Hủy yêu cầu nghỉ phép đang chờ duyệt?", () => repository.write("cancel-leave", {}, c.leaveSchema, id));
    if (result) { setExpanded(undefined); work.reload(); setNotice("Đã hủy yêu cầu nghỉ phép."); }
  }

  const term = search.trim().toLocaleLowerCase("vi-VN"), data = work.data, linked = !!data?.employeeId;
  const assignments = data?.assignments.filter((row) => matches(term, dateLabel(row.date), row.raftCode, row.job)) ?? [];
  const attendance = data?.attendance.filter((row) => matches(term, dateLabel(row.date), ...row.jobs.map((job) => job.job))) ?? [];
  const requests = data?.requests.filter((row) => matches(term, dateLabel(row.from), dateLabel(row.to), row.reason, row.response)) ?? [];
  const total = { assignments: assignments.length, attendance: attendance.length, leave: requests.length }[tab];
  const lastPage = Math.max(1, Math.ceil(total / pageSize)), currentPage = Math.min(page, lastPage);
  const slice = <T,>(rows: readonly T[]) => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function body() {
    if (!valid) return <ListStateMessage error={`Chọn khoảng từ ngày đến ngày, tối đa ${MAX_PERIOD_DAYS + 1} ngày.`} />;
    if (work.error) return <ListStateMessage error={work.error} onRetry={work.reload} retryLabel="Tải lại công việc cá nhân" />;
    if (work.loading || !data) return <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4, 5].map((key) => <div key={key} />)}</div>;
    if (!linked) return <ListStateMessage>Chưa có hồ sơ nhân viên gắn với tài khoản này.</ListStateMessage>;
    if (!total) return <ListStateMessage>{term ? "Không có mục phù hợp từ khóa." : tab === "leave" ? "Bạn chưa có yêu cầu nghỉ phép." : "Không có dữ liệu trong khoảng thời gian đã chọn."}</ListStateMessage>;
    if (tab === "assignments") return <MyAssignmentsTable rows={slice(assignments)} />;
    if (tab === "attendance") return <MyAttendanceTable rows={slice(attendance)} />;
    return <MyLeaveTable rows={slice(requests)} expanded={expanded} disabled={editor.disabled} onToggle={(id) => setExpanded((value) => value === id ? undefined : id)} onCancel={(id) => void cancel(id)} />;
  }

  const rail = <>
    <div className={styles.railHead}><strong>Khoảng thời gian</strong></div>
    <FilterGroup legend="Từ ngày"><DatePickerField label="Từ ngày" value={period.from} onChange={changed((from: string) => setPeriod((current) => ({ ...current, from })))} /></FilterGroup>
    <FilterGroup legend="Đến ngày"><DatePickerField label="Đến ngày" value={period.to} onChange={changed((to: string) => setPeriod((current) => ({ ...current, to })))} /></FilterGroup>
    {!valid && <p role="alert" className={styles.rangeError}>Khoảng thời gian tối đa {MAX_PERIOD_DAYS + 1} ngày và ngày bắt đầu không sau ngày kết thúc.</p>}
    <p className={styles.hint}>Khoảng ngày áp dụng cho phân công và ngày công; yêu cầu nghỉ phép hiển thị toàn bộ.</p>
    {data?.name && <p className={styles.hint}>Nhân viên: <strong>{data.name}</strong></p>}
    <button type="button" className={`${managementStyles.linkButton} ${styles.reload}`} disabled={!valid || work.loading || editor.pending} onClick={work.reload}>Tải lại công việc cá nhân</button>
  </>;

  return <ManagementLayout storageKey="my-work" icon="calendar" title="Công việc của tôi" filterLabel="Khoảng thời gian" filters={rail}
    footer={<ManagementPagination page={currentPage} pageSize={pageSize} total={total} unit={tab === "leave" ? "yêu cầu" : tab === "attendance" ? "ngày công" : "phân công"} disabled={work.loading} onPage={(next) => { setPage(next); setExpanded(undefined); }} onPageSize={changed(setPageSize)} />}
    search={<input type="search" aria-label="Tìm trong công việc của tôi" placeholder="Tìm trong mục đang xem" maxLength={200} value={search} onChange={(event) => changed(setSearch)(event.target.value)} />}
    actions={<>
      {linked && <Button type="button" className="w-auto" disabled={editor.disabled} onClick={() => setCreating(true)}><InterfaceIcon name="add" className="mr-1 size-4" />Xin nghỉ phép</Button>}
      <HelpLink />
    </>}>
    {editor.dialog}
    {(editor.mutation.error || notice || editor.mutation.blocked) && <div className={styles.feedback}>
      {valid && editor.mutation.error && <p role="alert" className={styles.danger}>{editor.mutation.error}</p>}
      {notice && <p role="status">{notice}</p>}
      {editor.mutation.blocked && <p>Chưa rõ kết quả. Hãy đối chiếu trạng thái nghỉ phép hiện tại; hệ thống không tự hủy lại.</p>}
    </div>}
    {linked && <div className={styles.modeTabs}><Subtabs label="Các mục công việc cá nhân" tabs={tabs} value={tab} onChange={changed<MyWorkTab>(setTab)} idPrefix="my-work" /></div>}
    <ManagementScroller busy={work.loading}>{body()}</ManagementScroller>
    {creating && <LeaveEditor onClose={() => setCreating(false)} onSaved={() => { setCreating(false); work.reload(); setNotice("Đã gửi yêu cầu nghỉ phép."); }} />}
  </ManagementLayout>;
}
