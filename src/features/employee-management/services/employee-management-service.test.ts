import { describe, expect, it } from "vitest";
import type { EmployeeManagementRepository } from "@/features/employee-management/repositories/employee-management-repository";
import { EmployeeManagementService } from "@/features/employee-management/services/employee-management-service";

describe("EmployeeManagementService", () => {
  it("normalizes surrounding whitespace before saving", async () => {
    let receivedName = "";
    const repository: EmployeeManagementRepository = {
      async load() {
        return {
          status: "loaded",
          workspace: { availableAccounts: [], employees: [] },
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
            wardCommune: input.wardCommune,
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
    });

    expect(receivedName).toBe("Lê Thị Lan");
  });
});
