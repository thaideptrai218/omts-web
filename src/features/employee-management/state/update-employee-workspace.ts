import type { EmployeeManagementWorkspace, EmployeeProfile } from "@/features/employee-management/domain/employee-management";

export function updateEmployeeWorkspace(
  current: EmployeeManagementWorkspace,
  employee: EmployeeProfile,
): EmployeeManagementWorkspace {
  const previous = current.employees.find((item) => item.id === employee.id);
  const available = new Map(current.availableAccounts.map((account) => [account.id, account]));
  if (previous?.account && previous.account.id !== employee.account?.id) {
    available.set(previous.account.id, previous.account);
  }
  if (employee.account) available.delete(employee.account.id);
  return {
    availableAccounts: [...available.values()],
    employees: previous
      ? current.employees.map((item) => item.id === employee.id ? employee : item)
      : [...current.employees, employee],
  };
}
