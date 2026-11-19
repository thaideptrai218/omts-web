"use client";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ListStateMessage, ManagementScroller } from "@/components/ui/management-screen/management-table";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { ErrorNotice, displayTime, useRemote } from "./ui";
import * as w from "./workforce-contracts";
import type { WorkforceBoard } from "./workforce-board-state";
import styles from "./workforce-screen.module.css";
import { workforceRepository as repository } from "./workforce-shared";
import { MAX_STAFF_BATCH, useStaffAttendanceActions, type StaffRow as Row } from "./workforce-staff-actions";

const state = (row: Row) => (row.onLeave ? "Nghỉ phép đã duyệt" : row.checkedOutAt ? "Đã ra về" : row.checkedInAt ? "Đang làm" : "Chưa vào làm");
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
  const canRecord = day === today && board.allowed("AttendanceCreate");
  const term = board.search.trim().toLocaleLowerCase("vi-VN");
  const rows = list.data?.map(actions.merged).filter((row) => !term || `${row.employeeName} ${row.employeeCode ?? ""}`.toLocaleLowerCase("vi-VN").includes(term));
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
    {canRecord && waiting.length > 0 && <div className={styles.feedback}>
      <Button type="button" className="w-auto" disabled={busy} isPending={actions.batching} onClick={() => void actions.checkInAll(waiting)}>Vào làm tất cả đang chờ ({Math.min(waiting.length, MAX_STAFF_BATCH)})</Button>
      {waiting.length > MAX_STAFF_BATCH && <span role="status"> Mỗi lần tối đa {MAX_STAFF_BATCH} người; bấm lại cho phần còn lại.</span>}
    </div>}
    <ManagementScroller busy={list.loading}>
      {list.loading || !rows ? <div role="status" aria-label="Đang tải danh sách" className={styles.skeleton}>{[1, 2, 3, 4].map((key) => <div key={key} />)}</div>
        : !rows.length ? <ListStateMessage>{term ? "Không tìm thấy nhân viên phù hợp." : "Chưa có nhân viên nội bộ trong các vùng được cấp."}</ListStateMessage>
        : <table className={styles.table}>
          <caption className="sr-only">Chấm công nhân viên nội bộ ngày {formatVietnameseDate(day)}</caption>
          <thead><tr><th scope="col">Nhân viên</th><th scope="col">Mã</th><th scope="col">Vào làm</th><th scope="col">Ra về</th><th scope="col">Trạng thái</th>{canRecord && <th scope="col">Thao tác</th>}</tr></thead>
          <tbody>{rows.map((row) => {
            const pending = actions.pending.has(row.employeeId), step = !row.checkedInAt && !row.checkedOutAt ? "check-in" : row.checkedInAt && !row.checkedOutAt ? "check-out" : undefined;
            return <tr key={row.employeeId} aria-busy={pending || undefined}>
              <td><strong>{row.employeeName}</strong></td><td>{row.employeeCode ?? "—"}</td>
              <td className="tabular-nums">{recorded(row.checkedInAt)}</td><td className="tabular-nums">{recorded(row.checkedOutAt)}</td>
              <td><span className={styles.status} data-state={row.checkedOutAt ? "finished" : row.checkedInAt ? "working" : "planned"}>{state(row)}</span></td>
              {canRecord && <td>{step && !row.onLeave && <Button type="button" className="w-auto whitespace-nowrap" variant={step === "check-in" ? "primary" : "secondary"} disabled={actions.batching} isPending={pending}
                aria-label={`${step === "check-in" ? "Ghi vào làm" : "Ghi ra về"} cho ${row.employeeName}`} onClick={() => void actions.one(row, step)}>{step === "check-in" ? "Vào làm" : "Ra về"}</Button>}</td>}
            </tr>;
          })}</tbody>
        </table>}
    </ManagementScroller>
  </>;
}
