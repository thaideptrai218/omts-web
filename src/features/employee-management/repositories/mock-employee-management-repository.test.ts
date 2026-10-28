import { beforeEach, describe, expect, it } from "vitest";
import type {
  EmployeeAccountSummary,
  EmployeeProfile,
  SaveEmployeeInput,
} from "@/features/employee-management/domain/employee-management";
import { createMockEmployeeManagementRepository } from "@/features/employee-management/repositories/mock-employee-management-repository";

const accounts = [
  {
    displayName: "Nguyễn Văn An",
    id: "account-an",
    phone: "0901000001",
    status: "active",
    username: "nguyen.an",
  },
  {
    displayName: "Lê Thị Lan",
    id: "account-lan",
    phone: "0901000002",
    status: "active",
    username: "le.lan",
  },
] as const satisfies readonly EmployeeAccountSummary[];

const initialEmployee = {
  account: accounts[0],
  address: "",
  area: "",
  birthday: "",
  fullName: "Nguyễn Văn An",
  id: "employee-an",
  notes: "",
  otherInformation: "",
  phone: "0901000001",
  recordVersion: "AAAAAAAA+/8=",
  status: "employed",
  wardCommune: "",
  workingZoneIds: [],
  bankAccount: null,
} as const satisfies EmployeeProfile;

function input(overrides: Partial<SaveEmployeeInput> = {}): SaveEmployeeInput {
  return {
    accountId: null,
    address: "",
    area: "",
    birthday: "",
    fullName: "Trần Quốc Bình",
    id: null,
    notes: "",
    otherInformation: "",
    phone: "0909000009",
    recordVersion: null,
    status: "employed",
    wardCommune: "",
    workingZoneIds: [],
    bankAccount: null,
    ...overrides,
  };
}

