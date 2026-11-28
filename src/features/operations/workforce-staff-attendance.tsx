"use client";
import { EmployeeTypeBadge } from "@/features/employee-api/employee-type-badge";
import { filterByEmployeeType } from "@/features/employee-api/employee-type-filter";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ListStateMessage, ManagementScroller } from "@/components/ui/management-screen/management-table";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { ErrorNotice, displayTime, useRemote } from "./ui";
import { AttendanceCorrectionDialog } from "./workforce-correction-dialog";
import * as w from "./workforce-contracts";
import type { WorkforceBoard } from "./workforce-board-state";
import styles from "./workforce-screen.module.css";
import { attendanceActionLabel, workforceRepository as repository } from "./workforce-shared";
import { MAX_STAFF_BATCH, useStaffAttendanceActions, type StaffRow as Row } from "./workforce-staff-actions";
import { filterStaffRows, staffReadOnlyReason, staffState, staffStateLabel, staffStep } from "./workforce-staff-view";

const recorded = (value: string | null) => (value ? displayTime(value) : "Chưa ghi nhận");

/**
 * Tab "Nhân viên nội bộ": the internal employees of the zones of the user with their check-in and check-out of the chosen day (no raft, no job).
 * One click records the time now, for today only, by those who may record attendance; an employee on approved leave is shown as such.
 */
export function StaffAttendanceTab({ board }: { board: WorkforceBoard }) {
  const { day, today } = board;
  const list = useRemote(useMemo(() => (signal: AbortSignal) => day ? repository.read("staff", { day }, z.array(w.staffAttendanceSchema), signal) : Promise.resolve({ status: "success" as const, data: [] as Row[] }), [day]));
  const actions = useStaffAttendanceActions(day, list.refresh);
  const { reset } = actions;
  useEffect(() => { reset(); }, [list.data, reset]);
  // "Sửa chấm công" (also for a past day, to enter a missing time or the field work done back-dated): the Owner, or whoever holds ATTENDANCE Edit; the server checks the zone.
  const [correcting, setCorrecting] = useState<string>();
  const canCorrect = day <= today && board.allowed("AttendanceEdit");
  const canRecord = day === today && board.allowed("AttendanceCreate");
  const readOnlyReason = staffReadOnlyReason(day, today, board.allowed("AttendanceCreate"));
  const term = board.search.trim(), filtered = !!term || !!board.status || !!board.typeFilter;
  // Same search box and attendance-status filter as the other two tabs.
  // Everyone on this tab is an official (nội bộ) employee, so choosing "Thời vụ" leaves it empty.
  const rows = list.data && filterByEmployeeType(filterStaffRows(list.data.map(actions.merged), term, board.status), board.typeFilter, () => "Staff");
  const waiting = rows?.filter((row) => !row.checkedInAt && !row.checkedOutAt && !row.onLeave) ?? [];
  const busy = actions.batching || actions.pending.size > 0;

  if (list.error) return <ListStateMessage error={list.error} onRetry={list.reload} retryLabel="Tải lại danh sách nhân viên nội bộ" />;
  return <>
    {(actions.error || actions.notice) && <div className={styles.feedback}><ErrorNotice error={actions.error} />{actions.notice && <p role="status">{actions.notice}</p>}</div>}
    {actions.batch && <div className={styles.bulkResults} role="status">
      <strong>Kết quả ghi vào làm: {actions.batch.filter((item) => item.ok).length}/{actions.batch.length} người</strong>
      <ul>{actions.batch.map((item) => <li key={item.id} className={item.ok ? undefined : styles.bulkFail}>{item.name}: {item.message}</li>)}</ul>
      <button type="button" className="underline" onClick={actions.clearBatch}>Ẩn kết quả</button>
    </div>}
    {readOnlyReason && <p className={styles.feedback} role="status">{readOnlyReason}</p>}
    {canRecord && waiting.length > 0 && <div className={styles.feedback}>
      <Button type="button" className="w-auto" disabled={busy} isPending={actions.batching} onClick={() => void actions.checkInAll(waiting)}>Vào làm tất cả đang chờ ({Math.min(waiting.length, MAX_STAFF_BATCH)})</Button>
      {waiting.length > MAX_STAFF_BATCH && <span role="status"> Mỗi lần tối đa {MAX_STAFF_BATCH} người; bấm lại cho phần còn lại.</span>}
    </div>}
    <ManagementScroller busy={list.loading}>
      {list.loading || !rows ? <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4].map((key) => <div key={key} />)}</div>
        : !rows.length ? <ListStateMessage>{filtered ? "Không tìm thấy nhân viên phù hợp. Thử đổi trạng thái hoặc từ khóa." : "Chưa có nhân viên nội bộ trong các vùng được cấp."}</ListStateMessage>
        : <table className={styles.table}>
          <caption className="sr-only">Chấm công nhân viên nội bộ ngày {formatVietnameseDate(day)}</caption>
          <thead><tr><th scope="col">Nhân viên</th><th scope="col">Mã</th><th scope="col">Vào làm</th><th scope="col">Ra về</th><th scope="col">Trạng thái</th>{canRecord && <th scope="col">Chấm công nhanh</th>}{canCorrect && <th scope="col">Sửa chấm công</th>}</tr></thead>
          <tbody>{rows.map((row) => {
            const pending = actions.pending.has(row.employeeId), step = staffStep(row);
            return <tr key={row.employeeId} aria-busy={pending || undefined}>
              <td><strong>{row.employeeName}</strong><EmployeeTypeBadge type="Staff" className="ml-1.5" /></td><td>{row.employeeCode ?? "—"}</td>
              <td className="tabular-nums">{recorded(row.checkedInAt)}</td><td className="tabular-nums">{recorded(row.checkedOutAt)}</td>
              <td><span className={styles.status} data-state={staffState(row)}>{staffStateLabel(row)}</span></td>
              {canRecord && <td>{step && <Button type="button" className="w-auto whitespace-nowrap" variant={step === "check-in" ? "primary" : "secondary"} disabled={actions.batching} isPending={pending}
                aria-label={`${attendanceActionLabel[step]} cho ${row.employeeName}`} onClick={() => void actions.one(row, step)}>{attendanceActionLabel[step]}</Button>}</td>}
              {canCorrect && <td><Button type="button" variant="ghost" className="w-auto whitespace-nowrap" disabled={actions.batching} aria-label={`Sửa chấm công của ${row.employeeName}`} onClick={() => setCorrecting(row.employeeId)}>Sửa chấm công</Button></td>}
            </tr>;
          })}</tbody>
        </table>}
    </ManagementScroller>
    {correcting && <AttendanceCorrectionDialog employeeId={correcting} day={day} onClose={() => setCorrecting(undefined)} onSaved={() => { setCorrecting(undefined); list.refresh(); }} />}
  </>;
}
