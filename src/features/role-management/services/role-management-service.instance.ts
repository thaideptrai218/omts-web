import { mockManagementEnvironment } from "@/shared/mocks/mock-management-environment.instance";
import { RoleManagementService } from "@/features/role-management/services/role-management-service";

export const roleManagementService = new RoleManagementService(mockManagementEnvironment.roles);
