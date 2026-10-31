import { describe, expect, it } from "vitest";
import { createMockEmployeeManagementRepository } from "./mock-employee-management-repository";
import { mockEmployeeAccounts, mockEmployeeProfiles, mockEmployeeZones } from "../mocks/employee-management-fixtures";
import type { SaveEmployeeInput } from "../domain/employee-management";

const employee = mockEmployeeProfiles[0];
const bank = { bankName: "Ngân hàng kiểm thử", accountNumber: "00123456", accountHolderName: "Nguyễn Văn An" };
const input = (changes: Partial<SaveEmployeeInput> = {}): SaveEmployeeInput => ({
  ...employee, accountId: employee.account.id, ...changes,
});
function repository() {
  return createMockEmployeeManagementRepository({
    accounts: mockEmployeeAccounts, initialEmployees: mockEmployeeProfiles, zones: mockEmployeeZones, latencyMs: 0,
  });
}

describe("employee working details persistence", () => {
  it("stores multiple working zones and a complete bank without changing account access", async () => {
    const repo = repository();
    const saved = await repo.save(input({ workingZoneIds: ["zone-east", "zone-south"], bankAccount: bank }));
    expect(saved.status).toBe("saved");
    if (saved.status !== "saved") throw new Error("Expected saved");
    expect(saved.employee.workingZoneIds).toEqual(["zone-east", "zone-south"]);
    expect(saved.employee.bankAccount).toEqual({ ...bank, accountHolderName: "NGUYỄN VĂN AN" });
    expect(saved.employee.account).toEqual(employee.account);
    const loaded = await repo.load();
    if (loaded.status !== "loaded") throw new Error("Expected loaded");
    expect(loaded.workspace.zones).toEqual(mockEmployeeZones);
    expect(loaded.workspace.employees[0]).toEqual(saved.employee);
  });

  it.each([{ workingZoneIds: ["missing-zone"] }, { workingZoneIds: ["zone-west"] }, { workingZoneIds: ["zone-east", "zone-east"] }])("rejects invalid zone selection $workingZoneIds without advancing the version", async ({ workingZoneIds }) => {
    const repo = repository();
    expect(await repo.save(input({ workingZoneIds }))).toEqual({ status: "invalid-fields", code: "MSG01", fields: ["workingZoneIds"] });
    expect(repo.snapshotEmployees()[0]).toEqual(employee);
  });

  it("rejects a partial bank and keeps stored data intact", async () => {
    const repo = repository();
    expect(await repo.save(input({ bankAccount: { ...bank, accountNumber: "" } })))
      .toEqual({ status: "invalid-fields", code: "MSG01", fields: ["bankAccount"] });
    expect(repo.snapshotEmployees()[0]).toEqual(employee);
  });

  it("does not drop an identity error when bank validation fails at the same time", async () => {
    const repo = repository();
    expect(await repo.save(input({ fullName: " ", bankAccount: { ...bank, accountNumber: "" } })))
      .toEqual({ status: "invalid-fields", code: "MSG01", fields: ["fullName", "bankAccount"] });
    expect(repo.snapshotEmployees()[0]).toEqual(employee);
  });

  it("allows clearing the optional bank and working zones explicitly", async () => {
    const repo = repository();
    const first = await repo.save(input({ bankAccount: bank }));
    if (first.status !== "saved") throw new Error("Expected saved");
    const cleared = await repo.save(input({ recordVersion: first.employee.recordVersion, bankAccount: null, workingZoneIds: [] }));
    expect(cleared).toMatchObject({ status: "saved", employee: { bankAccount: null, workingZoneIds: [] } });
  });

  it("clones arrays, bank and catalog on both save and read", async () => {
    const repo = repository();
    const draft = input({ workingZoneIds: ["zone-east"], bankAccount: { ...bank } });
    const saved = await repo.save(draft);
    if (saved.status !== "saved") throw new Error("Expected saved");
    Object.assign(draft.bankAccount!, { accountNumber: "111111" });
    Object.assign(saved.employee.bankAccount!, { accountNumber: "222222" });
    (saved.employee.workingZoneIds as string[]).push("zone-west");
    const loaded = await repo.load();
    if (loaded.status !== "loaded") throw new Error("Expected loaded");
    Object.assign(loaded.workspace.zones[0], { label: "Changed outside" });
    expect(repo.snapshotEmployees()[0].bankAccount?.accountNumber).toBe("00123456");
    expect(repo.snapshotEmployees()[0].workingZoneIds).toEqual(["zone-east"]);
    const again = await repo.load();
    if (again.status !== "loaded") throw new Error("Expected loaded");
    expect(again.workspace.zones[0].label).toBe("Khu Đông");
  });
});
