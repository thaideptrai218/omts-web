"use client";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { dateLabel, isPendingLeave, leaveStatusLabel, recordedTime, type MyAssignment, type MyAttendanceDay, type MyLeave } from "./my-work-shared";
import styles from "./my-work-screen.module.css";

export function MyAssignmentsTable({ rows }: { rows: readonly MyAssignment[] }) {
  return <table className={styles.table}>
    <thead><tr>{["Ngày", "Bè", "Công việc", "Vào làm", "Ra về"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.id}>
      <td className={styles.date}>{dateLabel(row.date)}</td><td>{row.raftCode || "—"}</td><td className={styles.name}>{row.job}</td>
      <td>{recordedTime(row.checkedInAt)}</td><td>{recordedTime(row.checkedOutAt)}</td>
    </tr>)}</tbody>
  </table>;
}

export function MyAttendanceTable({ rows }: { rows: readonly MyAttendanceDay[] }) {
  return <table className={styles.table}>
    <thead><tr>{["Ngày", "Vào làm", "Ra về", "Công việc và số giờ", "Tình trạng"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.date}>
      <td className={styles.date}>{dateLabel(row.date)}</td><td>{recordedTime(row.checkedInAt)}</td><td>{recordedTime(row.checkedOutAt)}</td>
      <td>{row.jobs.map((job) => <p key={job.jobTypeId}>{job.job}: {job.hours.toLocaleString("vi-VN")} giờ</p>)}</td>
      <td><StatusPill tone={row.complete ? "success" : "neutral"}>{row.complete ? "Đủ lượt vào/ra" : "Thiếu lượt vào/ra"}</StatusPill></td>
    </tr>)}</tbody>
  </table>;
}

/** Leave requests: the closed row has only the chevron; cancelling a pending request is in the opened row's footer. */
export function MyLeaveTable({ rows, expanded, disabled, onToggle, onCancel }: {
  rows: readonly MyLeave[]; expanded?: string; disabled: boolean; onToggle(id: string): void; onCancel(id: string): void;
}) {
  return <table className={styles.table}>
    <thead><tr><th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>{["Thời gian nghỉ", "Lý do", "Trạng thái", "Phản hồi"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
    <tbody>{rows.map((row) => {
      const open = expanded === row.id, period = `${dateLabel(row.from)} – ${dateLabel(row.to)}`;
      return <Fragment key={row.id}>
        <OpenableTableRow data-selected={open || undefined} onOpen={() => onToggle(row.id)}>
          <td className={styles.expandCell}><button type="button" aria-expanded={open} aria-label={`${open ? "Thu gọn" : "Mở"} yêu cầu nghỉ ${period}`} onClick={() => onToggle(row.id)}><InterfaceIcon name={open ? "chevron-down" : "chevron-right"} /></button></td>
          <td className={styles.date}>{period}</td>
          <td className={styles.clip}>{row.reason}</td>
          <td><StatusPill tone={!row.cancelledAt && row.approved === true ? "success" : "neutral"}>{leaveStatusLabel(row)}</StatusPill></td>
          <td className={styles.clip}>{row.response || "—"}</td>
        </OpenableTableRow>
        {open && <tr><td colSpan={5} className={styles.detailCell}><div className={managementStyles.viewWidth}>
          <section className={styles.detail} aria-label={`Chi tiết yêu cầu nghỉ ${period}`}>
            <dl className={styles.facts}>
              <div><dt>Thời gian nghỉ</dt><dd>{period}</dd></div>
              <div><dt>Trạng thái</dt><dd>{leaveStatusLabel(row)}</dd></div>
              <div className={styles.wide}><dt>Lý do</dt><dd>{row.reason}</dd></div>
              <div className={styles.wide}><dt>Phản hồi</dt><dd>{row.response || "—"}</dd></div>
            </dl>
            {isPendingLeave(row) && <footer className={styles.footer}>
              <div><Button key="cancel-leave" type="button" className="w-auto" variant="ghost" disabled={disabled} onClick={() => onCancel(row.id)}><InterfaceIcon name="trash" className="size-4" />Hủy nghỉ phép</Button></div>
            </footer>}
          </section>
        </div></td></tr>}
      </Fragment>;
    })}</tbody>
  </table>;
}
