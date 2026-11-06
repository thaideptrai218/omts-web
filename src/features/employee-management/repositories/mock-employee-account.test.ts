import { describe, expect, it } from "vitest";
import { createMockManagementEnvironment } from "@/shared/mocks/mock-management-environment";
import { mockEmployeeProfiles, mockEmployeeAccounts, mockEmployeeZones } from "../mocks/employee-management-fixtures";
import { createMockEmployeeManagementRepository } from "./mock-employee-management-repository";
import type { CreateEmployeeAccountInput } from "../domain/employee-account-creation";

const employee = mockEmployeeProfiles[1];
function input(overrides: Partial<CreateEmployeeAccountInput> = {}): CreateEmployeeAccountInput {
  return { employeeId: employee.id, recordVersion: employee.recordVersion, account: {
    fullName: employee.fullName, phone: employee.phone, email: "", deliveryChannel: "phone",
    newGrants: [{ key: "grant-draft", zoneId: "zone-south", roleId: "role-staff", effectiveFrom: "2026-10-28", effectiveTo: "" }],
  }, ...overrides };
}

describe("create and link an account for a saved employee", () => {
  it("creates one internal account, links it with a new employee version, and returns no secret", async () => {
    const env = createMockManagementEnvironment(0);
    const before = env.accounts.snapshotAccounts().length;
    const result = await env.employees.createLoginAccount(input());
    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(result.employee).toEqual({ ...employee, account: result.employee.account, recordVersion: result.employee.recordVersion });
    expect(result.employee.recordVersion).not.toBe(employee.recordVersion);
    const account = env.accounts.snapshotAccounts().find((item) => item.id === result.employee.account?.id)!;
    expect(account).toMatchObject({ accountType: "internal", phoneVerified: false, emailVerified: false, status: "active" });
    expect(account.grants).toHaveLength(1);
    expect(account.grants[0]).toMatchObject({ roleId: "role-staff", zoneId: "zone-south" });
    expect(account.username).toMatch(/^le\.thi\.lan\.\d+$/);
    expect(result.delivery?.username).toBe(account.username);
    expect(JSON.stringify(result)).not.toMatch(/password|accessToken|refreshToken|otp/i);
    expect(env.accounts.snapshotAccounts()).toHaveLength(before + 1);
    const loaded = await env.employees.load();
    if (loaded.status !== "loaded") throw new Error("Expected loaded");
    expect(loaded.workspace.availableAccounts.some((item) => item.id === account.id)).toBe(false);
  });
  it("allows only one competing create/link using the same employee version", async () => {
    const env = createMockManagementEnvironment(0);
    const before = env.accounts.snapshotAccounts().length;
    const result = await Promise.all([env.employees.createLoginAccount(input()), env.employees.createLoginAccount(input())]);
    expect(result.map((item) => item.status).sort()).toEqual(["conflict", "created"]);
    expect(env.accounts.snapshotAccounts()).toHaveLength(before + 1);
  });
  it.each([
    { roleId: "role-missing", zoneId: "zone-south" },
    { roleId: "role-staff", zoneId: "zone-west" },
  ])("rejects invalid scope %o without writing either record", async (scope) => {
    const env = createMockManagementEnvironment(0); const before = env.accounts.snapshotAccounts(); const draft = input();
    const result = await env.employees.createLoginAccount({ ...draft, account: { ...draft.account, newGrants: [{ ...draft.account.newGrants[0], ...scope }] } });
    expect(result).toMatchObject({ status: "invalid-input", field: "grants" });
    expect(env.accounts.snapshotAccounts()).toEqual(before); expect(env.employees.snapshotEmployees()[1]).toEqual(employee);
  });
  it("does not link an existing duplicate account or silently create a second one", async () => {
    const env = createMockManagementEnvironment(0); const before = env.accounts.snapshotAccounts(); const draft = input();
    expect(await env.employees.createLoginAccount({ ...draft, account: { ...draft.account, phone: "0901234567" } }))
      .toMatchObject({ status: "duplicate", field: "phone" });
    expect(env.accounts.snapshotAccounts()).toEqual(before); expect(env.employees.snapshotEmployees()[1].account).toBeNull();
  });
  it.each([
    { effectiveFrom: "" }, { effectiveFrom: "2026-02-30" }, { effectiveTo: "not-a-date" }, { effectiveTo: "2026-10-27" },
  ])("rejects invalid grant dates %o before publishing account/link", async (dates) => {
    const env = createMockManagementEnvironment(0); const before = env.accounts.snapshotAccounts(); const draft = input();
    expect(await env.employees.createLoginAccount({ ...draft, account: { ...draft.account, newGrants: [{ ...draft.account.newGrants[0], ...dates }] } }))
      .toMatchObject({ status: "invalid-input", field: "grants" });
    expect(env.accounts.snapshotAccounts()).toEqual(before); expect(env.employees.snapshotEmployees()[1].account).toBeNull();
  });
  it("rechecks employee version after the account repository's asynchronous preparation", async () => {
    const env = createMockManagementEnvironment(0); const before = env.accounts.snapshotAccounts();
    const repo = createMockEmployeeManagementRepository({ accounts: mockEmployeeAccounts, initialEmployees: mockEmployeeProfiles, zones: mockEmployeeZones, latencyMs: 0,
      createAccount: async (draft, link) => {
        await repo.save({ ...employee, id: employee.id, accountId: null, notes: "Sửa từ màn khác" });
        return env.accounts.createLinkedAccount(draft, link);
      } });
    expect(await repo.createLoginAccount(input())).toMatchObject({ status: "conflict" });
    expect(env.accounts.snapshotAccounts()).toEqual(before); expect(repo.snapshotEmployees()[1].account).toBeNull();
  });
  it.each([
    { isAuthorized: false, status: "forbidden" }, { isSessionExpired: true, status: "session-expired" },
  ])("checks $status before creating an account", async (options) => {
    const createAccount = () => { throw new Error("Must not create"); };
    const repo = createMockEmployeeManagementRepository({ accounts: [], initialEmployees: mockEmployeeProfiles, latencyMs: 0, createAccount, ...options });
    expect(await repo.createLoginAccount(input())).toMatchObject({ status: options.status });
  });
  it("rejects missing version, missing employee and an already linked profile", async () => {
    const env = createMockManagementEnvironment(0); const before = env.accounts.snapshotAccounts();
    expect(await env.employees.createLoginAccount(input({ recordVersion: "" }))).toMatchObject({ status: "invalid-version" });
    expect(await env.employees.createLoginAccount(input({ employeeId: "missing" }))).toMatchObject({ status: "not-found" });
    expect(await env.employees.createLoginAccount(input({ employeeId: mockEmployeeProfiles[0].id, recordVersion: mockEmployeeProfiles[0].recordVersion })))
      .toMatchObject({ status: "already-linked" });
    expect(env.accounts.snapshotAccounts()).toEqual(before);
  });
});
