import { describe, expect, it } from "vitest";
import { mockEmployeeAccounts, mockEmployeeProfiles, mockEmployeeZones } from "../mocks/employee-management-fixtures";
import { createMockEmployeeManagementRepository } from "./mock-employee-management-repository";
import type { MockEmployeeLaborReference } from "./mock-employee-employment";

const employee = mockEmployeeProfiles[0];
const end = { employeeId: employee.id, recordVersion: employee.recordVersion, endDate: "2026-10-28" };
function repository(options: Partial<Parameters<typeof createMockEmployeeManagementRepository>[0]> = {}) {
  return createMockEmployeeManagementRepository({ accounts: mockEmployeeAccounts, zones: mockEmployeeZones,
    initialEmployees: mockEmployeeProfiles, latencyMs: 0, now: () => new Date("2026-10-28T10:00:00Z"), ...options });
}

describe("explicit mock employee employment actions", () => {
  it("ends employment and reinstates using the returned version, preserving personal data and account", async () => {
    const repo = repository();
    const ended = await repo.endEmployment(end);
    if (ended.status !== "changed") throw new Error("Expected changed");
    expect(ended.employee).toEqual({ ...employee, status: "left", employmentEndDate: end.endDate, recordVersion: ended.employee.recordVersion });
    expect(ended.employee.recordVersion).not.toBe(employee.recordVersion);
    expect(ended.followUp).toEqual({ action: "review-lock", account: employee.account });
    const restored = await repo.reinstate({ employeeId: employee.id, recordVersion: ended.employee.recordVersion });
    expect(restored).toMatchObject({ status: "changed", employee: { status: "employed", employmentEndDate: null, account: employee.account }, followUp: { action: "review-access" } });
  });

  it.each(["", "2026-02-30", "2026-10-29"])("rejects invalid end date %s without writing", async (endDate) => {
    const repo = repository();
    expect(await repo.endEmployment({ ...end, endDate })).toMatchObject({ status: "invalid-input", field: "endDate" });
    expect(repo.snapshotEmployees()[0]).toEqual(employee);
  });

  it("blocks records strictly after the end date without touching any employee or labor history", async () => {
    const laborRecords: readonly MockEmployeeLaborReference[] = [
      { employeeId: employee.id, date: "2026-10-28", kind: "attendance" },
      { employeeId: employee.id, date: "2026-10-29", kind: "attendance" },
      { employeeId: employee.id, date: "2026-10-30", kind: "assignment" },
      { employeeId: "another-person", date: "2026-10-30", kind: "assignment" },
    ];
    const before = structuredClone(laborRecords); const repo = repository({ laborRecords });
    expect(await repo.endEmployment(end)).toMatchObject({ status: "blocked", message: { code: "MSG11", params: { count: 2 } } });
    expect(repo.snapshotEmployees()[0]).toEqual(employee);
    expect(laborRecords).toEqual(before);
  });

  it("allows records on the end date and keeps a locked account locked without a lock follow-up", async () => {
    const locked = { ...employee, account: { ...employee.account, status: "locked" as const } };
    const repo = repository({ accounts: mockEmployeeAccounts.map((account) => account.id === employee.account.id ? locked.account : account),
      initialEmployees: [locked], laborRecords: [{ employeeId: employee.id, date: end.endDate, kind: "attendance" }] });
    expect(await repo.endEmployment(end)).toMatchObject({ status: "changed", employee: { account: { status: "locked" } }, followUp: undefined });
  });

  it("uses the current account status if it was locked after the employee editor loaded", async () => {
    const repo = repository({ getAccounts: () => mockEmployeeAccounts.map((account) => account.id === employee.account.id
      ? { ...account, status: "locked" } : account) });
    expect(await repo.endEmployment(end)).toMatchObject({ status: "changed", employee: { account: { status: "locked" } }, followUp: undefined });
  });

  it("does not block employment on a cancelled assignment, and keeps its history intact", async () => {
    const laborRecords = [{ employeeId: employee.id, date: "2026-10-29", kind: "assignment" as const, cancelledAt: "2026-10-28T08:00:00Z" }];
    const repo = repository({ laborRecords });
    expect(await repo.endEmployment(end)).toMatchObject({ status: "changed" });
    expect(laborRecords[0].cancelledAt).toBe("2026-10-28T08:00:00Z");
  });

  it("does not create an account or follow-up for an employee without an account", async () => {
    const repo = repository({ initialEmployees: [{ ...employee, account: null }] });
    const ended = await repo.endEmployment(end);
    if (ended.status !== "changed") throw new Error("Expected changed");
    expect(ended.followUp).toBeUndefined(); expect(ended.employee.account).toBeNull();
    const restored = await repo.reinstate({ employeeId: employee.id, recordVersion: ended.employee.recordVersion });
    expect(restored).toMatchObject({ status: "changed", employee: { account: null }, followUp: undefined });
  });

  it("does not allow an ordinary profile save to change employment", async () => {
    const repo = repository();
    expect(await repo.save({ ...employee, id: employee.id, accountId: employee.account.id, status: "left" }))
      .toMatchObject({ status: "invalid-input", field: "status" });
    expect(repo.snapshotEmployees()[0]).toEqual(employee);
  });

  it("requires an opaque version, rejects a stale command and does not repeat an already completed transition", async () => {
    const repo = repository();
    expect(await repo.endEmployment({ ...end, recordVersion: "bad-version" })).toMatchObject({ status: "invalid-input", field: "recordVersion" });
    const ended = await repo.endEmployment(end);
    if (ended.status !== "changed") throw new Error("Expected changed");
    expect(await repo.reinstate({ employeeId: employee.id, recordVersion: employee.recordVersion })).toMatchObject({ status: "conflict", message: { code: "MSG06" } });
    expect(await repo.endEmployment({ ...end, recordVersion: ended.employee.recordVersion })).toMatchObject({ status: "same-status", message: { code: "MSG61" } });
    expect(repo.snapshotEmployees()[0]).toEqual(ended.employee);
  });

  it("allows only one of two competing commands to use the same version", async () => {
    const repo = repository();
    const results = await Promise.all([repo.endEmployment(end), repo.endEmployment(end)]);
    expect(results.map((result) => result.status).sort()).toEqual(["changed", "conflict"]);
  });

  it.each([{ isAuthorized: false, status: "forbidden" }, { isSessionExpired: true, status: "session-expired" }])("gates both operations with $status", async (options) => {
    const repo = repository(options);
    expect(await repo.endEmployment(end)).toMatchObject({ status: options.status });
    expect(await repo.reinstate({ employeeId: employee.id, recordVersion: employee.recordVersion })).toMatchObject({ status: options.status });
    expect(repo.snapshotEmployees()[0]).toEqual(employee);
  });

  it("preserves an existing employment date when the former employee's personal data is saved", async () => {
    const former = { ...employee, status: "left" as const, employmentEndDate: "2026-10-01" };
    const repo = repository({ initialEmployees: [former] });
    expect(await repo.save({ ...former, accountId: employee.account.id, notes: "Ghi chú mới" }))
      .toMatchObject({ status: "saved", employee: { status: "left", employmentEndDate: "2026-10-01", notes: "Ghi chú mới" } });
  });
});
