"use client";
import { Fragment, useState } from "react";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { DataGrid } from "@/components/ui/data-grid";
import { StatusPill } from "@/components/ui/management-page";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import { accountLabel, employmentLabel, employeeTypeLabel, dateLabel } from "./employee-editor-model";
import { EmployeeDetailPanel } from "./employee-detail-panel";
import type { EmployeeDetailCache } from "./use-employee-detail";
import type { Employee } from "./contracts";
import styles from "./employee-screen.module.css";

/** Employee rows; the whole row and the explicit "Mở …" button both open the profile. */
export function EmployeeDirectoryTable({
  items,
  disabled,
  onOpen, cache, onSaved, detailRevision = 0,
}: {
  items: EmployeeListItemDto[];
  disabled: boolean;
  onOpen(id: string): void;
  cache: EmployeeDetailCache;
  onSaved(employee: Employee): void;
  detailRevision?: number;
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
            <span className={styles.truncated} title={row.fullName}>{row.fullName}</span>
          </td>
          <td data-label="Số điện thoại" className={styles.phone}>{row.phoneNumber ?? "—"}</td>
          <td data-label="Loại nhân viên"><span className={styles.typeChip}>{employeeTypeLabel(row.employeeType)}</span></td>
          <td data-label="Loại công việc"><span className={styles.truncated} title={row.jobTypes.map(job => job.name).join(", ")}>{row.jobTypes.map(job => job.name).join(", ") || "—"}</span></td>
          <td data-label="Vùng làm việc"><span className={styles.truncated} title={row.workingZones.map(zone => `${zone.code} · ${zone.name}`).join(", ")}>{row.workingZones.map(zone => zone.code).join(", ") || "—"}</span></td>
          <td data-label="Tài khoản">
            {row.account ? (
              <>
                <span className={styles.truncated} title={row.account.username}>@{row.account.username}</span>
                <small className={styles.meta}>{accountLabel(row.account.status)}</small>
              </>
            ) : (
              <span className={styles.meta}>Chưa có tài khoản</span>
            )}
          </td>
          <td data-label="Tình trạng" className={styles.noWrap}>
            <StatusPill tone={row.status === "Employed" ? "success" : "neutral"}>
              {employmentLabel(row.status)}
            </StatusPill>
            {row.lastWorkingDay && <small className={styles.meta}>Ngày làm cuối: {dateLabel(row.lastWorkingDay)}</small>}
          </td>
          <td data-label="Hồ sơ" className={styles.noWrap}>
            {/* Short visible text keeps the column narrow; the accessible name still says whose profile it opens. */}
            <button type="button" className={styles.open} disabled={disabled} aria-expanded={expandedId === row.id} aria-controls={`employee-preview-${row.id}`} aria-label={expandedId === row.id ? undefined : `Xem ${row.fullName}`} onClick={() => toggle(row.id)}>
              {expandedId === row.id ? "Thu gọn hồ sơ" : "Xem hồ sơ"}
            </button>
          </td>
        </OpenableTableRow>
        {expandedId === row.id && <tr>
          <td colSpan={8} className={styles.previewCell}>
            <EmployeeDetailPanel id={row.id} cache={cache} onOpen={onOpen} onSaved={onSaved} revision={detailRevision} />
          </td>
        </tr>}
        </Fragment>
      ))}
    </DataGrid>
  );
}
