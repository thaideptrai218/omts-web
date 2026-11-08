import type { EmployeeProfile, EmployeeStatus } from "../domain/employee-management";

export type EmployeeDirectoryFilters = Readonly<{
  query: string;
  status: "all" | EmployeeStatus;
  link: "all" | "linked" | "unlinked";
  zoneId: string;
}>;

export const EMPLOYEE_PAGE_SIZE = 20;

export function selectEmployeePage(
  employees: readonly EmployeeProfile[],
  filters: EmployeeDirectoryFilters,
  requestedPage: number,
) {
  const query = filters.query.trim().toLocaleLowerCase("vi");
  const matches = employees.filter((employee) =>
    [employee.fullName, employee.phone].some((value) => value.toLocaleLowerCase("vi").includes(query)) &&
    (filters.status === "all" || employee.status === filters.status) &&
    (filters.link === "all" || (filters.link === "linked" ? Boolean(employee.account) : !employee.account)) &&
    (!filters.zoneId || employee.workingZoneIds.includes(filters.zoneId)),
  );
  const pageCount = Math.max(1, Math.ceil(matches.length / EMPLOYEE_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const offset = (page - 1) * EMPLOYEE_PAGE_SIZE;
  return {
    rows: matches.slice(offset, offset + EMPLOYEE_PAGE_SIZE),
    total: matches.length,
    page,
    pageCount,
    first: matches.length ? offset + 1 : 0,
    last: Math.min(offset + EMPLOYEE_PAGE_SIZE, matches.length),
  };
}
