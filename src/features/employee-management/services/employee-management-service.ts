import type { SaveEmployeeInput } from "@/features/employee-management/domain/employee-management";
import type { EmployeeManagementRepository } from "@/features/employee-management/repositories/employee-management-repository";

export class EmployeeManagementService {
  constructor(private readonly repository: EmployeeManagementRepository) {}

  load() {
    return this.repository.load();
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
    });
  }
}
