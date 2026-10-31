import { mockManagementEnvironment } from "@/shared/mocks/mock-management-environment.instance";
import { EmployeeManagementService } from "@/features/employee-management/services/employee-management-service";

export const employeeManagementService = new EmployeeManagementService(
  mockManagementEnvironment.employees,
);
