"use client";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { DataGrid } from "@/components/ui/data-grid";
import { StatusPill } from "@/components/ui/management-page";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import { accountLabel, employmentLabel } from "./employee-editor-model";
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
  return (
    <DataGrid
      responsive
      headings={["Họ và tên", "Số điện thoại", "Vùng làm việc", "Tài khoản", "Tình trạng", "Hồ sơ"]}
      empty={!items.length}
    >
      {items.map((row) => (
        <OpenableTableRow key={row.id} disabled={disabled} onOpen={() => onOpen(row.id)}>
          <td data-label="Họ và tên" className="font-semibold">
            {row.fullName}
          </td>
          <td data-label="Số điện thoại">{row.phoneNumber ?? "—"}</td>
          <td data-label="Vùng làm việc">{row.workingZones.map((zone) => zone.code).join(", ") || "—"}</td>
          <td data-label="Tài khoản">
            {row.account ? (
              <>
                <span className={styles.username}>@{row.account.username}</span>
                <small className={styles.meta}>{accountLabel(row.account.status)}</small>
              </>
            ) : (
              <span className={styles.meta}>Chưa liên kết</span>
            )}
          </td>
          <td data-label="Tình trạng">
            <StatusPill tone={row.status === "Employed" ? "success" : "neutral"}>
              {employmentLabel(row.status)}
            </StatusPill>
          </td>
          <td data-label="Hồ sơ">
            <button className={styles.open} disabled={disabled} onClick={() => onOpen(row.id)}>
              Mở {row.fullName}
            </button>
          </td>
        </OpenableTableRow>
      ))}
    </DataGrid>
  );
}
