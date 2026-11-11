import { ManagementPagination } from "@/components/ui/management-screen/management-table";

export function EmployeeDirectoryPaging({ page, total, loading, pageSize, setPageSize, setPage }: {
  page: number; total: number; loading: boolean; pageSize: number; setPageSize(value: number): void; setPage(value: number): void;
}) {
  return <ManagementPagination page={page} pageSize={pageSize} total={total} unit="nhân viên" disabled={loading} onPage={setPage} onPageSize={setPageSize} />;
}
