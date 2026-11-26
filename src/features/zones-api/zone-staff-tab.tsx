"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ListStateMessage, ManagementPagination, managementStyles } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { employeePageSchema } from "@/features/employee-api/contracts";
import { employeeTypeLabel, employmentLabel } from "@/features/employee-api/employee-editor-model";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { createOperationsRepository } from "@/features/operations/repository";
import { DataTable, Select, Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { FooterLink } from "./zone-tab-parts";
import local from "./zone-tabs.module.css";

const repository = createOperationsRepository("employees");
/** "Nhân viên": employees assigned to the zone (the employee list already filters by `zoneId`), paged by the server; each name opens that employee. */
export function ZoneStaffTab({ zoneId }: { zoneId: string }) {
  const [statusId, setStatusId] = useState("401"), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const remote = useRemote(useCallback((signal: AbortSignal) => repository.read("list", { zoneId, statusId, page: String(page), pageSize: String(pageSize) }, employeePageSchema, signal), [zoneId, statusId, page, pageSize]));
  return <div className={local.tabBody}>
    <div className={styles.subToolbar}>
      <Select label="Tình trạng làm việc" value={statusId} onChange={event => { setStatusId(event.target.value); setPage(1); }}><option value="401">Đang làm việc</option><option value="402">Đã nghỉ việc</option></Select>
    </div>
    {remote.loading ? <Skeleton /> : remote.error || !remote.data ? <ListStateMessage error={remote.error ?? "Không tải được danh sách nhân viên."} onRetry={remote.reload} retryLabel="Tải lại" />
      : <>
        <DataTable responsive headings={["Họ và tên", "Số điện thoại", "Loại nhân viên", "Công việc", "Tình trạng"]} empty={!remote.data.items.length}>{remote.data.items.map(employee => <tr key={employee.id}>
          <td data-label="Họ và tên"><Link className={managementStyles.linkButton} href={farmingReferenceHref("employee", { zoneId, recordId: employee.id, search: employee.fullName })}>{employee.fullName}</Link></td>
          <td data-label="Số điện thoại" className={local.nowrap}>{employee.phoneNumber ?? "—"}</td><td data-label="Loại nhân viên">{employeeTypeLabel(employee.employeeType)}</td>
          <td data-label="Công việc">{employee.jobTypes.map(job => job.name).join(", ") || "—"}</td>
          <td data-label="Tình trạng" className={local.nowrap}><StatusPill tone={employee.status === "Employed" ? "success" : "neutral"}>{employmentLabel(employee.status)}</StatusPill></td>
        </tr>)}</DataTable>
        <ManagementPagination page={remote.data.page} pageSize={pageSize} total={remote.data.total} unit="nhân viên" onPage={setPage} onPageSize={size => { setPageSize(size); setPage(1); }} /></>}
    <TabFooter left={<FooterLink href={farmingReferenceHref("employee", { zoneId })} icon="users">Mở danh sách nhân viên</FooterLink>} />
  </div>;
}