describe("mock employee management repository", () => {
  let repository: ReturnType<typeof createMockEmployeeManagementRepository>;

  beforeEach(() => {
    repository = createMockEmployeeManagementRepository({
      accounts,
      initialEmployees: [initialEmployee],
      latencyMs: 0,
    });
  });

  it("offers only accounts not linked to another employee", async () => {
    const result = await repository.load();

    expect(result.status).toBe("loaded");
    if (result.status === "loaded") {
      expect(result.workspace.availableAccounts.map((account) => account.id)).toEqual([
        "account-lan",
      ]);
    }
  });

  it("creates an employee without a login account in Employed status", async () => {
    const result = await repository.save(input());

    expect(result.status).toBe("saved");
    if (result.status === "saved") {
      expect(result.employee.account).toBeNull();
      expect(result.employee.status).toBe("employed");
    }
  });

  it("returns the existing profile for duplicate full name and phone", async () => {
    const result = await repository.save(
      input({ fullName: "nguyễn văn an", phone: initialEmployee.phone }),
    );

    expect(result).toMatchObject({
      existingEmployeeId: "employee-an",
      status: "duplicate",
    });
  });

  it("blocks an account linked after the picker data was loaded", async () => {
    const result = await repository.save(input({ accountId: "account-an" }));

    expect(result).toMatchObject({
      existingEmployeeId: "employee-an",
      status: "account-already-linked",
    });
  });

  it("prompts account review without changing the account when an employee leaves", async () => {
    const result = await repository.save(
      input({
        accountId: "account-an",
        fullName: initialEmployee.fullName,
        id: initialEmployee.id,
        phone: initialEmployee.phone,
        recordVersion: initialEmployee.recordVersion,
        status: "left",
      }),
    );

    expect(result.status).toBe("saved");
    if (result.status === "saved") {
      expect(result.followUp?.action).toBe("review-lock");
      expect(result.followUp?.account.status).toBe("active");
    }
  });

  it("prompts permission review when a former employee returns", async () => {
    const leftEmployee = { ...initialEmployee, status: "left" } as const;
    repository = createMockEmployeeManagementRepository({
      accounts,
      initialEmployees: [leftEmployee],
      latencyMs: 0,
    });

    const result = await repository.save(
      input({
        accountId: "account-an",
        fullName: leftEmployee.fullName,
        id: leftEmployee.id,
        phone: leftEmployee.phone,
        recordVersion: leftEmployee.recordVersion,
        status: "employed",
      }),
    );

    expect(result.status).toBe("saved");
    if (result.status === "saved") {
      expect(result.followUp?.action).toBe("review-access");
    }
  });

  function edit(overrides: Partial<SaveEmployeeInput> = {}) {
    return input({ ...initialEmployee, accountId: null, ...overrides });
  }

  async function loadedWorkspace() {
    const result = await repository.load();
    if (result.status !== "loaded") throw new Error("Expected workspace");
    return result.workspace;
  }

  it("keeps the account on PUT-null and replaces it only with an explicit ID", async () => {
    const saved = await repository.save(edit({ notes: "Ghi chú mới" }));
    expect(saved).toMatchObject({ status: "saved", employee: { account: accounts[0] } });
    if (saved.status !== "saved") throw new Error("Expected saved");
    const relinked = await repository.save(edit({
      accountId: accounts[1].id, recordVersion: saved.employee.recordVersion,
    }));
    expect(relinked).toMatchObject({ status: "saved", employee: { account: accounts[1] } });
    expect((await loadedWorkspace()).availableAccounts).toEqual([accounts[0]]);
  });

  it("unlinks without changing profile or account status, and releases the account", async () => {
    const result = await repository.unlinkAccount({
      employeeId: initialEmployee.id, recordVersion: initialEmployee.recordVersion,
    });
    expect(result.status).toBe("unlinked");
    if (result.status !== "unlinked") throw new Error("Expected unlinked");
    expect(result.employee).toEqual({
      ...initialEmployee, account: null, recordVersion: result.employee.recordVersion,
    });
    expect(result.employee.recordVersion).not.toBe(initialEmployee.recordVersion);
    expect((await loadedWorkspace()).availableAccounts).toEqual(accounts);
    expect(accounts[0].status).toBe("active");

    const saved = await repository.save(edit({
      notes: "Bản nháp được lưu sau unlink", recordVersion: result.employee.recordVersion,
    }));
    expect(saved).toMatchObject({ status: "saved", employee: { account: null } });
    expect(await repository.save(input({ accountId: accounts[0].id })))
      .toMatchObject({ status: "saved", employee: { account: accounts[0] } });
  });

  it("a repeated unlink is a no-op even with an older well-formed version", async () => {
    const request = { employeeId: initialEmployee.id, recordVersion: initialEmployee.recordVersion };
    const first = await repository.unlinkAccount(request);
    expect(await repository.unlinkAccount(request)).toEqual(first);
  });

  it.each(["", "bad-version", "AAAA+"])("rejects malformed version %j even without a link", async (recordVersion) => {
    await repository.unlinkAccount({ employeeId: initialEmployee.id, recordVersion: initialEmployee.recordVersion });
    const before = await loadedWorkspace();
    expect(await repository.unlinkAccount({ employeeId: initialEmployee.id, recordVersion }))
      .toMatchObject({ status: "invalid-version", message: { code: "MSG01" } });
    expect(await loadedWorkspace()).toEqual(before);
  });

  it("rejects stale unlink and stale save without overwriting a newer account link", async () => {
    await repository.save(edit({ accountId: accounts[1].id }));
    const before = await loadedWorkspace();
    const staleUnlink = await repository.unlinkAccount({
      employeeId: initialEmployee.id, recordVersion: initialEmployee.recordVersion,
    });
    expect(staleUnlink).toMatchObject({ status: "conflict", message: { code: "MSG06" } });
    if (staleUnlink.status === "conflict") {
      expect(staleUnlink.message.params.user_name).toBe("Lê Minh Hải");
      expect(staleUnlink.message.params.time).not.toBe("");
    }
    expect(await repository.save(edit())).toMatchObject({ status: "conflict" });
    expect(await loadedWorkspace()).toEqual(before);
  });

  it("serializes concurrent saves and unlink through the expected version", async () => {
    const results = await Promise.all([
      repository.save(edit({ accountId: accounts[1].id })),
      repository.unlinkAccount({ employeeId: initialEmployee.id, recordVersion: initialEmployee.recordVersion }),
    ]);
    expect(results.map((result) => result.status)).toEqual(["saved", "conflict"]);
    expect((await loadedWorkspace()).employees[0].account).toEqual(accounts[1]);
  });

  it("never reuses an initial version after that version leaves the current workspace", async () => {
    const seededVersion = btoa("mock-employee-5");
    repository = createMockEmployeeManagementRepository({
      accounts, initialEmployees: [{ ...initialEmployee, recordVersion: seededVersion }], latencyMs: 0,
    });
    let version = seededVersion;
    for (let index = 0; index < 4; index++) {
      const result = await repository.save(edit({ recordVersion: version, notes: `Revision ${index}` }));
      if (result.status !== "saved") throw new Error("Expected saved");
      version = result.employee.recordVersion;
      expect(version).not.toBe(seededVersion);
    }
    expect(await repository.unlinkAccount({ employeeId: initialEmployee.id, recordVersion: seededVersion }))
      .toMatchObject({ status: "conflict" });
  });

  it("returns not-found without changing data", async () => {
    const before = await loadedWorkspace();
    expect(await repository.unlinkAccount({ employeeId: "missing", recordVersion: initialEmployee.recordVersion }))
      .toEqual({ status: "not-found" });
    expect(await loadedWorkspace()).toEqual(before);
  });

  it.each([
    [{ isAuthorized: false }, "forbidden", "MSG02"],
    [{ isSessionExpired: true }, "session-expired", "MSG19"],
  ] as const)("guards unlink with %j", async (options, status, code) => {
    const guarded = createMockEmployeeManagementRepository({
      accounts, initialEmployees: [initialEmployee], latencyMs: 0, ...options,
    });
    expect(await guarded.unlinkAccount({ employeeId: initialEmployee.id, recordVersion: initialEmployee.recordVersion }))
      .toEqual({ status, message: { code } });
  });

  it("does not leak mutable employee references from unlink", async () => {
    const result = await repository.unlinkAccount({ employeeId: initialEmployee.id, recordVersion: initialEmployee.recordVersion });
    if (result.status !== "unlinked") throw new Error("Expected unlinked");
    Object.assign(result.employee, { notes: "Tampered" });
    expect((await loadedWorkspace()).employees[0].notes).toBe("");
  });
});
