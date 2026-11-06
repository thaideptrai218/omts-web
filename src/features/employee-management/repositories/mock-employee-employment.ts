import type { EmployeeProfile, EmployeeStatus, LoadEmployeeWorkspaceResult } from "../domain/employee-management";
import type { ChangeEmployeeEmploymentResult, EndEmployeeEmploymentInput, ReinstateEmployeeInput } from "../domain/employee-employment";
import { createEmployeeEndDateSchema } from "../schemas/employee-employment-schema";
import { employeeRowVersionSchema } from "../schemas/employee-row-version";

export type MockEmployeeLaborReference = Readonly<{
  employeeId: string;
  date: string;
}> & (Readonly<{ kind: "attendance" }> | Readonly<{ kind: "assignment"; cancelledAt?: string | null }>);
type Dependencies = Readonly<{
  authorize(): Promise<Exclude<LoadEmployeeWorkspaceResult, { status: "loaded" }> | undefined>;
  find(id: string): EmployeeProfile | undefined;
  commit(employee: EmployeeProfile): EmployeeProfile;
  conflict(employee: EmployeeProfile): Extract<ChangeEmployeeEmploymentResult, { status: "conflict" }>;
  nextVersion(): string;
  now(): Date;
  laborRecords: readonly MockEmployeeLaborReference[];
}>;

export function createMockEmployeeEmployment(deps: Dependencies) {
  function check(input: ReinstateEmployeeInput, target: EmployeeStatus):
    ChangeEmployeeEmploymentResult | { status: "ready"; employee: EmployeeProfile } {
    if (!employeeRowVersionSchema.safeParse(input.recordVersion).success) {
      return { status: "invalid-input", field: "recordVersion", message: { code: "MSG01" } };
    }
    const employee = deps.find(input.employeeId);
    if (!employee) return { status: "not-found" };
    if (employee.recordVersion !== input.recordVersion) return deps.conflict(employee);
    if (employee.status === target) {
      const label = target === "left" ? "Đã nghỉ" : "Đang làm việc";
      return { status: "same-status", message: { code: "MSG61", params: { current_status: label, new_status: label } } };
    }
    return { status: "ready", employee };
  }

  return {
    async endEmployment(input: EndEmployeeEmploymentInput): Promise<ChangeEmployeeEmploymentResult> {
      const early = await deps.authorize();
      if (early) return early;
      if (!createEmployeeEndDateSchema(deps.now).safeParse({ endDate: input.endDate }).success) {
        return { status: "invalid-input", field: "endDate", message: { code: "MSG01" } };
      }
      const ready = check(input, "left");
      if (ready.status !== "ready") return ready;
      const later = deps.laborRecords.filter((record) => record.employeeId === input.employeeId && record.date > input.endDate &&
        (record.kind === "attendance" || !record.cancelledAt));
      if (later.length) {
        const attendance = later.filter((record) => record.kind === "attendance").length;
        const assignments = later.length - attendance;
        return { status: "blocked", message: { code: "MSG11", params: {
          count: later.length,
          related_list: `chấm công (${attendance}), giao việc (${assignments}) sau ngày ${input.endDate.split("-").reverse().join("/")}`,
        } } };
      }
      const employee = deps.commit({ ...ready.employee, status: "left", employmentEndDate: input.endDate, recordVersion: deps.nextVersion() });
      return { status: "changed", employee, followUp: employee.account?.status === "active"
        ? { action: "review-lock", account: { ...employee.account } } : undefined };
    },
    async reinstate(input: ReinstateEmployeeInput): Promise<ChangeEmployeeEmploymentResult> {
      const early = await deps.authorize();
      if (early) return early;
      const ready = check(input, "employed");
      if (ready.status !== "ready") return ready;
      const employee = deps.commit({ ...ready.employee, status: "employed", employmentEndDate: null, recordVersion: deps.nextVersion() });
      return { status: "changed", employee, followUp: employee.account
        ? { action: "review-access", account: { ...employee.account } } : undefined };
    },
  };
}
