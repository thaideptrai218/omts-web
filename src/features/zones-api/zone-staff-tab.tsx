"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useCallback, useState } from "react";
import { ListStateMessage, ManagementPagination } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { employeePageSchema } from "@/features/employee-api/contracts";
import { employeeTypeLabel, employmentLabel } from "@/features/employee-api/employee-editor-model";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { createOperationsRepository } from "@/features/operations/repository";
import { Select, Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";

const repository = createOperationsRepository("employees");
/** "Nhân viên": employees assigned to the zone (the employee list already filters by `zoneId`); each name opens that employee. */
export function ZoneStaffTab({ zoneId }: { zoneId: string }) {
  const [statusId, setStatusId] = useState("401"), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(15);
  const remote = useRemote(useCallback((signal: AbortSignal) => repository.read("list", { zoneId, statusId, page: String(page), pageSize: String(pageSize) }, employeePageSchema, signal), [zoneId, statusId, page, pageSize]));
  return <>
    <div className={styles.subToolbar}>
      <Select label="Tình trạng làm việc" value={statusId} onChange={event => { setStatusId(event.target.value); setPage(1); }}><option value="401">Đang làm việc</option><option value="402">Đã nghỉ việc</option></Select>
    </div>
    {remote.loading ? <Skeleton /> : remote.error || !remote.data ? <ListStateMessage error={remote.error ?? "Không tải được danh sách nhân viên."} onRetry={remote.reload} retryLabel="Tải lại" />
      : remote.data.items.length === 0 ? <p className={styles.hint}>Chưa có nhân viên {statusId === "401" ? "đang làm việc" : "đã nghỉ việc"} ở vùng này.</p>
      : <>
        <table className={styles.subTable}><thead><tr><th scope="col">Họ và tên</th><th scope="col">Số điện thoại</th><th scope="col">Loại nhân viên</th><th scope="col">Công việc</th><th scope="col">Tình trạng</th></tr></thead>
          <tbody>{remote.data.items.map(employee => <tr key={employee.id}>
            <td><Link className={styles.link} href={farmingReferenceHref("employee", { recordId: employee.id, search: employee.fullName })}>{employee.fullName}</Link></td>
            <td>{employee.phoneNumber ?? "—"}</td><td>{employeeTypeLabel(employee.employeeType)}</td><td>{employee.jobTypes.map(job => job.name).join(", ") || "—"}</td>
            <td><StatusPill tone={employee.status === "Employed" ? "success" : "neutral"}>{employmentLabel(employee.status)}</StatusPill></td>
          </tr>)}</tbody></table>
        <ManagementPagination page={remote.data.page} pageSize={pageSize} total={remote.data.total} unit="nhân viên" onPage={setPage} onPageSize={size => { setPageSize(size); setPage(1); }} />
      </>}
    <TabFooter right={<Link className={styles.footerLink} href={farmingReferenceHref("employee")}>Mở danh sách nhân viên</Link>} />
  </>;
}
