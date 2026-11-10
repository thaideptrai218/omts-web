import type {
  EmployeeAccountSummary,
  EmployeeProfile,
} from "@/features/employee-management/domain/employee-management";

/** Simulated network latency for mock mode. */
export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function cloneAccount(account: EmployeeAccountSummary): EmployeeAccountSummary {
  return { ...account };
}

/** Copies nested arrays/objects so callers cannot mutate the in-memory store. */
export function cloneEmployee(employee: EmployeeProfile): EmployeeProfile {
  return {
    ...employee,
    account: employee.account ? cloneAccount(employee.account) : null,
    workingZoneIds: [...employee.workingZoneIds],
    bankAccount: employee.bankAccount ? { ...employee.bankAccount } : null,
  };
}

/** Vietnamese, case/accent-insensitive name comparison used for duplicate detection. */
export function sameName(first: string, second: string): boolean {
  return first.localeCompare(second, "vi", { sensitivity: "base" }) === 0;
}
