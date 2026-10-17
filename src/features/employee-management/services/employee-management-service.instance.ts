import {
  mockEmployeeAccounts,
  mockEmployeeProfiles,
} from "@/features/employee-management/mocks/employee-management-fixtures";
import { createMockEmployeeManagementRepository } from "@/features/employee-management/repositories/mock-employee-management-repository";
import { EmployeeManagementService } from "@/features/employee-management/services/employee-management-service";

export const employeeManagementService = new EmployeeManagementService(
  createMockEmployeeManagementRepository({
    accounts: mockEmployeeAccounts,
    initialEmployees: mockEmployeeProfiles,
  }),
);
