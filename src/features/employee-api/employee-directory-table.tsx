"use client";
import { Fragment, useState } from "react";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { DataGrid } from "@/components/ui/data-grid";
import { StatusPill } from "@/components/ui/management-page";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import { accountLabel, employmentLabel, employeeTypeLabel, dateLabel } from "./employee-editor-model";
import styles from "./employee-screen.module.css";

/** Employee rows; the whole row and the explicit "Mở …" button both open the profile. */
export function EmployeeDirectoryTable({
  items,
  disabled,
  onOpen,
}: {
  items: EmployeeListItemDto[];
  disabled: boolean;
  onOpen(id: string): void;
}) {
  const [expandedId, setExpandedId] = useState<string>();
  function toggle(id: string) {
    setExpandedId((current) => current === id ? undefined : id);
  }
  return (
    <DataGrid
      responsive
      headings={["Họ và tên", "Số điện thoại", "Loại nhân viên", "Loại công việc", "Vùng làm việc", "Tài khoản", "Tình trạng", "Hồ sơ"]}
      empty={!items.length}
    >
      {items.map((row) => (
        <Fragment key={row.id}>
        <OpenableTableRow disabled={disabled} onOpen={() => toggle(row.id)}>
          <td data-label="Họ và tên" className="font-semibold">
            {row.fullName}
          </td>
          <td data-label="Số điện thoại">{row.phoneNumber ?? "—"}</td>
          <td data-label="Loại nhân viên">{employeeTypeLabel(row.employeeType)}</td>
          <td data-label="Loại công việc">{row.jobTypes.map(job => job.name).join(", ") || "—"}</td>
          <td data-label="Vùng làm việc">{row.workingZones.map((zone) => zone.code).join(", ") || "—"}</td>
          <td data-label="Tài khoản">
            {row.account ? (
              <>
                <span className={styles.username}>@{row.account.username}</span>
                <small className={styles.meta}>{accountLabel(row.account.status)}</small>
              </>
            ) : (
              <span className={styles.meta}>Chưa có tài khoản</span>
            )}
          </td>
          <td data-label="Tình trạng">
            <StatusPill tone={row.status === "Employed" ? "success" : "neutral"}>
              {employmentLabel(row.status)}
            </StatusPill>
            {row.lastWorkingDay && <small className={styles.meta}>Ngày làm cuối: {dateLabel(row.lastWorkingDay)}</small>}
          </td>
          <td data-label="Hồ sơ">
            <button type="button" className={styles.open} disabled={disabled} aria-expanded={expandedId === row.id} aria-controls={`employee-preview-${row.id}`} onClick={() => toggle(row.id)}>
              {expandedId === row.id ? "Thu gọn hồ sơ" : `Xem ${row.fullName}`}
            </button>
          </td>
        </OpenableTableRow>
        {expandedId === row.id && <tr>
          <td colSpan={8} className={styles.previewCell}>
            <section id={`employee-preview-${row.id}`} className={styles.preview} aria-label={`Hồ sơ ${row.fullName}`}>
              <header className={styles.previewHeader}>
                <div><small>HỒ SƠ NHÂN VIÊN</small><h3>{row.fullName}</h3></div>
                <StatusPill tone={row.status === "Employed" ? "success" : "neutral"}>{employmentLabel(row.status)}</StatusPill>
              </header>
              <dl className={styles.previewFields}>
                <div><dt>Số điện thoại</dt><dd>{row.phoneNumber || "Chưa cập nhật"}</dd></div>
                <div><dt>Vùng làm việc</dt><dd>{row.workingZones.map((zone) => zone.code).join(", ") || "Chưa phân vùng"}</dd></div>
                <div><dt>Tài khoản liên kết</dt><dd>{row.account ? `@${row.account.username}` : "Chưa có tài khoản"}</dd></div>
                <div><dt>Tình trạng tài khoản</dt><dd>{row.account ? accountLabel(row.account.status) : "Chưa có tài khoản"}</dd></div>
              </dl>
              <footer className={styles.previewActions}>
                <button type="button" className={styles.open} disabled={disabled} onClick={() => toggle(row.id)}>Thu gọn</button>
                <button type="button" className={styles.profileAction} disabled={disabled} onClick={() => onOpen(row.id)}>Cập nhật hồ sơ</button>
              </footer>
            </section>
          </td>
        </tr>}
        </Fragment>
      ))}
    </DataGrid>
  );
}
