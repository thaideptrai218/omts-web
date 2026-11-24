import { ManagementPagination } from "@/components/ui/management-screen/management-table";

/** Employee list only: 10 per page by default (the BFF and backend accept 1-100). */
export const employeePageSizes = [10, 30, 50] as const;
export function EmployeeDirectoryPaging({ page, total, loading, pageSize, setPageSize, setPage }: {
  page: number; total: number; loading: boolean; pageSize: number; setPageSize(value: number): void; setPage(value: number): void;
}) {
  return <ManagementPagination page={page} pageSize={pageSize} total={total} unit="nhân viên" pageSizes={employeePageSizes} disabled={loading} onPage={setPage} onPageSize={setPageSize} />;
}
