import type { SaveEmployeeInput, UnlinkEmployeeAccountInput } from "@/features/employee-management/domain/employee-management";
import type { EmployeeManagementRepository } from "@/features/employee-management/repositories/employee-management-repository";
import { employeeBankFields, toEmployeeBankAccount } from "../schemas/employee-bank-schema";
import type { EndEmployeeEmploymentInput, ReinstateEmployeeInput } from "../domain/employee-employment";

export class EmployeeManagementService {
  constructor(private readonly repository: EmployeeManagementRepository) {}

  load() {
    return this.repository.load();
  }

  unlinkAccount(input: UnlinkEmployeeAccountInput) {
    // A version is opaque: do not trim, decode or regenerate it.
    return this.repository.unlinkAccount(input);
  }

  endEmployment(input: EndEmployeeEmploymentInput) {
    return this.repository.endEmployment({ employeeId: input.employeeId, recordVersion: input.recordVersion, endDate: input.endDate });
  }

  reinstate(input: ReinstateEmployeeInput) {
    return this.repository.reinstate({ employeeId: input.employeeId, recordVersion: input.recordVersion });
  }

  save(input: SaveEmployeeInput) {
    return this.repository.save({
      ...input,
      address: input.address.trim(),
      area: input.area.trim(),
      fullName: input.fullName.trim(),
      notes: input.notes.trim(),
      otherInformation: input.otherInformation.trim(),
      phone: input.phone.trim(),
      wardCommune: input.wardCommune.trim(),
      workingZoneIds: [...input.workingZoneIds],
      bankAccount: toEmployeeBankAccount(employeeBankFields(input.bankAccount)),
    });
  }
}
