import { describe, expect, it } from "vitest";
import type { SaveEmployeeInput } from "../domain/employee-management";
import { mockEmployeeAccounts, mockEmployeeProfiles, mockEmployeeZones } from "../mocks/employee-management-fixtures";
import { createMockEmployeeManagementRepository } from "./mock-employee-management-repository";

const employee = mockEmployeeProfiles[0];
function repository(now = () => new Date("2026-10-28T10:00:00Z")) {
  return createMockEmployeeManagementRepository({ accounts: mockEmployeeAccounts, initialEmployees: mockEmployeeProfiles,
    zones: mockEmployeeZones, now, latencyMs: 0 });
}
function input(overrides: Partial<SaveEmployeeInput> = {}): SaveEmployeeInput {
  return { ...employee, id: employee.id, accountId: employee.account.id, ...overrides };
}

describe("personal validation at the employee mock boundary", () => {
  it.each([
    ["birthday", "2026-10-29"], ["birthday", "2026-02-30"], ["address", "a".repeat(501)],
    ["area", "a".repeat(101)], ["wardCommune", "a".repeat(101)],
    ["otherInformation", "a".repeat(1001)], ["notes", "a".repeat(1001)],
  ] as const)("reports invalid %s on its own field without writing", async (field, value) => {
    const repo = repository();
    expect(await repo.save(input({ [field]: value }))).toEqual({ status: "invalid-fields", code: "MSG01", fields: [field] });
    expect(repo.snapshotEmployees()[0]).toEqual(employee);
  });
  it("keeps all relevant targets when several fields fail", async () => {
    const repo = repository();
    const result = await repo.save(input({ phone: "abc", birthday: "2026-10-29", notes: "a".repeat(1001) }));
    expect(result).toMatchObject({ status: "invalid-fields", code: "MSG01", fields: ["phone", "birthday", "notes"] });
    expect(repo.snapshotEmployees()[0]).toEqual(employee);
  });
  it.each([{ phone: "abc" }, { fullName: "a".repeat(101) }])("rejects invalid identity %o without changing version/account", async (overrides) => {
    const repo = repository();
    expect(await repo.save(input(overrides))).toMatchObject({ status: "invalid-input", message: { code: "MSG01" } });
    expect(repo.snapshotEmployees()[0]).toEqual(employee);
  });
  it("normalizes phone for a new employee and returns it on reload", async () => {
    const repo = repository();
    const result = await repo.save(input({ id: null, recordVersion: null, accountId: null,
      fullName: "Võ Văn Hùng", phone: "+84 938 111 222", birthday: "", notes: "  Nhân viên mới  " }));
    expect(result).toMatchObject({ status: "saved", employee: { phone: "0938111222", birthday: "", notes: "Nhân viên mới", account: null } });
    const loaded = await repo.load();
    if (loaded.status !== "loaded") throw new Error("Expected workspace");
    expect(loaded.workspace.employees.find((item) => item.fullName === "Võ Văn Hùng")?.phone).toBe("0938111222");
  });
  it.each(["+84 901 234 567", "84.901.234.567", "(090)-123-4567"])("detects the existing person for phone alias %s", async (phone) => {
    const repo = repository();
    expect(await repo.save(input({ id: null, recordVersion: null, accountId: null, phone })))
      .toMatchObject({ status: "duplicate", existingEmployeeId: employee.id });
    expect(repo.snapshotEmployees()).toHaveLength(mockEmployeeProfiles.length);
  });
  it("allows the same employee to save a phone alias without a duplicate or account mutation", async () => {
    const repo = repository();
    const result = await repo.save(input({ phone: "+84 901 234 567", notes: "Đã kiểm tra" }));
    expect(result).toMatchObject({ status: "saved", employee: { phone: employee.phone, account: employee.account, notes: "Đã kiểm tra" } });
    if (result.status === "saved") expect(result.employee.recordVersion).not.toBe(employee.recordVersion);
  });
  it("uses the injected business clock rather than the host date", async () => {
    let instant = new Date("2026-10-28T16:59:59Z");
    const repo = repository(() => instant);
    expect(await repo.save(input({ birthday: "2026-10-29" }))).toMatchObject({ status: "invalid-fields", fields: ["birthday"] });
    instant = new Date("2026-10-28T17:00:00Z");
    expect(await repo.save(input({ birthday: "2026-10-29" }))).toMatchObject({ status: "saved", employee: { birthday: "2026-10-29" } });
  });
});
