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
  recordVersion: "employee-v1",
  status: "employed",
  wardCommune: "",
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
});
