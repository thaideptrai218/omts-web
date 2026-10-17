import { mockFeatureCatalog, mockRoles } from "@/features/role-management/mocks/role-management-fixtures";
import { createMockRoleManagementRepository } from "@/features/role-management/repositories/mock-role-management-repository";
import { RoleManagementService } from "@/features/role-management/services/role-management-service";

const repository = createMockRoleManagementRepository({
  catalog: mockFeatureCatalog,
  initialRoles: mockRoles,
});

export const roleManagementService = new RoleManagementService(repository);
