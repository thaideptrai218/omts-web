import { describe, expect, it, vi } from "vitest";
import type { EmployeeManagementRepository } from "@/features/employee-management/repositories/employee-management-repository";
import { EmployeeManagementService } from "@/features/employee-management/services/employee-management-service";
import { createMockEmployeeManagementRepository } from "@/features/employee-management/repositories/mock-employee-management-repository";

describe("EmployeeManagementService", () => {
  it.each(["endEmployment", "reinstate"] as const)("forwards only the explicit %s command and its opaque version", async (action) => {
    const repository = createMockEmployeeManagementRepository({ accounts: [], initialEmployees: [], latencyMs: 0 });
    const method = vi.spyOn(repository, action);
    const command = { employeeId: "employee-id", recordVersion: "AAAAAAAA+/8=", ...(action === "endEmployment" ? { endDate: "2026-10-01" } : {}) };
    const input = { ...command, fullName: "Không gửi thông tin hồ sơ" };
    const service = new EmployeeManagementService(repository);
    if (action === "endEmployment") await service.endEmployment({ ...input, endDate: "2026-10-01" });
    else await service.reinstate(input);
    expect(method).toHaveBeenCalledExactlyOnceWith(command);
  });
  it("forwards the opaque unlink version without trimming, decoding or replacing it", async () => {
    const repository = createMockEmployeeManagementRepository({ accounts: [], initialEmployees: [], latencyMs: 0 });
    const unlink = vi.spyOn(repository, "unlinkAccount");
    const input = { employeeId: "employee-id", recordVersion: "AAAAAAAA+/8=" };
    await new EmployeeManagementService(repository).unlinkAccount(input);
    expect(unlink).toHaveBeenCalledExactlyOnceWith(input);
    expect(unlink.mock.calls[0][0]).toBe(input);
  });
  it("normalizes surrounding whitespace before saving", async () => {
    let receivedName = "";
    const repository: EmployeeManagementRepository = {
      async endEmployment() { return { status: "not-found" }; },
      async reinstate() { return { status: "not-found" }; },
      async unlinkAccount() {
        return { status: "not-found" };
      },
      async load() {
        return {
          status: "loaded",
          workspace: { availableAccounts: [], employees: [], zones: [] },
        };
      },
      async save(input) {
        receivedName = input.fullName;
        return {
          employee: {
            account: null,
            address: input.address,
            area: input.area,
            birthday: input.birthday,
            fullName: input.fullName,
            id: "employee-new",
            notes: input.notes,
            otherInformation: input.otherInformation,
            phone: input.phone,
            recordVersion: "employee-v1",
            status: input.status,
            employmentEndDate: null,
            wardCommune: input.wardCommune,
            workingZoneIds: input.workingZoneIds,
            bankAccount: input.bankAccount,
          },
          message: { code: "MSG10" },
          status: "saved",
        };
      },
    };
    const service = new EmployeeManagementService(repository);

    await service.save({
      accountId: null,
      address: " ",
      area: " ",
      birthday: "",
      fullName: "  Lê Thị Lan  ",
      id: null,
      notes: " ",
      otherInformation: " ",
      phone: " 0914555666 ",
      recordVersion: null,
      status: "employed",
      wardCommune: " ",
      workingZoneIds: [],
      bankAccount: null,
    });

    expect(receivedName).toBe("Lê Thị Lan");
  });
});
